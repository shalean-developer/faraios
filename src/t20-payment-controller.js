// Unmounted backend composition. All account/provider/store inputs are trusted
// dependencies; no browser metadata chooses a key or an account enrollment.
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {createPaystackTestProvider} from './t20-paystack-test-provider.js';
const denied=()=>new Error('payment_operation_rejected');
export function createPaymentController({accounts,backend,fetchImpl}){
 if(!Array.isArray(accounts)||!backend||typeof backend.rpc!=='function')throw denied();
 const map=new Map(),keys=new Set(),ids=new Set();
 for(const a of accounts){
  if(a.enabled!==true||a.environment!=='staging'||a.domain!=='test'||map.has(a.businessId)||ids.has(a.accountId)||keys.has(a.secretKey))throw denied();
  const frozen=Object.freeze({...a});map.set(a.businessId,{account:frozen,provider:createPaystackTestProvider({account:frozen,secretKey:a.secretKey,fetchImpl})});keys.add(a.secretKey);ids.add(a.accountId);
 }
 function scope(businessId){const a=map.get(businessId);if(!a)throw denied();return a;}
 async function lookup(businessId,reference){const a=scope(businessId),v=await backend.rpc('lookup',{businessId,accountId:a.account.accountId,reference});if(!v||v.businessId!==businessId||v.accountId!==a.account.accountId||v.reference!==reference||!v.intentId)throw denied();return v;}
 async function publish(v,o){return backend.rpc('publish',{businessId:v.businessId,accountId:v.accountId,intentId:v.intentId,transactionId:o.transactionId,status:o.status,amountCents:o.amountCents,currency:o.currency});}
 return Object.freeze({
  async initialize({businessId,reference,email,approved}){
   if(approved!==true)throw denied();
   const a=scope(businessId),v=await lookup(businessId,reference),nonce=randomUUID(),input={businessId,accountId:a.account.accountId,intentId:v.intentId,nonce};
   const claim=await backend.rpc('claim',input);
   if(claim.dispatch!==true)return {state:claim.state,authorizationUrl:claim.authorizationUrl??null};
   let result;
   try{result=await a.provider.initialize({intent:v,email,approved:true});}
   catch{await backend.rpc('finish',{...input,authorizationUrl:null});return {state:'unknown',authorizationUrl:null};}
   // If finish/response is interrupted, committed claim remains. Never POST again.
   return backend.rpc('finish',{...input,authorizationUrl:result.authorizationUrl});
  },
  async reconcile({businessId,reference}){const a=scope(businessId),v=await lookup(businessId,reference);return publish(v,await a.provider.verify(v));},
  async webhook({businessId,rawBody,signature}){
   const a=scope(businessId);
   if(!Buffer.isBuffer(rawBody)||rawBody.length>262144||typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature))throw denied();
   const mac=createHmac('sha512',a.account.secretKey).update(rawBody).digest();
   if(!timingSafeEqual(mac,Buffer.from(signature,'hex')))throw denied();
   let event;try{event=JSON.parse(rawBody.toString('utf8'));}catch{throw denied();}
   if(event.event!=='charge.success'||typeof event.data?.reference!=='string')throw denied();
   const v=await lookup(businessId,event.data.reference);
   return publish(v,await a.provider.verifyWebhook({rawBody,signature,intent:v}));
  }
 });
}
