import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createPaystackTestProvider} from '../src/t20-paystack-test-provider.js';
const intent={businessId:'11111111-1111-4111-8111-111111111111',accountId:'101',environment:'staging',reference:'FOS-22222222-2222-4222-8222-222222222222',amountCents:10000,currency:'ZAR'};
const account={...intent},secretKey='sk_test_'+ 'synthetic'.repeat(5);
const transaction=(status='success')=>({id:123,domain:'test',reference:intent.reference,amount:10000,currency:'ZAR',status,customer:{email:'synthetic@example.test'},authorization:{card:'not-returned'}});
const response=data=>new Response(JSON.stringify({status:true,data}));
const provider=fetchImpl=>createPaystackTestProvider({account,secretKey,fetchImpl});
test('initialize uses saved TEST amount/reference and fixed card-only checkout, strips access code',async()=>{
 let request;
 const p=provider(async(url,options)=>{request={url,options};return response({reference:intent.reference,authorization_url:'https://checkout.paystack.com/synthetic',access_code:'never-return'});});
 await assert.rejects(p.initialize({intent,email:'synthetic@example.test'}),/payment_provider_rejected/);
 const result=await p.initialize({intent,email:'synthetic@example.test',approved:true});
 assert.equal(request.url,'https://api.paystack.co/transaction/initialize');assert.equal(request.options.redirect,'error');
 assert.deepEqual(JSON.parse(request.options.body),{reference:intent.reference,amount:'10000',currency:'ZAR',email:'synthetic@example.test',channels:['card'],callback_url:'https://staging.faraios.com/payments/return'});
 assert.deepEqual(Object.keys(result),['reference','authorizationUrl']);
});
test('foreign business, account, environment and invalid saved amount cause zero network calls',async()=>{
 let calls=0;const p=provider(async()=>{calls++;throw Error();});
 for(const patch of [{businessId:'33333333-3333-4333-8333-333333333333'},{accountId:'102'},{environment:'production'},{amountCents:1.5},{reference:'browser-reference'}])await assert.rejects(p.verify({...intent,...patch}),/payment_provider_rejected/);
 assert.equal(calls,0);
 assert.throws(()=>createPaystackTestProvider({account,secretKey:'sk_live_'+ 'synthetic'.repeat(5)}),/payment_provider_rejected/);
 for(const patch of [{accountId:'0'},{accountId:'01'},{businessId:'browser-business'}])assert.throws(()=>createPaystackTestProvider({account:{...account,...patch},secretKey}),/payment_provider_rejected/);
});
test('verification reads exact reference and returns sanitized success/failure/pending observations',async()=>{
 for(const status of ['success','failed','abandoned','pending']){
  const p=provider(async(url,options)=>{assert.equal(url,'https://api.paystack.co/transaction/verify/'+intent.reference);assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+secretKey);return response(transaction(status));});
  const result=await p.verify(intent);assert.equal(result.status,status);assert.equal(result.transactionId,'123');assert.equal(result.customer,undefined);assert.equal(result.authorization,undefined);
 }
});
test('verification rejects provider error, live domain and amount/reference mismatch',async()=>{
 for(const data of [{...transaction(),domain:'live'},{...transaction(),amount:999},{...transaction(),reference:'other'}])await assert.rejects(provider(async()=>response(data)).verify(intent),/payment_provider_rejected/);
 await assert.rejects(provider(async()=>new Response(JSON.stringify({status:false,message:secretKey}),{status:401})).verify(intent),e=>e.message==='payment_provider_rejected');
});
test('uncertain initialize is never retried and never changes reference',async()=>{
 let calls=0;const p=provider(async()=>{calls++;throw Error(secretKey);});
 await assert.rejects(p.initialize({intent,email:'synthetic@example.test',approved:true}),e=>e.message==='payment_initialize_outcome_unknown');assert.equal(calls,1);
});
test('redirect, oversized body, invalid JSON and foreign checkout URL fail closed',async()=>{
 for(const fetcher of [async()=>({redirected:true}),async()=>new Response('x'.repeat(262145)),async()=>new Response('invalid')])await assert.rejects(provider(fetcher).verify(intent),/payment_provider_rejected/);
 for(const url of ['https://evil.example.test/path','https://checkout.paystack.com.evil.example.test/path','https://user@checkout.paystack.com/path','https://checkout.paystack.com/path?secret=synthetic'])await assert.rejects(provider(async()=>response({reference:intent.reference,authorization_url:url})).initialize({intent,email:'synthetic@example.test',approved:true}),/payment_initialize_outcome_unknown/);
});
test('signature must pass before network; another business key cannot authenticate event',async()=>{
 const rawBody=Buffer.from(JSON.stringify({event:'charge.success',data:transaction()}));let calls=0;
 const p=provider(async()=>{calls++;return response(transaction());});
 const bad=createHmac('sha512','other-synthetic-secret').update(rawBody).digest('hex');
 await assert.rejects(p.verifyWebhook({rawBody,signature:bad,intent}),/payment_provider_rejected/);assert.equal(calls,0);
 const signature=createHmac('sha512',secretKey).update(rawBody).digest('hex');
 assert.equal((await p.verifyWebhook({rawBody,signature,intent})).status,'success');assert.equal(calls,1);
});
test('signed webhook still requires matching authenticated provider transaction',async()=>{
 const rawBody=Buffer.from(JSON.stringify({event:'charge.success',data:transaction()})),signature=createHmac('sha512',secretKey).update(rawBody).digest('hex');
 for(const data of [{...transaction(),id:124},transaction('failed')])await assert.rejects(provider(async()=>response(data)).verifyWebhook({rawBody,signature,intent}),/payment_provider_rejected/);
});
