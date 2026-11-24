import {isAdmin,denied} from '../_lib/auth.js';
async function getToken(env){
  if(!env.CJ_API_KEY) throw new Error('CJ_API_KEY secret is missing.');
  const cached=env.DB?await env.DB.prepare("SELECT value, expires_at FROM settings WHERE key='cj_access_token'").first():null;
  if(cached?.value && Number(cached.expires_at)>Date.now()+60000) return cached.value;
  const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:env.CJ_API_KEY})});
  const j=await r.json(); if(!r.ok||j.code!==200||!j.data?.accessToken) throw new Error(j.message||'CJ authentication failed.');
  if(env.DB) await env.DB.prepare("INSERT INTO settings(key,value,expires_at) VALUES('cj_access_token',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at").bind(j.data.accessToken,Date.now()+150*86400000).run();
  return j.data.accessToken;
}
export async function onRequestGet({request,env}){
  try{
    if(!(await isAdmin(request,env))) return denied();
    const url=new URL(request.url), keyword=(url.searchParams.get('q')||'').trim().slice(0,80);
    if(keyword.length<2) return Response.json({error:'Enter at least 2 characters.'},{status:400});
    const token=await getToken(env); const api=new URL('https://developers.cjdropshipping.com/api2.0/v1/product/listV2');
    api.searchParams.set('page','1');api.searchParams.set('size','30');api.searchParams.set('keyWord',keyword);api.searchParams.set('features','enable_description,enable_category');api.searchParams.set('sort','desc');
    const r=await fetch(api,{headers:{'CJ-Access-Token':token}});const j=await r.json();if(!r.ok||j.code!==200)throw new Error(j.message||'CJ product search failed.');
    const content=j.data?.content||[];const products=content.flatMap(x=>x.productList||[]).filter(p=>p.id&&p.nameEn&&p.bigImage).map(p=>({id:p.id,name:p.nameEn,sku:p.sku,image:p.bigImage,supplierPrice:Number(p.nowPrice||p.sellPrice||0),inventory:Number(p.totalVerifiedInventory??p.warehouseInventoryNum??0),category:p.threeCategoryName||''}));
    return Response.json({source:'CJdropshipping',total:j.data?.totalRecords||products.length,products});
  }catch(e){return Response.json({error:e.message||'Unexpected CJ error.'},{status:502});}
}
