import test from 'node:test';import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {fixture,a,b,owner,customer,staff,other,id} from '../test-support/t26-fixture.js';
import {notificationForm,renderNotifications} from '../src/notifications.js';
async function setup(t){const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close());return fixture(db);}
const reminder=(f,s,business=a)=>f.call('reminder',{requestId:crypto.randomUUID(),invoiceId:s.invoice},business);
test('T26 SQL: Drafts are silent, disabled mode and exact confirmation/assignment state are enforced',async t=>{
 const f=await setup(t),s=await f.create();assert.equal((await f.call('list')).mode,'disabled');assert.equal((await f.call('list')).rows.length,0);
 await f.confirm(s);let rows=(await f.call('list')).rows;assert.equal(rows.length,1);assert.equal((await f.deliver(rows[0].id)).dispatch,'disabled');
 await f.sink(a);assert.equal((await f.deliver(rows[0].id)).state,'sink_delivered');
 await f.as(owner,()=>f.db.query("update public.one_off_bookings set status='assigned',assigned_staff=$2,change_reason='Synthetic assignment' where id=$1",[s.booking,[staff]]));
 const assignment=(await f.call('list')).rows.find(x=>x.kind==='assignment');
 await f.db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,staff]);
 assert.equal((await f.deliver(assignment.id)).state,'suppressed');
 assert.equal((await f.db.query('select count(*)::int n from private_t26.sink')).rows[0].n,1);
});
test('T26 SQL: both businesses suppress reminders when payment changes while queued; receipt uses current verified totals',async t=>{
 const f=await setup(t);
 for(const [business,n]of [[a,1000],[b,2000]]){
  const s=await f.create(business,n);await f.confirm(s);await f.sink(business);const job=await reminder(f,s,business);
  const duplicate=await reminder(f,s,business);assert.equal(duplicate.id,job.id);
  await f.pay(s,business,n+2000);assert.equal((await f.deliver(job.id,business)).state,'suppressed');
  const receipt=(await f.call('list',{},business)).rows.find(x=>x.kind==='payment_received');assert(receipt);
  const key=crypto.randomUUID();const first=await f.deliver(receipt.id,business,key);assert.equal(first.state,'sink_delivered');assert.deepEqual(await f.deliver(receipt.id,business,key),first);
  assert.equal((await f.deliver(receipt.id,business)).state,'sink_delivered');
  const stored=(await f.db.query('select message from private_t26.sink where job_id=$1',[receipt.id])).rows[0].message;assert.equal(stored.businessId,business);assert.equal(stored.balanceCents,0);assert.equal(stored.recipientId,s.customer);
 }
 assert.equal((await f.db.query('select count(*)::int n from private_t26.sink')).rows[0].n,2);
});
test('T26 SQL: durable failed job, same-key response loss, backoff, rollback-safe retry, and five-attempt bound',async t=>{
 const f=await setup(t),s=await f.create();await f.confirm(s);await f.sink(a);const job=(await f.call('list')).rows[0];
 await f.db.exec("create function public.t26_test_fail() returns trigger language plpgsql as $$begin raise exception 'Synthetic sink failure';end;$$;create trigger t26_test_failure before insert on private_t26.sink for each row execute function public.t26_test_fail();");
 const key=crypto.randomUUID(),failed=await f.deliver(job.id,a,key);assert.equal(failed.state,'failed');assert.deepEqual(await f.deliver(job.id,a,key),failed);
 assert.equal((await f.call('list')).rows[0].attempts,1);await f.deliver(job.id);assert.equal((await f.call('list')).rows[0].attempts,1);
 await f.db.exec('drop trigger t26_test_failure on private_t26.sink');await f.db.query('update private_t26.jobs set available_at=now() where id=$1',[job.id]);
 assert.equal((await f.deliver(job.id)).state,'sink_delivered');assert.equal((await f.call('list')).rows[0].attempts,2);assert.equal((await f.db.query('select count(*)::int n from private_t26.sink')).rows[0].n,1);
 // Another confirmed booking, permanently failing sink, exhausts without duplicates.
 const s2=await f.create(a,6000);await f.confirm(s2);const j2=(await f.call('list')).rows.find(x=>x.bookingId===s2.booking);
 await f.db.exec('create trigger t26_test_failure before insert on private_t26.sink for each row execute function public.t26_test_fail()');
 for(let n=0;n<7;n++){await f.db.query('update private_t26.jobs set available_at=now() where id=$1',[j2.id]);await f.deliver(j2.id);}
 assert.equal((await f.call('list')).rows.find(x=>x.id===j2.id).attempts,5);
});
test('T26 SQL: stale booking, cancelled/Draft, recipient deactivation and payment-on-failed-retry suppress safely',async t=>{
 const f=await setup(t),s=await f.create();await f.confirm(s);await f.sink(a);const job=await reminder(f,s);
 await f.db.exec("create function public.t26_test_fail() returns trigger language plpgsql as $$begin raise exception 'Synthetic sink failure';end;$$;create trigger t26_test_failure before insert on private_t26.sink for each row execute function public.t26_test_fail();");
 assert.equal((await f.deliver(job.id)).state,'failed');await f.pay(s);await f.db.query('update private_t26.jobs set available_at=now() where id=$1',[job.id]);assert.equal((await f.deliver(job.id)).state,'suppressed');
 const s2=await f.create(a,6000);await f.confirm(s2);const j2=(await f.call('list')).rows.find(x=>x.bookingId===s2.booking);
 await f.as(owner,()=>f.db.query("update public.one_off_bookings set status='cancelled',change_reason='Synthetic cancellation' where id=$1",[s2.booking]));assert.equal((await f.deliver(j2.id)).state,'suppressed');
 const s3=await f.create(a,7000);await f.confirm(s3);const j3=(await f.call('list')).rows.find(x=>x.bookingId===s3.booking);
 await f.db.query('update public.business_customers set is_active=false where id=$1',[s3.customer]);assert.equal((await f.deliver(j3.id)).state,'suppressed');
});
test('T26 SQL: role/business/session isolation, forged payloads and direct table access are denied',async t=>{
 const f=await setup(t),s=await f.create();await f.confirm(s);await f.sink(a);const job=(await f.call('list')).rows[0];
 for(const user of [customer,staff,other,null])await assert.rejects(f.call('list',{},a,user),e=>e.code==='42501');
 await assert.rejects(f.deliver(job.id,b),e=>e.code==='42501');assert.equal((await f.call('list',{},b)).rows.length,0);
 for(const table of ['jobs','events','settings','sink'])for(const role of ['anon','authenticated','service_role'])await assert.rejects(f.as(owner,()=>f.db.query('select * from private_t26.'+table),role),e=>e.code==='42501');
 await assert.rejects(f.call('reminder',{invoiceId:s.invoice,requestId:id(9000),recipientId:other}));
 await f.db.query("update public.business_memberships set role='manager' where business_id=$1 and user_id=$2",[a,owner]);
 assert.equal((await f.call('list')).rows.length,1);await assert.rejects(f.call('mode',{mode:'sink',requestId:id(9001)}),e=>e.code==='42501');
 await f.db.query('delete from auth.sessions where user_id=$1',[owner]);await assert.rejects(f.call('list'),e=>e.code==='42501');
});
test('T26 UI: controlled sink, escaped scoped messages and retry controls',()=>{
 const html=renderNotifications({id:a,name:'<script>'},{mode:'sink',rows:[{id:id(1),bookingId:id(2),kind:'pending_payment',state:'failed',attempts:1,error:'sink_failure',availableAt:'2099-11-02',message:{businessName:'<img>',text:'<script>',localStart:'2099-11-02',timeZone:'UTC',balanceCents:1,verifiedCents:0}}]},{owner:true});
 assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/Retry in test sink/);assert.match(html,/External delivery is disabled/);
 assert.throws(()=>notificationForm(new URLSearchParams({action:'email'})),/Invalid/);
});
test('T26 SQL: verified online payment suppresses queued reminder; pending provider state never fabricates a receipt',async t=>{
 const f=await setup(t),s=await f.create();await f.confirm(s);await f.sink(a);const job=await reminder(f,s);
 await f.as(owner,()=>f.db.query("select private_t20.configure_account($1,'123',true)",[a]));
 await f.as(owner,()=>f.db.query('select private_t20.create_intent($1,$2,$3)',[a,s.invoice,id(8000)]));
 const total=(await f.db.query('select total_cents from public.business_invoices where id=$1',[s.invoice])).rows[0].total_cents;
 const observe=outcome=>f.as(owner,()=>f.db.query("select private_t20.publish_verified($1,'123',$2,'456',$3,$4,'ZAR')",[a,id(8000),outcome,total]),'t20_payment_verifier');
 await observe('pending');assert.equal((await f.call('list')).rows.filter(x=>x.kind==='payment_received').length,0);
 await observe('success');await observe('success');assert.equal((await f.call('list')).rows.filter(x=>x.kind==='payment_received').length,1);
 assert.equal((await f.deliver(job.id)).state,'suppressed');
});
test('T26 SQL: current assignment reaches only its business staff; stale confirmation is suppressed and partial reminder has the actual balance',async t=>{
 const f=await setup(t),s=await f.create();await f.confirm(s);await f.sink(a);const confirmation=(await f.call('list')).rows[0];
 await f.as(owner,()=>f.db.query("update public.one_off_bookings set status='assigned',assigned_staff=$2,change_reason='Synthetic assignment' where id=$1",[s.booking,[staff]]));
 assert.equal((await f.deliver(confirmation.id)).state,'suppressed');const assignment=(await f.call('list')).rows.find(x=>x.kind==='assignment');assert.equal((await f.deliver(assignment.id)).state,'sink_delivered');
 const delivered=(await f.db.query('select recipient_id,message from private_t26.sink where job_id=$1',[assignment.id])).rows[0];assert.equal(delivered.recipient_id,staff);assert.equal(delivered.message.recipientType,'staff');assert.equal(delivered.message.businessId,a);
 const reminderJob=await reminder(f,s);await f.pay(s,a,4500,1000);assert.equal((await f.deliver(reminderJob.id)).state,'sink_delivered');
 const message=(await f.db.query('select message from private_t26.sink where job_id=$1',[reminderJob.id])).rows[0].message;const total=(await f.db.query('select total_cents from public.business_invoices where id=$1',[s.invoice])).rows[0].total_cents;assert.equal(message.verifiedCents,1000);assert.equal(message.balanceCents,total-1000);
});
