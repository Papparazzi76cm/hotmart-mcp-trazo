import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {listConnections} from './db.js';
import {salesHistory} from './hotmart.js';
export function createMcpServer(subject:string){
 const server=new McpServer({name:'hotmart-mcp-by-trazo-digital',version:'0.1.0'});
 server.tool('list_hotmart_connections','List Hotmart connections available to the signed-in user.',{},async()=>({
  content:[{type:'text',text:JSON.stringify(await listConnections(subject))}]
 }));
 server.tool('list_hotmart_sales','Read one page of sales without personally identifiable buyer information.',{
  connection_id:z.string().uuid(),start_date:z.number().int().nonnegative().optional(),end_date:z.number().int().nonnegative().optional(),
  transaction:z.string().max(80).optional(),transaction_status:z.string().max(60).optional(),product_id:z.number().int().positive().optional(),
  page_token:z.string().max(4096).optional(),max_results:z.number().int().min(1).max(50).default(20)
 },async({connection_id,...filters})=>{
  try{return {content:[{type:'text',text:JSON.stringify(await salesHistory(subject,connection_id,filters))}]};}
  catch{return {isError:true,content:[{type:'text',text:'Unable to retrieve sales. Verify access and credentials.'}]};}
 });
 server.tool('summarize_hotmart_sales_page','Calculate gross amounts by currency for one page only; not a complete financial report.',{
  connection_id:z.string().uuid(),start_date:z.number().int().nonnegative(),end_date:z.number().int().nonnegative(),
  page_token:z.string().max(4096).optional(),max_results:z.number().int().min(1).max(50).default(50)
 },async({connection_id,...filters})=>{
  if(filters.end_date<filters.start_date)return {isError:true,content:[{type:'text',text:'end_date must be >= start_date'}]};
  try{
   const result=await salesHistory(subject,connection_id,filters);
   const totals:Record<string,{count:number;gross:number}>={};
   for(const item of result.items){
    const price=item.purchase?.price;
    if(typeof price?.value!=='number'||!price.currency_code)continue;
    const currency=price.currency_code;
    totals[currency]??={count:0,gross:0};
    totals[currency].count++;
    totals[currency].gross+=price.value;
   }
   return {content:[{type:'text',text:JSON.stringify({page_only:true,totals,page_info:result.page_info,warning:'Gross sale values, not net earnings; pagination and status filters apply.'})}]};
  }catch{return {isError:true,content:[{type:'text',text:'Unable to summarize sales page.'}]};}
 });
 return server;
}
