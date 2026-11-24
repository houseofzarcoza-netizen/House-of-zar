// Creates a Stripe Checkout Session. Prices are ALWAYS read from D1 here; the browser's prices are ignored.
const COUNTRIES=['US','CA','GB','IE','AU','NZ','DE','FR','ES','IT','NL','BE','AT','CH','SE','NO','DK','FI','PT','PL','AE','SA','QA','KW','SG','JP','MX'];
export async function onRequestPost({request,env}){
  try{
    if(!env.STRIPE_SECRET_KEY||!env.DB)return Response.json({error:'Checkout is not available yet.'},{status:503});
    const body=await request.json();
    const items=(Array.isArray(body.items)?body.items:[]).slice(0,10);
    if(!items.length)return Response.json({error:'Your bag is empty.'},{status:400});
    const form=new URLSearchParams();let meta=[];
    for(const [i,it] of items.entries()){
      const qty=Math.min(10,Math.max(1,parseInt(it.qty,10)||0));
      const p=await env.DB.prepare('SELECT cj_pid,name,image_url,retail_price FROM products WHERE cj_pid=? AND active=1').bind(String(it.id)).first();
      if(!p)return Response.json({error:'An item in your bag is no longer available. Please remove it and try again.'},{status:409});
      const pre=`line_items[${i}]`;
      form.set(`${pre}[quantity]`,String(qty));
      form.set(`${pre}[price_data][currency]`,'usd');
      form.set(`${pre}[price_data][unit_amount]`,String(Math.round(p.retail_price*100)));
      form.set(`${pre}[price_data][product_data][name]`,p.name.slice(0,250));
      if(/^https:\/\//.test(p.image_url))form.set(`${pre}[price_data][product_data][images][0]`,p.image_url);
      meta.push(`${p.cj_pid}:${qty}`);
    }
    const metaStr=meta.join(',');
    if(metaStr.length>490)return Response.json({error:'Too many different items in one order. Please check out with fewer items.'},{status:400});
    const origin=new URL(request.url).origin;
    const ship=Math.round(parseFloat(env.SHIPPING_USD||'7.99')*100);
    form.set('mode','payment');
    form.set('success_url',`${origin}/?checkout=success`);
    form.set('cancel_url',`${origin}/?checkout=cancelled`);
    form.set('metadata[cart]',metaStr);
    form.set('billing_address_collection','auto');
    COUNTRIES.forEach((c,i)=>form.set(`shipping_address_collection[allowed_countries][${i}]`,c));
    form.set('phone_number_collection[enabled]','true');
    form.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
    form.set('shipping_options[0][shipping_rate_data][display_name]','Standard international shipping');
    form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(ship));
    form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
    const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{'Authorization':`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error?.message||'Stripe error');
    return Response.json({url:j.url});
  }catch(e){return Response.json({error:e.message||'Checkout failed.'},{status:500});}
}
