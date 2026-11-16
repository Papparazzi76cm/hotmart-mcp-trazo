import 'dotenv/config';
import express from 'express';
import {z} from 'zod';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {requireAuth} from './auth.js';
import {addConnection,listConnections,createTenant,addMembership,pool} from './db.js';
import {createMcpServer} from './mcp.js';
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
const publicUrl=process.env.PUBLIC_URL?.replace(/\/$/,'');
const oauthIssuer=process.env.AUTH_ISSUER;
if(!publicUrl||!publicUrl.startsWith('https://'))throw new Error('PUBLIC_URL must be HTTPS');
if(!oauthIssuer)throw new Error('AUTH_ISSUER required');
app.get('/health',(_req,res)=>res.json({status:'ok',service:'hotmart-mcp-by-trazo-digital'}));
app.get('/.well-known/oauth-protected-resource',(_req,res)=>res.json({
 resource:`${publicUrl}/mcp`,authorization_servers:[oauthIssuer],scopes_supported:['openid','email']
}));
app.get('/api/connections',requireAuth,async(req,res)=>{
 try{res.json(await listConnections(req.principal!.sub));}catch{res.status(500).json({error:'internal_error'});}
});
const newTenantSchema=z.object({name:z.string().trim().min(2).max(120)});
app.post('/api/tenants',requireAuth,async(req,res)=>{
 const input=newTenantSchema.safeParse(req.body);
 if(!input.success){res.status(400).json({error:'invalid_payload'});return;}
 try{res.status(201).json(await createTenant(req.principal!.sub,input.data.name));}
 catch{res.status(500).json({error:'internal_error'});}
});
const memberSchema=z.object({subject:z.string().uuid(),role:z.enum(['admin','viewer'])});
app.post('/api/tenants/:tenantId/members',requireAuth,async(req,res)=>{
 const input=memberSchema.safeParse(req.body);
 const tenantId=z.string().uuid().safeParse(req.params.tenantId);
 if(!input.success||!tenantId.success){res.status(400).json({error:'invalid_payload'});return;}
 try{
  const result=await addMembership(req.principal!.sub,tenantId.data,input.data);
  if(!result){res.status(403).json({error:'not_authorized'});return;}
  res.status(201).json(result);
 }catch{res.status(500).json({error:'internal_error'});}
});
const connectionSchema=z.object({tenantId:z.string().uuid(),label:z.string().trim().min(1).max(120),clientId:z.string().min(1),clientSecret:z.string().min(1),basic:z.string().min(1)});
app.post('/api/connections',requireAuth,async(req,res)=>{
 const parsed=connectionSchema.safeParse(req.body);
 if(!parsed.success){res.status(400).json({error:'invalid_payload'});return;}
 try{res.status(201).json(await addConnection(req.principal!.sub,parsed.data));}
 catch{res.status(403).json({error:'not_authorized_or_conflict'});}
});
app.post('/mcp',requireAuth,async(req,res)=>{
 const server=createMcpServer(req.principal!.sub);
 const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
 res.on('close',()=>{void transport.close();void server.close();});
 try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}
 catch{if(!res.headersSent)res.status(500).json({jsonrpc:'2.0',error:{code:-32603,message:'Internal server error'},id:null});}
});
app.get('/mcp',(_req,res)=>res.status(405).set('Allow','POST').end());
app.delete('/mcp',(_req,res)=>res.status(405).set('Allow','POST').end());
const port=Number(process.env.PORT??3000);
const httpServer=app.listen(port,()=>console.log(`Hotmart MCP listening on ${port}`));
process.on('SIGTERM',()=>{httpServer.close();void pool.end();});
