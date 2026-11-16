import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {JWTPayload} from 'jose';
import type {Request,Response,NextFunction} from 'express';

export type Principal={sub:string;clientId:string};
declare global {namespace Express {interface Request {principal?:Principal}}}
export function authConfig(env:NodeJS.ProcessEnv=process.env){
 const issuer=env.AUTH_ISSUER, audience=env.AUTH_AUDIENCE??'authenticated';
 const allowed=(env.AUTH_ALLOWED_CLIENT_IDS??'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!issuer||!issuer.startsWith('https://')||!issuer.endsWith('/auth/v1'))throw new Error('AUTH_ISSUER must be Supabase HTTPS /auth/v1 issuer');
 if(!allowed.length)throw new Error('AUTH_ALLOWED_CLIENT_IDS must contain at least one approved OAuth client');
 return {issuer,audience,allowed};
}
export function authorizedPrincipal(claims:JWTPayload,allowed:string[]):Principal{
 const sub=claims.sub;
 const clientId=claims.client_id;
 if(typeof sub!=='string'||!sub.trim())throw new Error('Missing subject');
 if(typeof clientId!=='string'||!allowed.includes(clientId))throw new Error('Unapproved OAuth client');
 if(typeof claims.exp!=='number')throw new Error('Non-expiring token');
 return {sub,clientId};
}
const cfg=authConfig();
const keys=createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json',cfg.issuer));
export async function verifyAccessToken(token:string):Promise<Principal>{
 const {payload}=await jwtVerify(token,keys,{issuer:cfg.issuer,audience:cfg.audience,algorithms:['RS256','ES256']});
 return authorizedPrincipal(payload,cfg.allowed);
}
function challenge(res:Response){
 const resource=(process.env.PUBLIC_URL??'').replace(/\/$/,'')+'/mcp';
 res.set('WWW-Authenticate',`Bearer resource_metadata="${process.env.PUBLIC_URL?.replace(/\/$/,'')}/.well-known/oauth-protected-resource"`);
 res.status(401).json({error:'unauthorized',resource});
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const match=/^Bearer\s+([^\s]+)$/i.exec(req.header('authorization')??'');
 if(!match){challenge(res);return;}
 try{req.principal=await verifyAccessToken(match[1]);next();}
 catch{challenge(res);}
}
