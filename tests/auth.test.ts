import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.AUTH_ISSUER ||= 'https://auth.example.com/';
process.env.AUTH_AUDIENCE ||= 'https://mcp.example.com/mcp';
const {parseVerifiedClaims,requireScope}=await import('../src/auth.js');

test('verified claims produce exact scopes and subject',()=>{
 const p=parseVerifiedClaims({sub:'provider|tenant-user-1',exp:2000000000,scope:'hotmart:read hotmart:manage'});
 assert.equal(p.sub,'provider|tenant-user-1');
 assert.deepEqual([...p.scopes],['hotmart:read','hotmart:manage']);
 assert.equal(p.scopes.has('hotmart:admin'),false);
});
test('claims without expiry or subject are rejected',()=>{
 assert.throws(()=>parseVerifiedClaims({sub:'',exp:2000000000,scope:'hotmart:read'}));
 assert.throws(()=>parseVerifiedClaims({sub:'valid',scope:'hotmart:read'}));
});
test('malformed scopes never grant permissions',()=>{
 assert.equal(parseVerifiedClaims({sub:'u1',exp:2000000000,scope:['hotmart:manage']}).scopes.size,0);
});
test('read scope cannot call management route',()=>{
 const middleware=requireScope('hotmart:manage');
 let code=0,advanced=false;
 const req={principal:{sub:'u',scopes:new Set(['hotmart:read'])}};
 const res={status(n:number){code=n;return this;},json(_body:unknown){return this;}};
 middleware(req as never,res as never,(()=>{advanced=true;}) as never);
 assert.equal(code,403);
 assert.equal(advanced,false);
});
test('management scope can call management route',()=>{
 const middleware=requireScope('hotmart:manage');
 let advanced=false;
 middleware({principal:{sub:'u',scopes:new Set(['hotmart:manage'])}} as never,{} as never,(()=>{advanced=true;}) as never);
 assert.equal(advanced,true);
});
