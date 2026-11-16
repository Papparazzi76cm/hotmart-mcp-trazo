import {createRemoteJWKSet,jwtVerify} from 'jose';
import type {Request,Response,NextFunction} from 'express';
const issuer=process.env.AUTH_ISSUER;
const audience=process.env.AUTH_AUDIENCE;
if(!issuer||!audience)throw new Error('AUTH_ISSUER and AUTH_AUDIENCE are required');
const normalizedIssuer=issuer.endsWith('/')?issuer:issuer+'/';
const jwks=createRemoteJWKSet(new URL('.well-known/jwks.json',normalizedIssuer));
export type Principal={sub:string;scopes:Set<string>};
declare global {namespace Express {interface Request {principal?:Principal}}}
function challenge(res:Response){
 const publicUrl=process.env.PUBLIC_URL?.replace(/\/$/,'')??'';
 res.set('WWW-Authenticate',`Bearer resource_metadata="${publicUrl}/.well-known/oauth-protected-resource", scope="hotmart:read"`);
 res.status(401).json({error:'unauthorized'});
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const bearer=/^Bearer\s+(.+)$/i.exec(req.header('authorization')??'');
 if(!bearer){challenge(res);return;}
 try{
   const {payload}=await jwtVerify(bearer[1],jwks,{issuer:normalizedIssuer,audience});
   if(!payload.sub)throw new Error('Missing subject');
   req.principal={sub:payload.sub,scopes:new Set(typeof payload.scope==='string'?payload.scope.split(' '):[])};
   next();
 }catch{challenge(res);}
}
export function requireScope(scope:string){
 return (req:Request,res:Response,next:NextFunction)=>{
   if(!req.principal?.scopes.has(scope)){res.status(403).json({error:'missing_scope',required:scope});return;}
   next();
 };
}
