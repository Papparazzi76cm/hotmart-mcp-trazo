import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missingConfig} from '../src/app.js';
test('backend remains unready without OAuth, DB and encryption keys',()=>{
 const absent=missingConfig({AUTH_ISSUER:'https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1',PUBLIC_URL:'https://example.vercel.app'} as NodeJS.ProcessEnv);
 assert.ok(absent.includes('DATABASE_URL'));
 assert.ok(absent.includes('AUTH_ALLOWED_CLIENT_IDS'));
 assert.ok(absent.includes('ENCRYPTION_KEY_BASE64'));
});
test('no readiness when values are example placeholders',()=>{
 const env={PUBLIC_URL:'https://test.example',AUTH_ISSUER:'https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1',DATABASE_URL:'REPLACE_WITH_DATABASE_URL',AUTH_ALLOWED_CLIENT_IDS:'REPLACE_ME',ENCRYPTION_KEY_BASE64:'REPLACE_KEY'} as NodeJS.ProcessEnv;
 assert.ok(missingConfig(env).length>0);
});
