import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.AUTH_ISSUER='https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1';
process.env.AUTH_ALLOWED_CLIENT_IDS='client-one';
const {authConfig,authorizedPrincipal}=await import('../src/auth.js');
test('OAuth configuration requires explicit approved clients',()=>{
 assert.throws(()=>authConfig({AUTH_ISSUER:'https://example.supabase.co/auth/v1',AUTH_ALLOWED_CLIENT_IDS:''} as NodeJS.ProcessEnv));
});
test('OAuth JWT maps authorized client and subject',()=>{
 assert.deepEqual(authorizedPrincipal({sub:'user-1',exp:2000000000,client_id:'client-one'},['client-one']),{sub:'user-1',clientId:'client-one'});
});
test('token from another OAuth client is rejected',()=>{
 assert.throws(()=>authorizedPrincipal({sub:'user-1',exp:2000000000,client_id:'client-two'},['client-one']));
});
test('token lacking OAuth client identity is rejected',()=>{
 assert.throws(()=>authorizedPrincipal({sub:'user-1',exp:2000000000},['client-one']));
});
test('missing subject and expiry rejected',()=>{
 assert.throws(()=>authorizedPrincipal({exp:2000000000,client_id:'client-one'},['client-one']));
 assert.throws(()=>authorizedPrincipal({sub:'user-1',client_id:'client-one'},['client-one']));
});
