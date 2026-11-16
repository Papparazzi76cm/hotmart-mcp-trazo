import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {Request,Response,NextFunction} from 'express';

export type Principal={sub:string;scopes:Set<string>};
declare global {namespace Express {interface Request {principal?:Principal}}}

export function requireAuthConfig(){
 const issuer=process.env.AUTH_ISSUER;
 const audience=process.env.AUTH_AUDIENCE;
 if(!issuer||!audience)throw new Error('AUTH_ISSUER and AUTH_AUDIENCE are required');
 const issuerUrl=new URL(issuer);
 if(issuerUrl.protocol!=='https:')throw new Error('AUTH_ISSUER must use HTTPS');
 if(issuerUrl.search||issuerUrl.hash)throw new Error('AUTH_ISSUER must not contain query or fragment');
 return {issuer:issuerUrl.toString(),audience};
}

export function parseVerifiedClaims(payload:{sub?:string;exp?:number;scope?:unknown;aud?:unknown}):Principal{
 if(typeof payload.sub!=='string'||!payload.sub.trim())throw new Error('Missing subject');
 if(typeof payload.exp!=='number')throw new Error('Expiring access token required');
 const scopes=typeof payload.scope==='string'?payload.scope.split(' ').filter(Boolean):[];
 return {sub:payload.sub,scopes:new Set(scopes)};
}

const {issuer,audience}=requireAuthConfig();
const jwks=createRemoteJWKSet(new URL('.well-known/jwks.json',issuer));
export async function verifySignedJwt(token:string,key:Parameters<typeof jwtVerify>[1],expectedIssuer:string,expectedAudience:string):Promise<Principal>{
 const {payload}=await jwtVerify(token,key,{issuer:expectedIssuer,audience:expectedAudience,algorithms:['RS256','ES256']});
 return parseVerifiedClaims(payload);
}
export async function verifyAccessToken(token:string):Promise<Principal>{
 return verifySignedJwt(token,jwks,issuer,audience);
}
function challenge(res:Response){
 const base=process.env.PUBLIC_URL?.replace(/\/$/,'')??'';
 res.set('WWW-Authenticate',`Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="hotmart:read"`);
 res.status(401).json({error:'unauthorized'});
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const match=/^Bearer\s+([^\s]+)$/i.exec(req.header('authorization')??'');
 if(!match){challenge(res);return;}
 try{
  req.principal=await verifyAccessToken(match[1]);
  next();
 }catch{challenge(res);}
}
export function requireScope(scope:string){
 return (req:Request,res:Response,next:NextFunction)=>{
  if(!req.principal?.scopes.has(scope)){res.status(403).json({error:'missing_scope',required:scope});return;}
  next();
 };
}
