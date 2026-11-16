import {getConnection} from './db.js';
const TOKEN_URL=process.env.HOTMART_TOKEN_URL??'https://api-sec-vlc.hotmart.com/security/oauth/token';
const API_BASE=process.env.HOTMART_API_BASE??'https://developers.hotmart.com';
export type SalesFilters={start_date?:number;end_date?:number;transaction?:string;transaction_status?:string;product_id?:number;page_token?:string;max_results?:number};
export async function salesHistory(subject:string,connectionId:string,filters:SalesFilters){
 const credentials=await getConnection(subject,connectionId);
 const endpoint=new URL(TOKEN_URL);
 endpoint.searchParams.set('grant_type','client_credentials');
 endpoint.searchParams.set('client_id',credentials.clientId);
 endpoint.searchParams.set('client_secret',credentials.clientSecret);
 const basic=credentials.basic.replace(/^Basic\s+/i,'');
 const tokenResponse=await fetch(endpoint,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
 if(!tokenResponse.ok)throw new Error(`Hotmart token request failed (${tokenResponse.status})`);
 const tokenData=await tokenResponse.json() as {access_token?:string};
 if(!tokenData.access_token)throw new Error('Hotmart token missing');
 const url=new URL('/payments/api/v1/sales/history',API_BASE);
 for(const [key,value] of Object.entries(filters))if(value!==undefined)url.searchParams.set(key,String(value));
 const response=await fetch(url,{headers:{Authorization:`Bearer ${tokenData.access_token}`},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error(`Hotmart sales request failed (${response.status})`);
 const result=await response.json() as {items?:Array<any>;page_info?:any};
 return {items:(result.items??[]).map(item=>({
  product:item.product?{id:item.product.id,name:item.product.name}:undefined,
  purchase:item.purchase?{transaction:item.purchase.transaction,order_date:item.purchase.order_date,approved_date:item.purchase.approved_date,status:item.purchase.status,price:item.purchase.price,commission_as:item.purchase.commission_as}:undefined
 })),page_info:result.page_info??{}};
}
