import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {createPaymentController} from '../src/t20-payment-controller.js';
import {createPaymentHandler} from '../src/t20-payment-handler.js';
const b='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',reference='FOS-'+id;
const account={businessId:b,accountId:'123',environment:'staging',domain:'test',enabled:true,secretKey:'sk_test_'+'synthetic'.repeat(5)};
const intent={businessId:b,accountId:'123',environment:'staging',intentId:id,reference,amountCents:10000,currency:'ZAR',status:'pending'};
const data={id:100,reference,amount:10000,currency:'ZAR',domain:'test',status:'success'};
function fixture({failure=false,lostFinish=false}={}){
 let claim,posts=0,published=0,lookups=0,failPublication=false;
 const backend={async rpc(action,input){
  assert.equal(input.businessId,b);assert.equal(input.accountId,'123');
  if(action==='lookup'){lookups++;return {...intent};}
  if(action==='claim'){if(claim)return {dispatch:false,state:claim.state,authorizationUrl:claim.authorizationUrl};claim={state:'claimed',nonce:input.nonce};return {dispatch:true,state:'claimed'};}
  if(action==='finish'){if(lostFinish)throw Error('synthetic interruption');assert.equal(input.nonce,claim.nonce);claim.state=input.authorizationUrl?'ready':'unknown';claim.authorizationUrl=input.authorizationUrl;return {...claim};}
  if(action==='publish'){if(failPublication)throw Error();published++;return {changed:published===1,status:'paid'};}
  throw Error();
 }};
 const controller=createPaymentController({accounts:[account],backend,fetchImpl:async(url,opts)=>{
  if(opts.method==='POST'){posts++;if(failure)throw Error();return new Response(JSON.stringify({status:true,data:{reference,authorization_url:'https://checkout.paystack.com/synthetic'}}));}
  return new Response(JSON.stringify({status:true,data}));
 }});
 return {controller,counts:()=>({posts,published,lookups}),failPublication:()=>{failPublication=true;}};
}
test('controller claims before POST, repeated checkout returns existing result without another POST',async()=>{
 const f=fixture(),input={businessId:b,reference,email:'synthetic@example.com',approved:true};
 const first=await f.controller.initialize(input);assert.equal(first.state,'ready');await f.controller.initialize(input);assert.equal(f.counts().posts,1);
 await assert.rejects(f.controller.initialize({...input,businessId:id}));assert.equal(f.counts().posts,1);
});
test('interrupted finish and unknown initialize preserve claim and never automatically dispatch again',async()=>{
 for(const options of [{failure:true},{lostFinish:true}]){
  const f=fixture(options),input={businessId:b,reference,email:'synthetic@example.com',approved:true};
  await f.controller.initialize(input).catch(()=>{});const retry=await f.controller.initialize(input);assert.ok(['unknown','claimed'].includes(retry.state));assert.equal(f.counts().posts,1);
 }
});
test('webhook authenticates before lookup, verifies and propagates failed durable publication',async()=>{
 const f=fixture(),rawBody=Buffer.from(JSON.stringify({event:'charge.success',data})),signature=createHmac('sha512',account.secretKey).update(rawBody).digest('hex');
 await assert.rejects(f.controller.webhook({businessId:b,rawBody,signature:'0'.repeat(128)}));assert.equal(f.counts().lookups,0);
 assert.equal((await f.controller.webhook({businessId:b,rawBody,signature})).changed,true);
 assert.equal((await f.controller.webhook({businessId:b,rawBody,signature})).changed,false);
 f.failPublication();await assert.rejects(f.controller.webhook({businessId:b,rawBody,signature}));
});
test('duplicate credentials or disabled configuration cannot compose a controller',()=>{
 assert.throws(()=>createPaymentController({accounts:[account,{...account,businessId:id,accountId:'456'}],backend:{rpc(){}}}));
 assert.throws(()=>createPaymentController({accounts:[{...account,enabled:false}],backend:{rpc(){}}}));
});
async function request({path='/payments/'+b+'/intents/'+id+'/initialize',method='POST',body='email=synthetic%40example.com&confirm=yes',headers={},authorized=true,publicationFails=false}={}){
 const calls=[];
 const req=Readable.from([Buffer.from(body)]);req.url=path;req.method=method;req.headers={host:'staging.faraios.com',origin:'https://staging.faraios.com','content-type':'application/x-www-form-urlencoded',cookie:'session=synthetic',...headers};
 const res={writeHead(code,headers){this.code=code;this.headers=headers;},end(body){this.body=JSON.parse(body);}};
 const auth={read:async()=>authorized?{userId:id}:null,withAccountingSession:async(sid,fn)=>fn({rpc:async(name,args)=>{calls.push(args);return authorized?{data:args.action==='status'?{reference}:{id},error:null}:{error:{}};}})};
 const controller={initialize:async input=>{calls.push(input);return {state:'ready',authorizationUrl:'https://checkout.paystack.com/synthetic'};},reconcile:async()=>({status:'paid'}),webhook:async()=>{if(publicationFails)throw Error();return {changed:false};}};
 await createPaymentHandler({controller})({req,res,auth,cookieName:'session'});return {res,calls};
}
test('routes authorize status in database before checkout and reject hostile origin/extra fields/live email',async()=>{
 const good=await request();assert.equal(good.res.code,200);assert.equal(good.calls[0].action,'status');assert.equal(good.calls[1].approved,true);assert.equal(good.res.headers['Cache-Control'],'no-store');
 for(const options of [{headers:{origin:'https://evil.example.test'}},{body:'email=real%40mail.example.org&confirm=yes'},{body:'email=synthetic%40example.com&confirm=yes&amount=1'},{headers:{cookie:'session=a;session=b'}}])assert.notEqual((await request(options)).res.code,200);
 assert.equal((await request({authorized:false})).res.code,401);
 assert.equal((await request({headers:{host:'faraios.com'}})).res.code,404);
});
test('webhook returns success only after publication, retryable error on failure; oversized body rejected',async()=>{
 const options={path:'/payments/'+b+'/webhook',headers:{'content-type':'application/json'},body:'{}'};
 assert.equal((await request(options)).res.code,200);assert.equal((await request({...options,publicationFails:true})).res.code,409);
 assert.equal((await request({...options,body:'x'.repeat(262145)})).res.code,409);
});
test('intent creation forwards only saved invoice/request identities and status does not initialize',async()=>{
 const created=await request({path:'/payments/'+b+'/intents',body:'invoiceId='+id+'&requestId='+id});assert.equal(created.res.code,200);assert.equal(created.calls.length,1);assert.equal(created.calls[0].action,'create');
 const status=await request({path:'/payments/'+b+'/intents/'+id,method:'GET',body:''});assert.equal(status.res.code,200);assert.equal(status.calls.length,1);
});
