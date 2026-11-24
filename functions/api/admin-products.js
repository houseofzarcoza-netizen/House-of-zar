import {isAdmin,denied} from '../_lib/auth.js';
// Admin only: list every imported product (with your supplier cost) and edit its price or visibility.
export async function onRequestGet({request,env}){
  if(!(await isAdmin(request,env)))return denied();
  const {results=[]}=await env.DB.prepare('SELECT cj_pid,name,image_url,supplier_price,retail_price,active FROM products ORDER BY created_at DESC').all();
  return Response.json({products:results});
}
export async function onRequestPost({request,env}){
  if(!(await isAdmin(request,env)))return denied();
  const b=await request.json();const id=String(b.id||'');
  if(!id)return Response.json({error:'Missing product id.'},{status:400});
  const rp=b.retail_price??b.retailPrice;
  if(rp!==undefined){
    const price=Number(rp);
    if(!Number.isFinite(price)||price<=0||price>100000)return Response.json({error:'Enter a price above 0.'},{status:400});
    await env.DB.prepare('UPDATE products SET retail_price=? WHERE cj_pid=?').bind(Number(price.toFixed(2)),id).run();
  }
  if(b.active!==undefined)await env.DB.prepare('UPDATE products SET active=? WHERE cj_pid=?').bind(b.active?1:0,id).run();
  return Response.json({ok:true});
}
