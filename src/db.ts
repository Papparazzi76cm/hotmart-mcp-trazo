import pg from 'pg';
import {decrypt,encrypt} from './crypto.js';

export const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10});
type Row={ [key:string]:unknown };
type SqlQuery=(sql:string,values:unknown[])=>Promise<{rows:Row[]}>;
export function createConnectionStore(query:SqlQuery){
 return {
  async listConnections(subject:string){
   const {rows}=await query(`SELECT c.id,c.tenant_id,c.label,t.name AS tenant_name
    FROM hotmart_mcp.hotmart_connections c
    JOIN hotmart_mcp.tenants t ON t.id=c.tenant_id
    JOIN hotmart_mcp.tenant_memberships m ON m.tenant_id=c.tenant_id
    WHERE m.auth_subject=$1 ORDER BY t.name,c.label`,[subject]);
   return rows as Array<{id:string;tenant_id:string;label:string;tenant_name:string}>;
  },
  async getConnection(subject:string,id:string){
   const {rows}=await query(`SELECT c.id,c.client_id_encrypted,c.client_secret_encrypted,c.basic_encrypted
    FROM hotmart_mcp.hotmart_connections c
    JOIN hotmart_mcp.tenant_memberships m ON m.tenant_id=c.tenant_id
    WHERE c.id=$1 AND m.auth_subject=$2`,[id,subject]);
   const c=rows[0];
   if(!c)throw new Error('Connection not found or access denied');
   return {clientId:decrypt(String(c.client_id_encrypted)),clientSecret:decrypt(String(c.client_secret_encrypted)),basic:decrypt(String(c.basic_encrypted))};
  },
  async addConnection(subject:string,data:{tenantId:string;label:string;clientId:string;clientSecret:string;basic:string}){
   const {rows}=await query(`INSERT INTO hotmart_mcp.hotmart_connections(
    tenant_id,label,client_id_encrypted,client_secret_encrypted,basic_encrypted
   ) SELECT $1,$2,$3,$4,$5 WHERE EXISTS(
    SELECT 1 FROM hotmart_mcp.tenant_memberships
    WHERE tenant_id=$1 AND auth_subject=$6 AND role IN ('owner','admin')
   ) RETURNING id,label`,[
    data.tenantId,data.label,encrypt(data.clientId),encrypt(data.clientSecret),encrypt(data.basic),subject
   ]);
   if(!rows[0])throw new Error('Tenant not found or admin access denied');
   return rows[0];
  }
 };
}
const store=createConnectionStore((sql,values)=>pool.query(sql,values));
export const {listConnections,getConnection,addConnection}=store;
