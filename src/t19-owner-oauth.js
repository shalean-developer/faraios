// Custody-internal owner flow. No listeners, env reads or implicit activation.
import {randomBytes,createHash} from 'node:crypto';
import {zohoDomains} from './zoho-books.js';
import {credentialBinding} from './t19-c1.js';
import {createCustodyTransport} from './t19-provider-transport.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=()=>new Error('connection_verification_failed');
const text=s=>typeof s==='string'&&s.length>0&&s.length<=4096&&!/[\r\n\0]/.test(s);
export const accountingScopes='ZohoBooks.settings.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE';
export function createOwnerOAuth({sessions,query,fetchImpl,now=Date.now}){
 if(typeof sessions?.read!=='function'||typeof query!=='function')throw fail();
 const fetch=createCustodyTransport(fetchImpl);
 async function actor(sid){if(!text(sid))throw fail();const user=await sessions.read(sid);if(!user?.userId)throw fail();return user.userId;}
 async function call(action,p){try{const r=await query('select private_t19_custody.oauth($1::text,$2::jsonb) as value',[action,JSON.stringify(p)]);if(!r.rows?.[0]?.value)throw fail();return r.rows[0].value;}catch{throw fail();}}
 function validate(c){
  credentialBinding(c.binding);if(!Object.hasOwn(zohoDomains,c.api_domain)||!text(c.client_id))throw fail();
  const u=new URL(c.redirect_uri);if((u.protocol!=='https:'&&u.origin!=='http://127.0.0.1:3102')||u.username||u.password||u.search||u.hash||u.pathname!=='/accounting/zoho/callback')throw fail();
  return c;
 }
 async function json(url,options){const r=await fetch(url,options);if(!r.ok)throw fail();const v=await r.json();if(!v||typeof v!=='object'||Array.isArray(v))throw fail();return v;}
 return Object.freeze({
  async revoke(sid,{businessId,connectionId,generation}){
   let p,dispatched=false;
   const revoke=async(action,p)=>{try{const r=await query('select private_t19_custody.revoke_grant($1::text,$2::jsonb) as value',[action,JSON.stringify(p)]);if(!r.rows?.[0]?.value)throw fail();return r.rows[0].value;}catch{throw fail();}};
   try{
    p={actor:await actor(sid),businessId,connectionId,generation};
    const material=await revoke('claim',p);dispatched=true;
    if(!Object.hasOwn(zohoDomains,material.api_domain)||!text(material.refresh_token))throw fail();
    const result=await json(zohoDomains[material.api_domain]+'/oauth/v2/token/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:material.refresh_token})});
    if(result.status!=='success')throw fail();
    if(await actor(sid)!==p.actor)throw fail();await revoke('complete',p);
    return {providerRevoked:true};
   }catch{if(dispatched){try{await revoke('uncertain',p);}catch{}}throw fail();}
  },
  async begin(sid,{businessId,connectionId}){
   try{
    const state=randomBytes(32).toString('hex'),who=await actor(sid);
    const c=validate(await call('begin',{actor:who,businessId,connectionId,digest:hash(state),sessionDigest:hash(sid)}));
    const u=new URL(zohoDomains[c.api_domain]+'/oauth/v2/auth');
    u.search=new URLSearchParams({client_id:c.client_id,redirect_uri:c.redirect_uri,response_type:'code',scope:accountingScopes,access_type:'offline',prompt:'consent',state}).toString();
    return {authorizationUrl:u.href};
   }catch{throw fail();}
  },
  async callback(sid,{state,code}){
   let p;
   try{
    if(!/^[0-9a-f]{64}$/.test(state)||!text(code))throw fail();
    p={actor:await actor(sid),digest:hash(state),sessionDigest:hash(sid)};
    // Atomic consumption precedes exchange; restart/replay cannot reuse a code.
    const c=validate(await call('consume',p)),started=now();
    const tokens=await json(zohoDomains[c.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
     body:new URLSearchParams({grant_type:'authorization_code',client_id:c.client_id,client_secret:c.client_secret,code,redirect_uri:c.redirect_uri})});
    if(!text(tokens.access_token)||!text(tokens.refresh_token)||tokens.api_domain!==c.api_domain||tokens.token_type!=='Bearer'
     ||!Number.isSafeInteger(tokens.expires_in)||tokens.expires_in<1||tokens.expires_in>3600)throw fail();
    await call('store',{...p,material:{binding:c.binding,api_domain:c.api_domain,client_id:c.client_id,client_secret:c.client_secret,refresh_token:tokens.refresh_token}});
    const get=async(path,query={})=>{
     if(await actor(sid)!==p.actor||now()>=started+tokens.expires_in*1000)throw fail();
     await call('check',p);
     const u=new URL(c.api_domain+'/books/v3'+path);u.search=new URLSearchParams({organization_id:c.binding.organization_id,...query});
     const v=await json(u.href,{headers:{Authorization:'Zoho-oauthtoken '+tokens.access_token}});if(v.code!==0)throw fail();return v;
    };
    const visible=await get('/organizations');
    if(!Array.isArray(visible.organizations)||visible.organizations.length!==1||String(visible.organizations[0].organization_id)!==c.binding.organization_id||visible.page_context?.has_more_page===true)throw fail();
    const org=(await get('/organizations/'+c.binding.organization_id)).organization;
    if(String(org?.organization_id)!==c.binding.organization_id||org.is_org_active!==true||org.currency_code!==c.currency)throw fail();
    const users=[];let done=false;
    for(let page=1;page<=10;page++){
     const result=await get('/users',{page:String(page),per_page:'200'});
     if(!Array.isArray(result.users)||typeof result.page_context?.has_more_page!=='boolean')throw fail();
     users.push(...result.users.filter(u=>u.is_current_user===true));
     if(!result.page_context.has_more_page){done=true;break;}
    }
    if(!done||users.length!==1)throw fail();const user=users[0];
    if(String(user.user_id)!==c.user_id||user.email!==c.identity_email||String(user.role_id)!==c.role_id||user.status!=='active')throw fail();
    // Confirm read permissions without financial writes. CREATE permission remains
    // an explicit provider acceptance gate, backed by reviewed role configuration.
    for(const name of ['contacts','invoices']){const v=await get('/'+name,{page:'1',per_page:'1'});if(!Array.isArray(v[name]))throw fail();}
    if(await actor(sid)!==p.actor)throw fail();
    return await call('publish',{...p,evidence:{organization_id:c.binding.organization_id,user_id:c.user_id,role_id:c.role_id,identity_email:c.identity_email,currency:c.currency}});
   }catch{if(p){try{await call('reject',p);}catch{}}throw fail();}
  }
 });
}
