import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {JWTPayload} from 'jose';
import type {Request,Response,NextFunction} from 'express';

export type Principal={sub:string;clientId:string};
declare global {namespace Express {interface Request {principal?:Principal}}}

export function authConfig(env:NodeJS.ProcessEnv=process.env){
 const issuer=env.AUTH_ISSUER,audience=env.AUTH_AUDIENCE??'authenticated';
 const allowed=(env.AUTH_ALLOWED_CLIENT_IDS??'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!issuer||!/^https:\/\/[^?#]+\/auth\/v1$/.test(issuer))throw new Error('Missing valid Supabase OAuth issuer');
 if(!allowed.length||allowed.some(v=>v==='*'||v.startsWith('REPLACE_')))throw new Error('No approved OAuth client IDs');
 return {issuer,audience,allowed};
}
export function authorizedPrincipal(claims:JWTPayload,allowed:string[]):Principal{
 const sub=claims.sub,clientId=claims.client_id;
 if(typeof sub!=='string'||!sub.trim())throw new Error('Missing user subject');
 if(typeof clientId!=='string'||!allowed.includes(clientId))throw new Error('OAuth client is not approved');
 if(typeof claims.exp!=='number')throw new Error('Token expiry required');
 return {sub,clientId};
}
let cachedKeys:ReturnType<typeof createRemoteJWKSet>|undefined;
export async function verifyAccessToken(token:string):Promise<Principal>{
 const cfg=authConfig();
 cachedKeys??=createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json',cfg.issuer));
 const {payload}=await jwtVerify(token,cachedKeys,{issuer:cfg.issuer,audience:cfg.audience,algorithms:['RS256','ES256']});
 return authorizedPrincipal(payload,cfg.allowed);
}
function challenge(res:Response){
 const root=(process.env.PUBLIC_URL??'').replace(/\/$/,'');
 res.set('WWW-Authenticate',`Bearer resource_metadata="${root}/.well-known/oauth-protected-resource"`);
 res.status(401).json({error:'unauthorized'});
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const match=/^Bearer\s+([^\s]+)$/i.exec(req.header('authorization')??'');
 if(!match){challenge(res);return;}
 try{req.principal=await verifyAccessToken(match[1]);next();}
 catch{challenge(res);}
}
