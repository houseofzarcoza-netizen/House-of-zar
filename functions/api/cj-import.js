import {isAdmin,denied} from '../_lib/auth.js';
const categoryMap=[['cutlery','Cutlery'],['knife','Cutlery'],['pot','Cookware'],['pan','Cookware'],['cookware','Cookware'],['plate','Dinnerware'],['cup','Dinnerware'],['glass','Dinnerware'],['microwave','Appliances'],['air fryer','Appliances'],['blender','Small appliances'],['kettle','Small appliances'],['toaster','Small appliances'],['rice cooker','Small appliances'],['coffee','Small appliances']];
function storeCategory(name){const s=(name||'').toLowerCase();for(const [k,v] of categoryMap)if(new RegExp('\\b'+k+'s?\\b').test(s))return v;return 'Accessories';}
export async function onRequestPost({request,env}){
  try{
    if(!(await isAdmin(request,env)))return denied();
    if(!env.DB)return Response.json({error:'D1 database binding DB is missing.'},{status:500});
    const p=await request.json();if(!p.id||!p.name||!p.image||!Number.isFinite(Number(p.supplierPrice)))return Response.json({error:'Product data is incomplete.'},{status:400});
    const markup=Number(p.markupPercent??45);if(markup<0||markup>500)return Response.json({error:'Markup must be between 0 and 500.'},{status:400});
    const retail=Number((Number(p.supplierPrice)*(1+markup/100)).toFixed(2));
    await env.DB.prepare(`INSERT INTO products(cj_pid,name,image_url,supplier_price,retail_price,store_category,cj_sku,active,created_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(cj_pid) DO UPDATE SET name=excluded.name,image_url=excluded.image_url,supplier_price=excluded.supplier_price,retail_price=excluded.retail_price,store_category=excluded.store_category,cj_sku=excluded.cj_sku,active=1`).bind(String(p.id),String(p.name),String(p.image),Number(p.supplierPrice),retail,storeCategory(p.category||p.name),String(p.sku||''),1,Date.now()).run();
    return Response.json({ok:true,source:'CJdropshipping',product:{id:p.id,name:p.name,supplierPrice:Number(p.supplierPrice),retailPrice:retail,currency:'USD'}});
  }catch(e){return Response.json({error:e.message||'Import failed.'},{status:500});}
}
