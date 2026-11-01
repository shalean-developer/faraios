// Inactive T20 staging primitives. No network, storage, route or financial I/O.
import {createHmac,timingSafeEqual} from 'node:crypto';
const deny=()=>new Error('payment_verification_rejected');
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const ref=v=>typeof v==='string'&&/^[A-Za-z0-9._=-]{1,100}$/.test(v);
const identifier=v=>typeof v==='string'&&/^[1-9][0-9]{0,29}$/.test(v);
function binding(v){
 if(!v||!uuid(v.businessId)||v.environment!=='staging'||!identifier(v.accountId)||!ref(v.reference)||!Number.isSafeInteger(v.amountCents)||v.amountCents<=0||v.currency!=='ZAR')throw deny();
}
function transaction(intent,data){
 binding(intent);
 const id=Number.isSafeInteger(data?.id)&&data.id>0?String(data.id):data?.id;
 if(!identifier(id)||data.domain!=='test'||data.reference!==intent.reference||data.amount!==intent.amountCents||data.currency!==intent.currency||!['success','failed','abandoned','pending','ongoing','processing','queued'].includes(data.status))throw deny();
 return Object.freeze({businessId:intent.businessId,environment:'staging',accountId:intent.accountId,reference:intent.reference,transactionId:id,amountCents:intent.amountCents,currency:intent.currency,status:data.status});
}
// secretKey and account binding must come from a trusted backend account lookup.
// Never choose an account/business using webhook metadata or a browser claim.
export function verifyPaystackTestWebhook({rawBody,signature,secretKey,account,intent}){
 try{
  binding(intent);
  if(!account||account.businessId!==intent.businessId||account.accountId!==intent.accountId||account.environment!=='staging'||!Buffer.isBuffer(secretKey)||secretKey.length<16||!Buffer.isBuffer(rawBody)||rawBody.length<2||rawBody.length>262144||typeof signature!=='string'||!/^[0-9a-f]{128}$/i.test(signature))throw deny();
  const expected=createHmac('sha512',secretKey).update(rawBody).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw deny();
  const event=JSON.parse(rawBody.toString('utf8'));
  if(event.event!=='charge.success'||event.data?.status!=='success')throw deny();
  return transaction(intent,event.data);
 }catch{throw deny();}
}
// response must be from an authenticated server verification request using the
// same independently pinned account; browser callback payloads are not accepted.
export function verifyPaystackTestResponse({response,account,intent}){
 try{
  binding(intent);
  if(!account||account.businessId!==intent.businessId||account.accountId!==intent.accountId||account.environment!=='staging'||response?.status!==true)throw deny();
  return transaction(intent,response.data);
 }catch{throw deny();}
}
// Pure transition proposal only. A future SQL store MUST compare/version and
// commit observation + payment once in one transaction under tenant scope.
export function proposePaymentTransition(intent,current,observation){
 try{
  binding(intent);
  if(!observation||['businessId','environment','accountId','reference','amountCents','currency'].some(k=>observation[k]!==intent[k])||!identifier(observation.transactionId)||!['success','failed','abandoned','pending','ongoing','processing','queued'].includes(observation.status))throw deny();
  if(current&&(!['pending','failed','paid'].includes(current.status)||!identifier(current.transactionId)||current.transactionId!==observation.transactionId||['businessId','environment','accountId','reference','amountCents','currency'].some(k=>current[k]!==intent[k])))throw deny();
  const status=observation.status==='success'?'paid':['failed','abandoned'].includes(observation.status)?'failed':'pending';
  if(current?.status==='paid'||current?.status==='failed'&&status==='pending'||current?.status===status)return Object.freeze({changed:false,status:current.status});
  return Object.freeze({changed:true,status,record:Object.freeze({...observation,status})});
 }catch{throw deny();}
}
