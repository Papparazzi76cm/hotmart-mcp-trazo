import 'dotenv/config';
import express from 'express';
import {z} from 'zod';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {requireAuth,requireScope} from './auth.js';
import {addConnection,listConnections,pool} from './db.js';
import {createMcpServer} from './mcp.js';
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
const publicUrl=process.env.PUBLIC_URL?.replace(/\/$/,'');
if(!publicUrl||!publicUrl.startsWith('https://'))throw new Error('PUBLIC_URL must be an HTTPS URL');
app.get('/health',(_req,res)=>res.json({status:'ok',service:'hotmart-mcp-by-trazo-digital'}));
app.get('/.well-known/oauth-protected-resource',(_req,res)=>res.json({resource:`${publicUrl}/mcp`,authorization_servers:[process.env.AUTH_ISSUER],scopes_supported:['hotmart:read','hotmart:manage']}));
app.get('/api/connections',requireAuth,requireScope('hotmart:read'),async(req,res)=>{
 try{res.json(await listConnections(req.principal!.sub));}catch{res.status(500).json({error:'internal_error'});}
});
const connectionSchema=z.object({tenantId:z.string().uuid(),label:z.string().min(1).max(120),clientId:z.string().min(1),clientSecret:z.string().min(1),basic:z.string().min(1)});
app.post('/api/connections',requireAuth,requireScope('hotmart:manage'),async(req,res)=>{
 const parsed=connectionSchema.safeParse(req.body);
 if(!parsed.success){res.status(400).json({error:'invalid_payload'});return;}
 try{res.status(201).json(await addConnection(req.principal!.sub,parsed.data));}
 catch{res.status(403).json({error:'not_authorized_or_conflict'});}
});
app.post('/mcp',requireAuth,requireScope('hotmart:read'),async(req,res)=>{
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
