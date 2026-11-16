import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encrypt,decrypt} from '../src/crypto.js';
test('credential encryption round-trip and randomized ciphertext',()=>{
 process.env.ENCRYPTION_KEY_BASE64=randomBytes(32).toString('base64');
 const secret='never-commit-real-hotmart-credentials';
 const a=encrypt(secret),b=encrypt(secret);
 assert.notEqual(a,b);
 assert.equal(decrypt(a),secret);
 assert.equal(decrypt(b),secret);
 assert.ok(!a.includes(secret));
});
test('tampered credentials cannot be decrypted',()=>{
 process.env.ENCRYPTION_KEY_BASE64=randomBytes(32).toString('base64');
 const parts=encrypt('test').split('.');
 const payload=Buffer.from(parts[2],'base64url');
 payload[0]^=1;
 parts[2]=payload.toString('base64url');
 assert.throws(()=>decrypt(parts.join('.')));
});
