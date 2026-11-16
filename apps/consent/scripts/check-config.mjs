import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const p=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
for(const route of ['/oauth/consent','/login','/auth/callback'])assert(p.rewrites.some(x=>x.source===route&&x.destination==='/index.html'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.includes('lang="es"'));
console.log('Consent UI route/config smoke checks passed.');
