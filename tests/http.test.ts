import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {app} from '../src/app.js';

async function withServer(run:(base:string)=>Promise<void>){
 const server=app.listen(0);
 await new Promise<void>(resolve=>server.once('listening',resolve));
 const port=(server.address() as AddressInfo).port;
 try{await run(`http://127.0.0.1:${port}`);}
 finally{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
test('health endpoint responds without touching client databases',async()=>{
 await withServer(async base=>{
  const response=await fetch(base+'/health');
  assert.equal(response.status,200);
  const body=await response.json() as {status:string;service:string;ready:boolean};
  assert.equal(body.status,'ok');
  assert.equal(body.service,'hotmart-mcp-by-trazo-digital');
  assert.equal(body.ready,false);
 });
});
test('OAuth protected resource metadata identifies dedicated issuer',async()=>{
 await withServer(async base=>{
  const response=await fetch(base+'/.well-known/oauth-protected-resource');
  assert.equal(response.status,200);
  const body=await response.json() as {authorization_servers:string[];resource:string};
  assert.deepEqual(body.authorization_servers,['https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1']);
  assert.equal(body.resource,process.env.PUBLIC_URL?.replace(/\/$/,'')+'/mcp');
 });
});
test('MCP endpoint refuses requests when production secrets are absent',async()=>{
 await withServer(async base=>{
  const response=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',clientInfo:{name:'check',version:'1'},capabilities:{}}})});
  assert.equal(response.status,503);
  const body=await response.json() as {error:string};
  assert.equal(body.error,'service_not_configured');
 });
});
