import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
function key():Buffer {
  const value=Buffer.from(process.env.ENCRYPTION_KEY_BASE64??'','base64');
  if(value.length!==32)throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes');
  return value;
}
export function encrypt(value:string):string {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64url')).join('.');
}
export function decrypt(value:string):string {
  const parts=value.split('.');
  if(parts.length!==3)throw new Error('Malformed encrypted value');
  const [iv,tag,encrypted]=parts.map(x=>Buffer.from(x,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',key(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8');
}
