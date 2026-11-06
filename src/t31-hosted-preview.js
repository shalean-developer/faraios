// Dedicated synthetic onboarding project; legacy hosting configuration is unchanged.
export const previewProject='qcmnxjilmsibxftfverd';
export const previewDatabase='https://qcmnxjilmsibxftfverd.supabase.co';
export const previewKey='sb_publishable__ObwQV0RX9dhkBOXaI5zSA_eeZErPF1';
export const previewRoutes=new Set(['/','/login','/logout','/register','/business/new','/dashboard','/onboarding','/settings','/catalogue','/branding','/staff','/team-invite','/team-members','/accept-invite','/environment-health','/robots.txt','/style.css','/dropdown.js','/date-time-picker.js','/date-time-values.js','/catalogue-setup.js']);
const reads=new Set(['businesses','business_memberships']);
const writes=new Set(['business_settings','business_catalogue','t31_business_branding','staff_profiles','staff_teams']);
const rpcs=new Set(['t31_provision_business','t31_invite_staff','t31_accept_invite','t31_staff_members','t31_suspend_member','staff_context','staff_availability']);
export function createPreviewFetch(dispatch=globalThis.fetch){
 return async(input,init={})=>{
  const req=new Request(input,init),url=new URL(req.url),method=req.method;
  let allow=false;
  if(url.origin===previewDatabase&&!url.username&&!url.password&&!url.hash){
   if(url.pathname==='/auth/v1/signup')allow=method==='POST'&&!url.search;
   if(url.pathname==='/auth/v1/token')allow=method==='POST'&&url.search==='?grant_type=password';
   if(url.pathname==='/auth/v1/user')allow=method==='GET'&&!url.search;
   if(url.pathname==='/auth/v1/logout')allow=method==='POST'&&url.search==='?scope=local';
   const table=url.pathname.match(/^\/rest\/v1\/([a-z_][a-z0-9_]*)$/)?.[1];
   if(table)allow=reads.has(table)&&['GET','HEAD'].includes(method)||writes.has(table)&&['GET','HEAD','POST','PATCH',...(table==='business_catalogue'?['DELETE']:[])].includes(method);
   const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_0-9]+)$/)?.[1];
   if(rpc)allow=rpcs.has(rpc)&&method==='POST'&&!url.search;
   if(['accept-profile','content-profile'].some(h=>req.headers.has(h)&&req.headers.get(h)!=='public'))allow=false;
  }
  if(!allow)throw Error('Onboarding preview outbound request blocked');
  return dispatch(new Request(req,{redirect:'error'}));
 };
}
