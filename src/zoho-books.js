// Server-only adapter. Every URL is selected from a fixed regional allowlist.
export const zohoDomains=Object.freeze({'https://www.zohoapis.com':'https://accounts.zoho.com','https://www.zohoapis.eu':'https://accounts.zoho.eu','https://www.zohoapis.in':'https://accounts.zoho.in','https://www.zohoapis.com.au':'https://accounts.zoho.com.au','https://www.zohoapis.jp':'https://accounts.zoho.jp','https://www.zohoapis.ca':'https://accounts.zohocloud.ca','https://www.zohoapis.com.cn':'https://accounts.zoho.com.cn','https://www.zohoapis.sa':'https://accounts.zoho.sa'});
const validId=v=>typeof v==='string'&&/^[0-9]{1,30}$/.test(v);
export class AccountingError extends Error{constructor(code,{uncertain=false}={}){super(code);this.code=code;this.uncertain=uncertain;}}
export function providerCents(value){
 // Reject fractional cents, exponent notation, infinity and unsafe integers.
 const s=String(value),m=s.match(/^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/);if(!m)throw new AccountingError('mismatch');
 const n=Number(m[1])*100+Number((m[2]??'').padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>2147483647)throw new AccountingError('mismatch');return n;
}
export function verifiedReceipt(invoice,binding,external){
 const lines=invoice.snapshot.price_lines.filter(l=>l.quantity>0);
 if(invoice.snapshot.price_lines.some(l=>l.quantity===0&&l.total_cents!==0))throw new AccountingError('mismatch');
 if(!external||!validId(external.invoice_id)||typeof external.invoice_number!=='string'||!external.invoice_number.trim()||external.invoice_number.length>100||external.reference_number!=='FaraiOS:'+invoice.id||String(external.customer_id)!==invoice.external_customer_id||external.currency_code!==invoice.currency||external.status!=='draft'||external.is_emailed!==false||providerCents(external.total)!==invoice.total_cents||!Array.isArray(external.line_items)||external.line_items.length!==lines.length)throw new AccountingError('mismatch');
 if(invoice.external_invoice_id&&external.invoice_id!==invoice.external_invoice_id)throw new AccountingError('mismatch');
 for(const field of ['tax_total','discount_total','shipping_charge','adjustment','payment_made','credits_applied','write_off_amount'])if(external[field]!==undefined&&providerCents(external[field])!==0)throw new AccountingError('mismatch');
 for(let n=0;n<lines.length;n++){const a=lines[n],b=external.line_items[n];if(!b||b.name!==a.name||Number(b.quantity)!==a.quantity||providerCents(b.rate)!==a.rate_cents||providerCents(b.item_total)!==a.total_cents||String(b.unit??'')!==a.unit_label||b.tax_id&&String(b.tax_id).trim()||b.discount_amount!==undefined&&providerCents(b.discount_amount)!==0)throw new AccountingError('mismatch');}
 return {organization_id:binding.organization_id,api_domain:binding.api_domain,invoice_id:external.invoice_id,invoice_number:external.invoice_number,reference_number:external.reference_number,customer_id:invoice.external_customer_id,currency_code:external.currency_code,total_cents:invoice.total_cents,status:'draft',price_lines:invoice.snapshot.price_lines};
}
export function createZohoBooks({credentials,fetchImpl=globalThis.fetch,now=()=>Date.now(),custodyAccess,guard,beforeCreate}={}){
 if(custodyAccess&&[custodyAccess,guard,beforeCreate].some(fn=>typeof fn!=='function'))throw new AccountingError('credentials');
 const tokens=new Map();
 async function request(url,options={},postInvoice=false){
  let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw new AccountingError('provider_unavailable',{uncertain:postInvoice});}
  if(!response.ok)throw new AccountingError(response.status===429?'rate_limited':response.status===401||response.status===403?'credentials':'provider_unavailable',{uncertain:postInvoice});
  let data;try{const raw=await response.text();if(raw.length>2_000_000)throw new Error();data=JSON.parse(raw);}catch{throw new AccountingError('provider_unavailable',{uncertain:postInvoice});}
  if(data.code!==undefined&&data.code!==0)throw new AccountingError('provider_unavailable',{uncertain:postInvoice});return data;
 }
 async function context(connection){
  if(!Object.hasOwn(zohoDomains,connection.api_domain)||!validId(connection.organization_id)||connection.environment!=='staging'||!connection.enabled)throw new AccountingError('organization');
  let token,key;
  if(custodyAccess){token=await custodyAccess(connection);if(typeof token!=='string'||!token)throw new AccountingError('credentials');}
  else {
  const secret=await credentials?.(connection.credential_key);
  // Operator-provisioned pins are independent of browser-editable connection metadata.
  if(!secret||secret.business_id!==connection.business_id||secret.organization_id!==connection.organization_id||secret.api_domain!==connection.api_domain||secret.environment!=='staging'||secret.staging_organization_confirmed!==true||!secret.client_id||!secret.client_secret||!secret.refresh_token)throw new AccountingError('credentials');
  key=JSON.stringify([connection.business_id,connection.credential_key,connection.organization_id,connection.api_domain]);const cached=tokens.get(key);
  if(cached&&cached.expires>now()+60000)token=cached.token;
  else{
   const body=new URLSearchParams({grant_type:'refresh_token',client_id:secret.client_id,client_secret:secret.client_secret,refresh_token:secret.refresh_token});
   const result=await request(zohoDomains[connection.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
   if(typeof result.access_token!=='string'||!result.access_token||result.api_domain!==connection.api_domain||!Number.isFinite(result.expires_in)||result.expires_in<=0)throw new AccountingError('credentials');token=result.access_token;tokens.set(key,{token,expires:now()+Math.min(result.expires_in,3600)*1000});
  }
  }
  const call=async(path,{method='GET',body,query={}}={})=>{
   if(custodyAccess){await guard();if(method==='POST')await beforeCreate();}
   const url=new URL(connection.api_domain+'/books/v3'+path);url.search=new URLSearchParams({organization_id:connection.organization_id,...query}).toString();
   try{return await request(url.href,{method,headers:{Authorization:'Zoho-oauthtoken '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})},method==='POST'&&path==='/invoices');}catch(error){if(error.code==='credentials')tokens.delete(key);throw error;}
  };
  const org=(await call('/organizations/'+connection.organization_id)).organization;
  if(!org||String(org.organization_id)!==connection.organization_id||org.currency_code!=='ZAR'||org.is_org_active===false)throw new AccountingError('organization');
  return call;
 }
 return {async sync(claim){
  const {invoice,connection,mode}=claim;let posted=false;
  try{
   if(invoice.snapshot.tax_snapshot?.enabled)throw new AccountingError('vat_not_supported');
   const call=await context(connection);
   const contact=(await call('/contacts/'+invoice.external_customer_id)).contact;
   // This is an explicit customer binding, never an email/name-only auto-link.
   if(!contact||String(contact.contact_id)!==invoice.external_customer_id||contact.status!=='active'||contact.currency_code!=='ZAR'||contact.contact_name?.trim()!==invoice.snapshot.customer_snapshot.name.trim())throw new AccountingError('customer');
   let external;
   if(invoice.external_invoice_id)external=(await call('/invoices/'+invoice.external_invoice_id)).invoice;
   else{
    const found=[];let complete=false;
    for(let page=1;page<=10;page++){
     const result=await call('/invoices',{query:{reference_number:'FaraiOS:'+invoice.id,page:String(page),per_page:'200'}});
     if(!Array.isArray(result.invoices)||typeof result.page_context?.has_more_page!=='boolean')throw new AccountingError('provider_unavailable');
     for(const row of result.invoices)if(row.reference_number==='FaraiOS:'+invoice.id)found.push(row);
     if(!result.page_context.has_more_page){complete=true;break;}
    }
    if(!complete)throw new AccountingError('provider_unavailable');if(found.length>1)throw new AccountingError('duplicates',{uncertain:true});
    if(found.length===1){if(!validId(found[0].invoice_id))throw new AccountingError('mismatch');external=(await call('/invoices/'+found[0].invoice_id)).invoice;}
    else if(mode==='reconcile')throw new AccountingError('unknown_outcome',{uncertain:true});
    else{
     // No automatic replay after dispatch, even when HTTP rejects or the process dies.
     posted=true;
     const created=await call('/invoices',{method:'POST',query:{send:'false'},body:{customer_id:invoice.external_customer_id,reference_number:'FaraiOS:'+invoice.id,date:invoice.snapshot.local_start.slice(0,10),contact_persons:[],line_items:invoice.snapshot.price_lines.filter(l=>l.quantity>0).map(l=>({name:l.name,quantity:l.quantity,rate:l.rate_cents/100,unit:l.unit_label})),notes:'FaraiOS staging draft — review in the office before issuing.'}});
     if(!validId(created.invoice?.invoice_id))throw new AccountingError('unknown_outcome',{uncertain:true});
     external=(await call('/invoices/'+created.invoice.invoice_id)).invoice;
    }
   }
   return {outcome:'matched',error_code:'',receipt:verifiedReceipt(invoice,connection,external)};
  }catch(error){const e=error instanceof AccountingError?error:new AccountingError('provider_unavailable');return {outcome:posted||e.uncertain||mode==='reconcile'||e.code==='mismatch'||e.code==='duplicates'?'review_required':'failed',error_code:posted&&e.code==='provider_unavailable'?'unknown_outcome':e.code,receipt:null};}
 }};
}
