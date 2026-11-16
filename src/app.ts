import express from 'express';
import {z} from 'zod';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {requireAuth,authConfig} from './auth.js';
import {addConnection,listConnections,createTenant,addMembership} from './db.js';
import {createMcpServer} from './mcp.js';

export const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});

const expectedUrl=(process.env.PUBLIC_URL??'').replace(/\/$/,'');
const authIssuer=process.env.AUTH_ISSUER??'';
const required=['PUBLIC_URL','AUTH_ISSUER','AUTH_ALLOWED_CLIENT_IDS','DATABASE_URL','ENCRYPTION_KEY_BASE64'] as const;
export function missingConfig(env:NodeJS.ProcessEnv=process.env){
 return required.filter(v=>!env[v]||env[v]?.startsWith('REPLACE_'));
}
function ensureConfigured(_req:express.Request,res:express.Response,next:express.NextFunction){
 if(missingConfig().length){res.status(503).json({error:'service_not_configured'});return;}
 try{authConfig();next();}catch{res.status(503).json({error:'service_not_configured'});}
}
app.get('/health',(_req,res)=>res.json({status:'ok',service:'hotmart-mcp-by-trazo-digital',ready:missingConfig().length===0}));
app.get('/.well-known/oauth-protected-resource',(_req,res)=>{
 if(!expectedUrl.startsWith('https://')||!authIssuer.startsWith('https://')){res.status(503).json({error:'service_not_configured'});return;}
 res.json({resource:`${expectedUrl}/mcp`,authorization_servers:[authIssuer],scopes_supported:['openid','email']});
});
app.get('/.well-known/oauth-protected-resource/mcp',(_req,res)=>{
 if(!expectedUrl.startsWith('https://')||!authIssuer.startsWith('https://')){res.status(503).json({error:'service_not_configured'});return;}
 res.json({resource:`${expectedUrl}/mcp`,authorization_servers:[authIssuer],scopes_supported:['openid','email']});
});
const authorized=[ensureConfigured,requireAuth] as const;
app.get('/api/connections',...authorized,async(req,res)=>{
 try{res.json(await listConnections(req.principal!.sub));}catch{res.status(500).json({error:'internal_error'});}
});
const newTenantSchema=z.object({name:z.string().trim().min(2).max(120)});
app.post('/api/tenants',...authorized,async(req,res)=>{
 const input=newTenantSchema.safeParse(req.body);
 if(!input.success){res.status(400).json({error:'invalid_payload'});return;}
 try{res.status(201).json(await createTenant(req.principal!.sub,input.data.name));}catch{res.status(500).json({error:'internal_error'});}
});
const memberSchema=z.object({subject:z.string().uuid(),role:z.enum(['admin','viewer'])});
app.post('/api/tenants/:tenantId/members',...authorized,async(req,res)=>{
 const input=memberSchema.safeParse(req.body),tenantId=z.string().uuid().safeParse(req.params.tenantId);
 if(!input.success||!tenantId.success){res.status(400).json({error:'invalid_payload'});return;}
 try{const result=await addMembership(req.principal!.sub,tenantId.data,input.data);
  if(!result){res.status(403).json({error:'not_authorized'});return;}res.status(201).json(result);
 }catch{res.status(500).json({error:'internal_error'});}
});
const connectionSchema=z.object({tenantId:z.string().uuid(),label:z.string().trim().min(1).max(120),clientId:z.string().min(1),clientSecret:z.string().min(1),basic:z.string().min(1)});
app.post('/api/connections',...authorized,async(req,res)=>{
 const parsed=connectionSchema.safeParse(req.body);
 if(!parsed.success){res.status(400).json({error:'invalid_payload'});return;}
 try{res.status(201).json(await addConnection(req.principal!.sub,parsed.data));}
 catch{res.status(403).json({error:'not_authorized_or_conflict'});}
});
app.post('/mcp',...authorized,async(req,res)=>{
 const server=createMcpServer(req.principal!.sub);
 const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
 res.on('close',()=>{void transport.close();void server.close();});
 try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}
 catch{if(!res.headersSent)res.status(500).json({jsonrpc:'2.0',error:{code:-32603,message:'Internal server error'},id:null});}
});
app.get('/mcp',ensureConfigured,requireAuth,(_req,res)=>res.status(405).set('Allow','POST').end());
app.delete('/mcp',ensureConfigured,requireAuth,(_req,res)=>res.status(405).set('Allow','POST').end());
