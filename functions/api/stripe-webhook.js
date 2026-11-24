// Stripe -> here. Records a paid order. Add the endpoint https://YOUR-SITE/api/stripe-webhook in Stripe
// (event: checkout.session.completed) and put its signing secret in STRIPE_WEBHOOK_SECRET.
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function verify(raw,header,secret){
  const parts=Object.fromEntries((header||'').split(',').map(s=>s.split('=')));
  if(!parts.t||!parts.v1)return false;
  if(Math.abs(Date.now()/1000-Number(parts.t))>300)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${parts.t}.${raw}`)));
  if(sig.length!==parts.v1.length)return false;
  let d=0;for(let i=0;i<sig.length;i++)d|=sig.charCodeAt(i)^parts.v1.charCodeAt(i);return d===0;
}
export async function onRequestPost({request,env}){
  if(!env.STRIPE_WEBHOOK_SECRET||!env.DB)return new Response('Not configured',{status:503});
  const raw=await request.text();
  if(!(await verify(raw,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET)))return new Response('Bad signature',{status:400});
  const event=JSON.parse(raw);
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
    const s=event.data.object;
    if(s.payment_status!=='paid')return new Response('ok');
    const items=[];
    for(const part of (s.metadata?.cart||'').split(',').filter(Boolean)){
      const i=part.lastIndexOf(':');const pid=part.slice(0,i),qty=Number(part.slice(i+1));
      const p=await env.DB.prepare('SELECT name,cj_sku,retail_price FROM products WHERE cj_pid=?').bind(pid).first();
      items.push({pid,name:p?.name||'(removed product)',sku:p?.cj_sku||'',qty,unit_price:p?.retail_price??null});
    }
    const ship=s.collected_information?.shipping_details||s.shipping_details||null;
    await env.DB.prepare('INSERT OR IGNORE INTO orders(id,email,customer_name,shipping_json,items_json,total,status,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(s.id,s.customer_details?.email||null,s.customer_details?.name||ship?.name||null,JSON.stringify({...ship,phone:s.customer_details?.phone||null}),JSON.stringify(items),(s.amount_total||0)/100,'paid',Date.now()).run();
  }
  return new Response('ok');
}
