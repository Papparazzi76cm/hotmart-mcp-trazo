import pg from 'pg';
import {decrypt,encrypt} from './crypto.js';
export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10});
export async function createTenant(subject:string,name:string){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const {rows}=await client.query('INSERT INTO hotmart_mcp.tenants(name) VALUES($1) RETURNING id,name',[name]);
  const tenant=rows[0] as {id:string;name:string};
  await client.query("INSERT INTO hotmart_mcp.tenant_memberships(tenant_id,auth_subject,role) VALUES($1,$2,'owner')",[tenant.id,subject]);
  await client.query('COMMIT');
  return tenant;
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
export async function addMembership(actor:string,tenantId:string,data:{subject:string;role:'admin'|'viewer'}){
 const {rows}=await pool.query(`INSERT INTO hotmart_mcp.tenant_memberships(tenant_id,auth_subject,role)
 SELECT $1,$2,$3 WHERE EXISTS (
 SELECT 1 FROM hotmart_mcp.tenant_memberships WHERE tenant_id=$1 AND auth_subject=$4 AND role='owner'
 ) ON CONFLICT (tenant_id,auth_subject) DO NOTHING RETURNING auth_subject,role`,[tenantId,data.subject,data.role,actor]);
 return rows[0]??null;
}
export async function listConnections(subject:string){
 const {rows}=await pool.query(`SELECT c.id,c.tenant_id,c.label,t.name AS tenant_name
 FROM hotmart_mcp.hotmart_connections c
 JOIN hotmart_mcp.tenants t ON t.id=c.tenant_id
 JOIN hotmart_mcp.tenant_memberships m ON m.tenant_id=c.tenant_id
 WHERE m.auth_subject=$1 ORDER BY t.name,c.label`,[subject]);
 return rows as Array<{id:string;tenant_id:string;label:string;tenant_name:string}>;
}
export async function getConnection(subject:string,id:string){
 const {rows}=await pool.query(`SELECT c.id,c.client_id_encrypted,c.client_secret_encrypted,c.basic_encrypted
 FROM hotmart_mcp.hotmart_connections c
 JOIN hotmart_mcp.tenant_memberships m ON m.tenant_id=c.tenant_id
 WHERE c.id=$1 AND m.auth_subject=$2`,[id,subject]);
 const c=rows[0];
 if(!c)throw new Error('Connection not found or access denied');
 return {clientId:decrypt(c.client_id_encrypted),clientSecret:decrypt(c.client_secret_encrypted),basic:decrypt(c.basic_encrypted)};
}
export async function addConnection(subject:string,data:{tenantId:string;label:string;clientId:string;clientSecret:string;basic:string}){
 const {rows}=await pool.query(`INSERT INTO hotmart_mcp.hotmart_connections(tenant_id,label,client_id_encrypted,client_secret_encrypted,basic_encrypted)
 SELECT $1,$2,$3,$4,$5 WHERE EXISTS(
 SELECT 1 FROM hotmart_mcp.tenant_memberships WHERE tenant_id=$1 AND auth_subject=$6 AND role IN ('owner','admin')
 ) RETURNING id,label`,[data.tenantId,data.label,encrypt(data.clientId),encrypt(data.clientSecret),encrypt(data.basic),subject]);
 if(!rows[0])throw new Error('Tenant not found or admin access denied');
 return rows[0];
}
