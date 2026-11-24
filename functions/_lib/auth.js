// Shared helpers. Files starting with "_" are not turned into routes by Pages Functions.
async function sha(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function isAdmin(request,env){
  const given=request.headers.get('x-admin-secret')||'';
  if(!env.ADMIN_SECRET||!given)return false;
  const [a,b]=await Promise.all([sha(given),sha(env.ADMIN_SECRET)]);
  let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];
  return d===0;
}
export const denied=()=>Response.json({error:'Admin authentication required.'},{status:401});
