import {isAdmin,denied} from '../_lib/auth.js';
const STATUSES=['paid','ordered_with_cj','shipped','refunded'];
export async function onRequestGet({request,env}){
  if(!(await isAdmin(request,env)))return denied();
  const {results=[]}=await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all();
  return Response.json({orders:results.map(o=>({...o,shipping:JSON.parse(o.shipping_json||'null'),items:JSON.parse(o.items_json)}))});
}
export async function onRequestPost({request,env}){
  if(!(await isAdmin(request,env)))return denied();
  const {id,status}=await request.json();
  if(!id||!STATUSES.includes(status))return Response.json({error:'Invalid order update.'},{status:400});
  await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(status,id).run();
  return Response.json({ok:true});
}
