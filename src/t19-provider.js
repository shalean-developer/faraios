// Milestone A only: no sync, lists, financial writes, refresh or fallback paths.
import {providerCents} from './zoho-books.js';
const API='https://www.zohoapis.com', ACCOUNTS='https://accounts.zoho.com';
const id=value=>typeof value==='string'&&/^[0-9]{1,30}$/.test(value);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=4096&&!/[\r\n\0]/.test(value);
export class T19Error extends Error { constructor(code){super(code);this.name='T19Error';this.code=code;} }
const fail=code=>{throw new T19Error(code);};

async function request(url,options,fetchImpl,{books=false}={}){
 const controller=new AbortController();
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new T19Error('provider_unavailable'));},12000);});
 const work=(async()=>{
  let reader;
  try{
   const response=await fetchImpl(url,{...options,redirect:'error',signal:controller.signal});
   if(response.redirected)fail('provider_unavailable');
   if(!response.ok){
    try{await response.body?.cancel();}catch{}
    fail(response.status===401?'credentials':response.status===403?'permissions':response.status===429?'rate_limited':'provider_unavailable');
   }
   if(!response.body?.getReader)fail('provider_unavailable');
   const length=response.headers?.get('content-length');
   if(length!==null&&length!==undefined&&(!/^\d+$/.test(length)||Number(length)>2_000_000))fail('provider_unavailable');
   reader=response.body.getReader();let bytes=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000){controller.abort();try{await reader.cancel();}catch{}fail('provider_unavailable');}chunks.push(value);}
   const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   if(!result||typeof result!=='object'||Array.isArray(result))fail('provider_unavailable');
   if(books&&result.code!==0)fail('provider_unavailable');
   return result;
  }catch(error){if(error instanceof T19Error)throw error;fail('provider_unavailable');}
  finally{controller.abort();try{reader?.releaseLock();}catch{}}
 })();
 try{return await Promise.race([work,timeout]);}finally{clearTimeout(timer);}
}

export async function exchangeCode({clientId,clientSecret,code,redirectUri,fetchImpl=globalThis.fetch,now=()=>Date.now()}){
 if(![clientId,clientSecret,code].every(text)||typeof fetchImpl!=='function')fail('credentials');
 let redirect;try{redirect=new URL(redirectUri);}catch{fail('credentials');}
 if(redirect.origin!=='http://127.0.0.1:3102'||redirect.username||redirect.password||redirect.search||redirect.hash)fail('credentials');
 const body=new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirect.href});
 const value=await request(ACCOUNTS+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body},fetchImpl);
 if(!text(value.access_token)||!text(value.refresh_token)||value.api_domain!==API||!Number.isFinite(value.expires_in)||value.expires_in<=0||value.expires_in>3600||value.token_type!=='Bearer')fail('credentials');
 const current=now();if(!Number.isSafeInteger(current)||current<0)fail('credentials');
 return {accessToken:value.access_token,refreshToken:value.refresh_token,expiresAt:current+value.expires_in*1000};
}

export async function verifyInvoice({binding,fixture,accessToken,fetchImpl=globalThis.fetch,guard}){
 if(!binding||binding.apiDomain!==API||!id(binding.organizationId)||!/^[A-Z]{3}$/.test(binding.currency??''))fail('organization');
 if(!fixture||!id(fixture.invoiceId)||!id(fixture.customerId)||![fixture.number,fixture.reference,fixture.status].every(text)||!Number.isSafeInteger(fixture.totalCents)||fixture.totalCents<0)fail('mismatch');
 if(!text(accessToken)||typeof fetchImpl!=='function'||typeof guard!=='function')fail('credentials');
 // Capture reviewed expectations once; caller mutation during asynchronous work cannot retarget requests.
 const expected={organizationId:binding.organizationId,currency:binding.currency,invoiceId:fixture.invoiceId,customerId:fixture.customerId,number:fixture.number,reference:fixture.reference,status:fixture.status,totalCents:fixture.totalCents};
 const call=async path=>{
  await guard();
  const value=await request(API+'/books/v3'+path+'?organization_id='+expected.organizationId,{method:'GET',headers:{Authorization:'Zoho-oauthtoken '+accessToken}},fetchImpl,{books:true});
  await guard();return value;
 };
 const profile=(await call('/organizations/'+expected.organizationId)).organization;
 if(!profile||String(profile.organization_id)!==expected.organizationId||profile.is_org_active!==true||profile.currency_code!==expected.currency)fail('organization');
 const invoice=(await call('/invoices/'+expected.invoiceId)).invoice;
 let totalCents;try{totalCents=providerCents(invoice?.total);}catch{fail('mismatch');}
 if(!invoice||String(invoice.invoice_id)!==expected.invoiceId||invoice.invoice_number!==expected.number||invoice.reference_number!==expected.reference||String(invoice.customer_id)!==expected.customerId||invoice.currency_code!==expected.currency||invoice.status!==expected.status||totalCents!==expected.totalCents||Object.hasOwn(invoice,'organization_id')&&String(invoice.organization_id)!==expected.organizationId)fail('mismatch');
 return {profile:{organizationId:expected.organizationId,currency:profile.currency_code,active:true},invoice:{invoiceId:expected.invoiceId,number:invoice.invoice_number,reference:invoice.reference_number,customerId:expected.customerId,currency:invoice.currency_code,status:invoice.status,totalCents},ownershipEvidence:'verified_profile_pinned_endpoint_and_independent_fixture',requestCount:2};
}


