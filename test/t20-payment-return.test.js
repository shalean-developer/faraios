import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createPaymentHandler} from '../src/t20-payment-handler.js';
import {createPaymentController} from '../src/t20-payment-controller.js';
const b='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',reference='FOS-'+id;
async function run({method='GET',path='/payments/return?reference='+reference+'&trxref='+reference,body='',origin='https://staging.faraios.com',signedIn=true,allowed=true,verifyFails=false}={}){
 const calls=[];const req=Readable.from([Buffer.from(body)]);Object.assign(req,{url:path,method,headers:{host:'staging.faraios.com',origin,'content-type':'application/x-www-form-urlencoded',cookie:'session=synthetic'}});
 const res={writeHead(code,headers){Object.assign(this,{code,headers});},end(body){this.body=body;}};
 const auth={read:async()=>signedIn?{}:null,withAccountingSession:async(sid,fn)=>fn({rpc:async()=>{calls.push('authorize');return allowed?{data:{reference,status:'pending'}}:{error:{}};}})};
 const controller={resolveReference:async()=>{calls.push('lookup');return {businessId:b,intentId:id};},reconcile:async()=>{calls.push('verify');if(verifyFails)throw Error();return {status:'paid'};}};
 await createPaymentHandler({controller})({req,res,auth,cookieName:'session'});return {res,calls};
}
test('checkout return GET authorizes saved reference and never verifies or credits from redirect',async()=>{
 const {res,calls}=await run();assert.equal(res.code,200);assert.deepEqual(calls,['lookup','authorize']);assert.match(res.body,/Saved payment status: pending/);assert.match(res.body,/Verify TEST payment/);assert.equal(res.headers['Referrer-Policy'],'same-origin');assert.equal(res.headers['Cache-Control'],'no-store');
});
test('return verification POST requires actual record permission before provider verification',async()=>{
 const input={method:'POST',path:'/payments/return',body:'reference='+reference};
 const good=await run(input);assert.equal(good.res.code,200);assert.deepEqual(good.calls,['lookup','authorize','verify']);assert.match(good.res.body,/status: paid/);
 const denied=await run({...input,allowed:false});assert.equal(denied.res.code,409);assert.ok(!denied.calls.includes('verify'));
 assert.equal((await run({...input,verifyFails:true})).res.code,409);
});
test('callback rejects anonymous, forged, duplicated and mismatched parameters without verification',async()=>{
 for(const opts of [{signedIn:false},{path:'/payments/return?reference='+reference+'&trxref=wrong'},{path:'/payments/return?reference='+reference+'&reference='+reference},{path:'/payments/return?reference='+reference+'&status=success'},{path:'/payments/return?reference=%3Cscript%3E'},{method:'POST',path:'/payments/return',body:'reference='+reference,origin:'https://evil.example.test'},{method:'POST',path:'/payments/return',body:'reference='+reference+'&amount=1'}]){
  const {res,calls}=await run(opts);assert.notEqual(res.code,200);assert.ok(!calls.includes('verify'));
 }
});
test('reference resolution accepts only one exact trusted account record and rejects ambiguity or mismatch',async()=>{
 const a={businessId:b,accountId:'123',environment:'staging',domain:'test',enabled:true,secretKey:'sk_test_'+'synthetic'.repeat(5)};
 const a2={...a,businessId:id,accountId:'456',secretKey:'sk_test_'+'otherfake'.repeat(5)};
 let mode='one';let calls=0;
 const controller=createPaymentController({accounts:[a,a2],backend:{rpc:async(action,input)=>{calls++;if(mode==='missing')return null;if(mode==='one'&&input.accountId==='456')return null;return {businessId:mode==='mismatch'?id:input.businessId,accountId:input.accountId,reference,intentId:id};}}});
 assert.deepEqual(await controller.resolveReference(reference),{businessId:b,intentId:id,reference});
 for(mode of ['missing','mismatch','ambiguous'])await assert.rejects(controller.resolveReference(reference));
 const before=calls;await assert.rejects(controller.resolveReference('<script>'));assert.equal(calls,before);
});
