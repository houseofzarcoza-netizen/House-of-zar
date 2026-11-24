const $ = (s) => document.querySelector(s);
const state = { products: [], cart: [] };
const CART_KEY = 'hoz-cart-v1';
$('#year').textContent = new Date().getFullYear();

const money = (v) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
const escapeHtml = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- bag (saved on this device) ---------- */
function saveCart(){ try{ localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); }catch(e){} }
function loadCart(){ try{ const c=JSON.parse(localStorage.getItem(CART_KEY)||'[]'); if(Array.isArray(c)) state.cart=c.filter(x=>x&&x.pid&&x.qty>0); }catch(e){} }
function notice(msg, kind='info'){ const n=$('#notice'); n.textContent=msg; n.className='notice-bar show '+kind; clearTimeout(notice.t); notice.t=setTimeout(()=>n.classList.remove('show'),7000); }

function renderCart(){
  const count = state.cart.reduce((n,x)=>n+x.qty,0);
  $('#cart-count').textContent = count;
  $('#cart-subtotal').textContent = money(state.cart.reduce((n,x)=>n+x.price*x.qty,0));
  $('#checkout-button').disabled = !count;
  $('#cart-items').innerHTML = state.cart.length ? state.cart.map(x=>`
    <div class="cart-row">
      <img src="${escapeHtml(x.image||'')}" alt="">
      <div class="cart-info"><span class="cart-name">${escapeHtml(x.name)}</span>
        <div class="qty"><button data-dec="${escapeHtml(x.pid)}" aria-label="Decrease quantity">−</button><span>${x.qty}</span><button data-inc="${escapeHtml(x.pid)}" aria-label="Increase quantity">+</button><button class="remove" data-remove="${escapeHtml(x.pid)}">Remove</button></div></div>
      <strong>${money(x.price*x.qty)}</strong></div>`).join('') : '<p>Your bag is empty.</p>';
  saveCart();
}
function changeQty(pid, d){ const it=state.cart.find(x=>x.pid===pid); if(!it) return; it.qty=Math.min(10,it.qty+d); if(it.qty<1) state.cart=state.cart.filter(x=>x!==it); renderCart(); }

/* ---------- catalogue ---------- */
function renderProducts(){
  const q = ($('#product-search').value||'').toLowerCase();
  const cat = $('#category-filter').value;
  const list = state.products.filter(p => (!q || (p.name||'').toLowerCase().includes(q)) && (!cat || p.store_category===cat));
  const grid = $('#product-grid');
  if(!list.length){
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">HZ</div><h3>${state.products.length?'No matching products.':'Your collection is being prepared.'}</h3><p>${state.products.length?'Try another search or category.':'New kitchenware and appliances are arriving soon. Please check back shortly.'}</p></div>`;
    return;
  }
  grid.innerHTML = list.map(p=>`<article class="product-card"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy"><div class="product-info"><h3>${escapeHtml(p.name)}</h3><span class="product-price">${money(p.retail_price)}</span><button data-add="${escapeHtml(p.cj_pid)}">Add to bag</button></div></article>`).join('');
}
async function loadProducts(){
  try{ const r=await fetch('/api/products'); if(!r.ok) throw 0; state.products=(await r.json()).products||[]; renderProducts();
    $('#catalog-status').textContent = state.products.length ? 'Shipping is calculated at checkout. Delivery times vary by destination.' : '';
  }catch(e){ $('#catalog-status').textContent='The product catalogue is temporarily unavailable. Please try again shortly.'; }
}

/* ---------- events ---------- */
$('#product-grid').addEventListener('click',e=>{
  const b=e.target.closest('[data-add]'); if(!b) return;
  const p=state.products.find(x=>x.cj_pid===b.dataset.add); if(!p) return;
  const it=state.cart.find(x=>x.pid===p.cj_pid);
  if(it) it.qty=Math.min(10,it.qty+1); else state.cart.push({pid:p.cj_pid,name:p.name,image:p.image_url,price:Number(p.retail_price),qty:1});
  renderCart(); b.textContent='Added ✓'; setTimeout(()=>b.textContent='Add to bag',1200);
});
$('#cart-items').addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t) return;
  if(t.dataset.inc) changeQty(t.dataset.inc,1);
  if(t.dataset.dec) changeQty(t.dataset.dec,-1);
  if(t.dataset.remove){ state.cart=state.cart.filter(x=>x.pid!==t.dataset.remove); renderCart(); }
});
const drawer=$('#cart-drawer');
const setDrawer=open=>{ drawer.classList.toggle('open',open); drawer.setAttribute('aria-hidden',String(!open)); };
$('#cart-toggle').onclick=()=>setDrawer(true);
$('#cart-close').onclick=()=>setDrawer(false);
drawer.addEventListener('click',e=>{ if(e.target.id==='cart-drawer') setDrawer(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') setDrawer(false); });

$('#checkout-button').onclick=async()=>{
  const btn=$('#checkout-button'); btn.disabled=true; btn.textContent='Preparing secure checkout…';
  try{
    const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:state.cart.map(x=>({id:x.pid,qty:x.qty}))})});
    const j=await r.json(); if(!r.ok||!j.url) throw new Error(j.error||'Checkout failed.');
    location.href=j.url;
  }catch(e){ notice(e.message,'error'); setDrawer(false); btn.disabled=false; btn.textContent='Continue to checkout'; }
};
$('#product-search').addEventListener('input',renderProducts);
$('#category-filter').addEventListener('change',renderProducts);
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{
  $('#category-filter').value=b.dataset.category; renderProducts(); $('#shop').scrollIntoView({behavior:'smooth'});
}));

/* ---------- return from Stripe ---------- */
const result=new URLSearchParams(location.search).get('checkout');
if(result==='success'){ state.cart=[]; saveCart(); notice('Thank you! Your payment went through. A receipt is on its way to your email.','ok'); history.replaceState(null,'','/'); }
else if(result==='cancelled'){ notice('Checkout cancelled. Your bag is still saved.','info'); history.replaceState(null,'','/'); }
else loadCart();
loadProducts(); renderCart();
