const byId=id=>document.getElementById(id);let found=[];
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
byId('search').addEventListener('click',async()=>{const secret=byId('admin-secret').value.trim(),q=byId('query').value.trim();if(!secret||q.length<2){byId('status').textContent='Enter the admin secret and a search term of at least two characters.';return;}byId('status').textContent='Searching CJdropshipping…';byId('results').innerHTML='';try{const r=await fetch('/api/cj-search?q='+encodeURIComponent(q),{headers:{'x-admin-secret':secret}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Search failed');found=j.products||[];byId('status').textContent=`Found ${found.length} products from CJdropshipping (total matching records: ${j.total||found.length}).`;byId('results').innerHTML=found.map((p,i)=>`<article class="admin-product"><img src="${esc(p.image)}" alt=""><h3>${esc(p.name)}</h3><p>CJ SKU: ${esc(p.sku||'Not provided')}<br>Supplier price: ${Number(p.supplierPrice).toFixed(2)} USD<br>Reported inventory: ${Number(p.inventory)||0}</p><button data-import="${i}">Import this CJ product</button></article>`).join('')||'<p>No products found. Try another kitchenware search.</p>';}catch(e){byId('status').textContent='Error: '+e.message;}});
byId('results').addEventListener('click',async e=>{const b=e.target.closest('[data-import]');if(!b)return;const p=found[Number(b.dataset.import)];if(!p)return;b.disabled=true;b.textContent='Importing…';try{const r=await fetch('/api/cj-import',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':byId('admin-secret').value.trim()},body:JSON.stringify({...p,markupPercent:Number(byId('markup').value)})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Import failed');b.textContent='Imported ✓';byId('status').textContent=`Imported ${p.name}. Retail price: $${j.product.retailPrice.toFixed(2)} USD. View it on the storefront.`;}catch(e){b.disabled=false;b.textContent='Retry import';byId('status').textContent='Import error: '+e.message;}});

/* ---------- paid orders ---------- */
const STATUS_LABEL={paid:'Paid — needs CJ order',ordered_with_cj:'Ordered with CJ',shipped:'Shipped',refunded:'Refunded'};
async function loadOrders(){
  const secret=byId('admin-secret').value.trim();if(!secret){byId('status').textContent='Enter the admin secret first.';return;}
  try{
    const r=await fetch('/api/orders',{headers:{'x-admin-secret':secret}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not load orders');
    byId('orders').innerHTML=j.orders.map(o=>{const a=o.shipping?.address||{};
      return `<article class="admin-product" style="margin:12px 0"><h3>${esc(o.customer_name||'Customer')} · $${Number(o.total).toFixed(2)}</h3>
      <p>${esc(o.email||'')}${o.shipping?.phone?' · '+esc(o.shipping.phone):''}<br>${esc([a.line1,a.line2,a.city,a.state,a.postal_code,a.country].filter(Boolean).join(', '))}<br>${new Date(o.created_at).toLocaleString()}</p>
      <ul style="font-size:13px;padding-left:18px">${o.items.map(i=>`<li>${esc(i.name)} × ${i.qty} <small>(CJ SKU ${esc(i.sku||'n/a')}, CJ ID ${esc(i.pid)})</small></li>`).join('')}</ul>
      <select data-order="${esc(o.id)}">${Object.entries(STATUS_LABEL).map(([k,v])=>`<option value="${k}"${k===o.status?' selected':''}>${v}</option>`).join('')}</select></article>`;}).join('')||'<p>No paid orders yet.</p>';
  }catch(e){byId('status').textContent='Error: '+e.message;}
}
byId('load-orders').addEventListener('click',loadOrders);
byId('orders').addEventListener('change',async e=>{const sel=e.target.closest('[data-order]');if(!sel)return;
  try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':byId('admin-secret').value.trim()},body:JSON.stringify({id:sel.dataset.order,status:sel.value})});if(!r.ok)throw new Error((await r.json()).error);byId('status').textContent='Order status updated.';}
  catch(err){byId('status').textContent='Error: '+err.message;}});

/* ---------- edit prices, hide / show ---------- */
let mine=[];
function drawMine(){
  byId('my-products').innerHTML=mine.map(p=>`<article class="admin-product" style="${p.active?'':'opacity:.55'}"><img src="${esc(p.image_url)}" alt=""><h3>${esc(p.name)}</h3>
    <p>CJ price: $${Number(p.supplier_price).toFixed(2)}<br>Profit: <b>$${(p.retail_price-p.supplier_price).toFixed(2)}</b> · ${p.active?'Showing in store':'Hidden'}</p>
    <label style="font-size:12px">Your price (USD)</label><input type="number" step="0.01" min="0.5" value="${Number(p.retail_price).toFixed(2)}" data-price="${esc(p.cj_pid)}">
    <button data-save="${esc(p.cj_pid)}">Save price</button><button class="secondary" data-toggle="${esc(p.cj_pid)}">${p.active?'Hide':'Show'}</button></article>`).join('')||'<p>No products yet. Search CJ and import some first.</p>';
}
async function loadMine(){
  const secret=byId('admin-secret').value.trim();if(!secret){byId('status').textContent='Enter the admin secret first.';return;}
  try{const r=await fetch('/api/admin-products',{headers:{'x-admin-secret':secret}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not load products');mine=j.products;drawMine();}
  catch(e){byId('status').textContent='Error: '+e.message;}
}
async function updateProduct(body){
  const r=await fetch('/api/admin-products',{method:'POST',headers:{'Content-Type':'application/json','x-admin-secret':byId('admin-secret').value.trim()},body:JSON.stringify(body)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Update failed');
}
byId('load-products').addEventListener('click',loadMine);
byId('my-products').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
    if(b.dataset.save){const v=document.querySelector(`[data-price="${CSS.escape(b.dataset.save)}"]`).value;await updateProduct({id:b.dataset.save,retail_price:Number(v)});byId('status').textContent='Price saved.';}
    if(b.dataset.toggle){const p=mine.find(x=>x.cj_pid===b.dataset.toggle);await updateProduct({id:p.cj_pid,active:!p.active});byId('status').textContent=p.active?'Product hidden from your store.':'Product is showing again.';}
    await loadMine();
  }catch(err){byId('status').textContent='Error: '+err.message;}
});
