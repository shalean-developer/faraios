import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyPaystackTestWebhook as webhook,verifyPaystackTestResponse as verified,proposePaymentTransition as apply} from '../src/t20-payment-verification.js';
const intent={businessId:'00000000-0000-4000-8000-000000000001',environment:'staging',accountId:'123',reference:'T20-SYNTHETIC-A',amountCents:10000,currency:'ZAR'};
const account={businessId:intent.businessId,environment:'staging',accountId:'123'},secretKey=Buffer.from('SYNTHETIC-ONLY-NOT-A-PROVIDER-KEY');
const data=(status='success')=>({id:12345,domain:'test',reference:intent.reference,amount:10000,currency:'ZAR',status});
const observe=(status='success',extra={})=>verified({intent,account,response:{status:true,data:{...data(status),...extra}}});
function signed(event={event:'charge.success',data:data()}){const rawBody=Buffer.from(JSON.stringify(event));return {rawBody,signature:createHmac('sha512',secretKey).update(rawBody).digest('hex'),secretKey,account,intent};}
test('signed success is bound to intended business account, amount, reference and currency',()=>{const o=webhook(signed());assert.equal(o.transactionId,'12345');assert.equal(apply(intent,null,o).status,'paid');});
test('raw byte signature rejects whitespace alteration, wrong key and malformed signature',()=>{
 const s=signed();for(const change of [{rawBody:Buffer.concat([s.rawBody,Buffer.from(' ')])},{secretKey:Buffer.from('OTHER-SYNTHETIC-ACCOUNT-KEY')},{signature:'00'},{signature:'z'.repeat(128)}])assert.throws(()=>webhook({...s,...change}),/payment_verification_rejected/);
});
test('oversized or invalid signed JSON and invented failed-charge webhook are rejected',()=>{
 assert.throws(()=>webhook({...signed(),rawBody:Buffer.alloc(262145)}));assert.throws(()=>webhook(signed({event:'charge.failed',data:data('failed')})));
 const rawBody=Buffer.from('{bad');assert.throws(()=>webhook({...signed(),rawBody,signature:createHmac('sha512',secretKey).update(rawBody).digest('hex')}));
});
test('success response API flag is distinct from transaction outcome',()=>{assert.equal(apply(intent,null,observe('failed')).status,'failed');assert.equal(apply(intent,null,observe('abandoned')).status,'failed');assert.throws(()=>verified({intent,account,response:{status:false,data:data()}}));});
test('pending outcomes never produce a paid proposal',()=>{for(const s of ['pending','ongoing','processing','queued'])assert.equal(apply(intent,null,observe(s)).status,'pending');});
test('replayed success yields no second transition',()=>{const o=observe(),first=apply(intent,null,o);assert.deepEqual(apply(intent,first.record,o),{changed:false,status:'paid'});});
test('delayed verified success upgrades pending and failed without repricing',()=>{for(const s of ['pending','failed']){const before=apply(intent,null,observe(s));const next=apply(intent,before.record,observe());assert.equal(next.status,'paid');assert.equal(next.record.amountCents,10000);}});
test('late failure and pending cannot downgrade an already verified paid record',()=>{const paid=apply(intent,null,observe()).record;for(const s of ['failed','pending','abandoned'])assert.deepEqual(apply(intent,paid,observe(s)),{changed:false,status:'paid'});});
test('late pending cannot erase a known failure',()=>{const failed=apply(intent,null,observe('failed')).record;assert.equal(apply(intent,failed,observe('pending')).changed,false);});
test('foreign business, account, environment and payload mismatches reject',()=>{
 for(const key of ['businessId','accountId','environment']){const a={...account,[key]:'foreign'};assert.throws(()=>verified({intent,account:a,response:{status:true,data:data()}}));assert.throws(()=>webhook({...signed(),account:a}));}
 for(const extra of [{amount:9999},{amount:10000.1},{currency:'USD'},{reference:'another'},{domain:'live'},{status:'reversed'},{id:Number.MAX_SAFE_INTEGER+1}])assert.throws(()=>observe('success',extra));
});
test('untrusted metadata cannot select a business or alter the saved amount',()=>{const o=webhook(signed({event:'charge.success',data:{...data(),metadata:{businessId:'attacker',amount:1},authorization:{authorization_code:'SYNTHETIC-CARD-DATA'}}}));assert.equal(o.businessId,intent.businessId);assert.ok(!JSON.stringify(o).includes('SYNTHETIC-CARD-DATA'));assert.ok(!JSON.stringify(o).includes('attacker'));});
test('transaction identity cannot be replaced on replay or across business records',()=>{const current=apply(intent,null,observe()).record;assert.throws(()=>apply(intent,current,observe('success',{id:12346})));assert.throws(()=>apply(intent,{...current,businessId:'foreign'},observe()));});
test('invalid amounts and non-staging intents reject before verification',()=>{for(const change of [{amountCents:0},{amountCents:-1},{amountCents:1.5},{environment:'production'},{currency:'USD'},{reference:'a/b'}])assert.throws(()=>verified({intent:{...intent,...change},account,response:{status:true,data:data()}}));});
