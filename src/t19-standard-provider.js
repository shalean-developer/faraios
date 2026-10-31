// Standard Zoho OAuth transport: fixed endpoints, secrets in form bodies only.
import {zohoDomains} from './zoho-books.js';
export const standardScopes='ZohoBooks.settings.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE';
export function createStandardProvider({fetchImpl=globalThis.fetch,apiDomain,clientId,clientSecret,redirectUri}){
 if(!Object.hasOwn(zohoDomains,apiDomain)||!clientId||!clientSecret)throw Error('accounting_configuration_rejected');
 const accounts=zohoDomains[apiDomain];
 async function json(url,options={},revocation=false){
  let reader;
  try{
   const r=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!r.ok||r.redirected)throw Error();
   reader=r.body.getReader();const chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000)throw Error();chunks.push(value);}
   const raw=Buffer.concat(chunks).toString('utf8');
   if(revocation&&r.status===200&&!raw.trim())return {status:'success'};
   const v=JSON.parse(raw);
   if(v.error||v.code!==undefined&&v.code!==0)throw Error();return v;
  }catch{throw Error('zoho_request_failed');}finally{if(reader)try{await reader.cancel();}catch{}}
 }
 const post=(path,params,headers={},revocation=false)=>json(accounts+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams(params)},revocation);
 async function token(params){
  const t=await post('/oauth/v2/token',{client_id:clientId,client_secret:clientSecret,...params});
  if(typeof t.access_token!=='string'||!t.access_token||t.api_domain!==apiDomain||!Number.isSafeInteger(t.expires_in)||t.expires_in<1||t.expires_in>3600)throw Error('zoho_token_rejected');
  return t;
 }
 return Object.freeze({
  consent(state){const u=new URL(accounts+'/oauth/v2/auth');u.search=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:standardScopes,access_type:'offline',prompt:'consent',state});return u.href;},
  exchange:code=>token({grant_type:'authorization_code',code,redirect_uri:redirectUri}),
  // Zoho Self Client generates its grant in the console; no redirect is used.
  exchangePrivateCode:code=>token({grant_type:'authorization_code',code}),
  refresh:refresh_token=>token({grant_type:'refresh_token',refresh_token}),
  async organization(accessToken,organizationId){
   if(!/^\d{1,30}$/.test(organizationId))throw Error('zoho_organization_rejected');
   const u=new URL(apiDomain+'/books/v3/organizations/'+organizationId);u.searchParams.set('organization_id',organizationId);
   const v=await json(u.href,{headers:{Authorization:'Zoho-oauthtoken '+accessToken}}),o=v.organization;
   if(String(o?.organization_id)!==organizationId||o.is_org_active!==true||o.currency_code!=='ZAR'||typeof o.name!=='string')throw Error('zoho_organization_rejected');
   return {id:organizationId,name:o.name,currency:o.currency_code};
  },
  async revoke(refreshToken){
   // Current Accounts documentation uses authenticated /revoke/token. Books
   // documents the older /token/revoke; verify this endpoint in milestone B.
   const r=await post('/oauth/v2/revoke/token',{token:refreshToken,token_type:'refresh_token'},{Authorization:'Basic '+Buffer.from(clientId+':'+clientSecret).toString('base64')},true);
   if(r.status!=='success')throw Error('zoho_revocation_unverified');
  }
 });
}
