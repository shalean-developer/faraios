// Backend-only, unmounted T20 adapter. Import performs no file/network I/O.
import {verifyPaystackTestResponse,verifyPaystackTestWebhook} from './t20-payment-verification.js';
const rejected=()=>new Error('payment_provider_rejected');
const unknown=()=>new Error('payment_initialize_outcome_unknown');
export function createPaystackTestProvider({account,secretKey,fetchImpl=globalThis.fetch}){
 if(!account||!/^([0-9a-f]{8})(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(account.businessId)||account.environment!=='staging'||!/^[1-9][0-9]{0,29}$/.test(account.accountId)||typeof secretKey!=='string'||!/^sk_test_[A-Za-z0-9]{32,}$/.test(secretKey)||typeof fetchImpl!=='function')throw rejected();
 const pinned=Object.freeze({businessId:account.businessId,accountId:account.accountId,environment:'staging'});
 const key=Buffer.from(secretKey);
 function check(intent){
  if(!intent||intent.businessId!==pinned.businessId||intent.accountId!==pinned.accountId||intent.environment!=='staging'||intent.currency!=='ZAR'||!Number.isSafeInteger(intent.amountCents)||intent.amountCents<=0||!/^FOS-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(intent.reference))throw rejected();
 }
 async function request(path,body){
  const res=await fetchImpl('https://api.paystack.co'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key.toString(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
  if(res.redirected||!res.body)throw rejected();
  const reader=res.body.getReader(),chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw rejected();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!res.ok||data?.status!==true)throw rejected();return data;
 }
 async function verify(intent){
  try{check(intent);return verifyPaystackTestResponse({intent,account:pinned,response:await request('/transaction/verify/'+encodeURIComponent(intent.reference))});}catch{throw rejected();}
 }
 return Object.freeze({
  // Caller must be a trusted, owner-authorized controller using an already saved
  // intent. Never expose this method as an unguarded browser command.
  async initialize({intent,email,approved=false}){
   check(intent);
   if(approved!==true||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw rejected();
   try{
    const result=await request('/transaction/initialize',{reference:intent.reference,amount:String(intent.amountCents),currency:'ZAR',email,channels:['card'],callback_url:'https://staging.faraios.com/payments/return'});
    const d=result.data,u=new URL(d?.authorization_url);
    if(d.reference!==intent.reference||u.origin!=='https://checkout.paystack.com'||u.username||u.password||u.search||u.hash||!/^\/[A-Za-z0-9_-]+$/.test(u.pathname))throw rejected();
    return Object.freeze({reference:intent.reference,authorizationUrl:u.href});
   }catch{throw unknown();} // Never automatically repeat POST or mint a new ref.
  },
  verify,
  async verifyWebhook({rawBody,signature,intent}){
   try{
    check(intent);
    const signed=verifyPaystackTestWebhook({rawBody,signature,intent,account:pinned,secretKey:key});
    const observed=await verify(intent);
    if(observed.transactionId!==signed.transactionId||observed.status!=='success')throw rejected();
    return observed;
   }catch{throw rejected();}
  }
 });
}
