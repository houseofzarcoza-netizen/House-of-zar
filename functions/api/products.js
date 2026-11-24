// Public catalogue. supplier_price is deliberately NOT exposed.
export async function onRequestGet({env}){
  if(!env.DB) return Response.json({products:[],warning:'Database is not configured yet.'});
  const {results=[]}=await env.DB.prepare('SELECT cj_pid, name, image_url, retail_price, store_category FROM products WHERE active=1 ORDER BY created_at DESC').all();
  return Response.json({products:results},{headers:{'Cache-Control':'public, max-age=60'}});
}
