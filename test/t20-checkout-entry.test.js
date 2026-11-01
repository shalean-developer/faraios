import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createPaymentHandler} from '../src/t20-payment-handler.js';
const business='11111111-1111-4111-8111-111111111111',invoice='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
async function run({method='GET',body='',owner=true,authorized=true,extra='',result={id:request,reference:'FOS-'+request,amountCents:10000,currency:'ZAR',status:'pending'}}={}){
 const calls=[],req=Readable.from([Buffer.from(body+extra)]);Object.assign(req,{url:'/payments/'+business+'/intents',method,headers:{host:'staging.faraios.com',origin:'https://staging.faraios.com',accept:'text/html',cookie:'sid=synthetic','content-type':'application/x-www-form-urlencoded'}});
 const res={writeHead(status,headers){Object.assign(this,{status,headers});},end(body){this.body=body;}};
 const auth={read:async()=>({}),withOwner:async(s,b,fn)=>{calls.push('owner');assert.equal(b,business);if(!owner)throw Error();return fn();},withAccountingSession:async(s,fn)=>fn({rpc:async(name,args)=>{calls.push(args);return authorized?{data:result}:{error:{}};}})};
 const controller={initialize:()=>{throw Error('must not initialize');}};
 await createPaymentHandler({controller})({req,res,auth,cookieName:'sid'});return {res,calls};
}
test('owner entry GET renders saved-invoice form without creating intent or calling provider',async()=>{
 const {res,calls}=await run();assert.equal(res.status,200);assert.deepEqual(calls,['owner']);assert.match(res.body,/Prepare TEST checkout/);assert.match(res.body,/name="invoiceId"/);assert.equal(res.headers['Referrer-Policy'],'same-origin');
 assert.equal((await run({owner:false})).res.status,409);
});
test('browser prepare POST uses saved invoice RPC and renders exact saved amount without provider dispatch',async()=>{
 const body='invoiceId='+invoice+'&requestId='+request;
 const good=await run({method:'POST',body});assert.equal(good.res.status,200);assert.deepEqual(good.calls,[{action:'create',input:{businessId:business,invoiceId:invoice,requestId:request}}]);assert.match(good.res.body,/Saved amount: R 100.00/);assert.match(good.res.body,new RegExp('/intents/'+request+'/initialize'));assert.match(good.res.body,/synthetic@example.com/);
 for(const options of [{authorized:false},{extra:'&amount=1'},{extra:'&accountId=456'},{extra:'&requestId='+request},{result:{id:request,reference:'<script>',amountCents:10000,currency:'ZAR'}}])assert.equal((await run({method:'POST',body,...options})).res.status,409);
});
