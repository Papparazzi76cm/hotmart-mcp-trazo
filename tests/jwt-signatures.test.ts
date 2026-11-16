import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT,generateKeyPair} from 'jose';
process.env.AUTH_ISSUER ||= 'https://auth.example.com/';
process.env.AUTH_AUDIENCE ||= 'https://mcp.example.com/mcp';
const {verifySignedJwt}=await import('../src/auth.js');
const {publicKey,privateKey}=await generateKeyPair('RS256');
const issuer='https://auth.example.com/';
const audience='https://mcp.example.com/mcp';
async function token(aud=audience,expires='15m'){
 return new SignJWT({scope:'hotmart:read'})
  .setProtectedHeader({alg:'RS256'})
  .setIssuer(issuer).setAudience(aud).setSubject('user-one')
  .setIssuedAt().setExpirationTime(expires).sign(privateKey);
}
test('valid RS256 bearer token verifies subject and permissions',async()=>{
 const p=await verifySignedJwt(await token(),publicKey,issuer,audience);
 assert.equal(p.sub,'user-one');assert.equal(p.scopes.has('hotmart:read'),true);
});
test('rejects token with wrong resource audience',async()=>{
 await assert.rejects(()=>verifySignedJwt(await token('https://wrong.example/mcp'),publicKey,issuer,audience));
});
test('rejects expired access token',async()=>{
 await assert.rejects(()=>verifySignedJwt(await token(audience,'-1s'),publicKey,issuer,audience));
});
test('rejects invalid signature from unrelated key',async()=>{
 const other=await generateKeyPair('RS256');
 await assert.rejects(()=>verifySignedJwt(await token(),other.publicKey,issuer,audience));
});
test('rejects token issued by a different identity provider',async()=>{
 await assert.rejects(()=>verifySignedJwt(await token(),publicKey,'https://other.example/',audience));
});
