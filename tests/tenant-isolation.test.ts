import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createConnectionStore} from '../src/db.js';
import {encrypt,decrypt} from '../src/crypto.js';

process.env.ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
const connections=[
 {id:'conn-a',tenant:'tenant-a',subject:'user-a',label:'A',role:'owner'},
 {id:'conn-b',tenant:'tenant-b',subject:'user-b',label:'B',role:'viewer'}
];
const secrets=new Map(connections.map(c=>[c.id,{
 client_id_encrypted:encrypt(c.id),client_secret_encrypted:encrypt('secret-'+c.id),basic_encrypted:encrypt('basic-'+c.id)
}]));
const sqlCalls:Array<{sql:string;params:unknown[]}>=[];

const store=createConnectionStore(async(sql,params)=>{
 sqlCalls.push({sql,params});
 if(sql.includes('SELECT c.id,c.tenant_id')){
  return {rows:connections.filter(c=>c.subject===params[0]).map(c=>({id:c.id,tenant_id:c.tenant,label:c.label,tenant_name:c.tenant}))};
 }
 if(sql.includes('SELECT c.id,c.client_id_encrypted')){
  return {rows:connections.filter(c=>c.id===params[0]&&c.subject===params[1]).map(c=>({id:c.id,...secrets.get(c.id)}))};
 }
 if(sql.includes('INSERT INTO')){
  const canWrite=connections.some(c=>c.tenant===params[0]&&c.subject===params[5]&&['owner','admin'].includes(c.role));
  return {rows:canWrite?[{id:'new-id',label:params[1]}]:[]};
 }
 throw new Error('Unknown SQL query');
});

test('list returns only current subject memberships',async()=>{
 const result=await store.listConnections('user-a');
 assert.deepEqual(result.map(r=>r.id),['conn-a']);
 assert.match(sqlCalls.at(-1)!.sql,/m\.auth_subject=\$1/);
});
test('cannot read other tenant credentials',async()=>{
 await assert.rejects(()=>store.getConnection('user-a','conn-b'),/access denied/);
 assert.match(sqlCalls.at(-1)!.sql,/c\.id=\$1 AND m\.auth_subject=\$2/);
});
test('own connection decrypts after membership lookup',async()=>{
 const found=await store.getConnection('user-a','conn-a');
 assert.equal(found.clientId,'conn-a');
});
test('viewer cannot add another connection',async()=>{
 await assert.rejects(()=>store.addConnection('user-b',{tenantId:'tenant-b',label:'extra',clientId:'new',clientSecret:'secret',basic:'basic'}),/admin access denied/);
 assert.match(sqlCalls.at(-1)!.sql,/role IN \('owner','admin'\)/);
});
test('owner cannot add connection to a foreign tenant',async()=>{
 await assert.rejects(()=>store.addConnection('user-a',{tenantId:'tenant-b',label:'extra',clientId:'new',clientSecret:'secret',basic:'basic'}),/admin access denied/);
});
test('encrypted credentials do not reveal plaintext',()=>{
 const value=encrypt('sensitive-test');
 assert.ok(!value.includes('sensitive-test'));
 assert.equal(decrypt(value),'sensitive-test');
});
