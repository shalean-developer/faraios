import test from 'node:test';import assert from 'node:assert/strict';
import {httpFixture} from '../test-support/t26-http-fixture.js';
import {a,b,owner,customer,staff} from '../test-support/t26-fixture.js';
test('T26 HTTP to SQL: scoped office queue, disabled/sink control, current paid suppression and CSRF denial',async t=>{
 const h=await httpFixture();t.after(()=>h.close());const {base,f}=h,s=await f.create();await f.confirm(s);
 const login=async who=>{const r=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email='+who+'%40example.invalid&password=synthetic',redirect:'manual'});assert.equal(r.status,303);return r.headers.get('set-cookie').split(';')[0];};
 const Cookie=await login('owner'),path='/notifications?business='+a;
 const post=(action,payload={},origin=base)=>fetch(base+path,{method:'POST',headers:{Cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action,requestId:crypto.randomUUID(),...payload}),redirect:'manual'});
 let r=await fetch(base+path,{headers:{Cookie}});assert.equal(r.status,200);let html=await r.text();assert.match(html,/Booking confirmation/);assert.match(html,/Save delivery control/);assert.doesNotMatch(html,/Deliver to test sink/);
 assert.equal((await post('mode',{mode:'sink'},'https://attacker.invalid')).status,403);assert.equal((await post('mode',{mode:'sink'})).status,303);
 assert.equal((await post('reminder',{invoiceId:s.invoice})).status,303);const job=(await f.call('list')).rows.find(x=>x.kind==='pending_payment');
 await f.pay(s);assert.equal((await post('deliver',{jobId:job.id})).status,303);assert.equal((await f.call('list')).rows.find(x=>x.id===job.id).state,'suppressed');
 assert.equal((await post('reminder',{invoiceId:crypto.randomUUID()})).status,403);
 r=await fetch(base+'/notifications?business='+b,{headers:{Cookie}});assert.equal(r.status,200);assert.doesNotMatch(await r.text(),new RegExp(s.booking));
 const customerCookie=await login('customer');assert.equal((await fetch(base+path,{headers:{Cookie:customerCookie}})).status,403);
 await h.db.query("update public.business_memberships set role='manager' where business_id=$1 and user_id=$2",[a,owner]);
 r=await fetch(base+path,{headers:{Cookie}});assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/Save delivery control/);
 assert.equal((await post('mode',{mode:'disabled'})).status,403);
});
test('T26 hosted transport permits only the guarded public RPC',async()=>{
 const {createStagingFetch,stagingDatabase}=await import('../src/hosted-staging.js');let count=0;
 const dispatch=createStagingFetch(async()=>{count++;return new Response('{}');});
 await dispatch(stagingDatabase+'/rest/v1/rpc/t26_notifications',{method:'POST',body:'{}'});assert.equal(count,1);
 for(const [path,init]of [['/rest/v1/rpc/t26_notifications',{method:'GET'}],['/rest/v1/rpc/t26_notifications',{method:'POST',headers:{'Content-Profile':'private_t26'}}],['/rest/v1/jobs',{method:'GET'}]])await assert.rejects(dispatch(stagingDatabase+path,init),/blocked/);
 assert.equal(count,1);
});
