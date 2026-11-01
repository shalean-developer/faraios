import test from 'node:test';import assert from 'node:assert/strict';import pg from 'pg';
import {fixture,a,b,owner,id} from '../test-support/t26-fixture.js';
test('T26 native: concurrent dispatch, commit response loss, rollback and payment snapshot fencing',{skip:!process.env.T26_NATIVE_URL,timeout:60000},async t=>{
 const url=new URL(process.env.T26_NATIVE_URL);if(process.env.T26_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t26_test'||url.port==='5432')throw Error('Own disposable non-5432 T26 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();db.exec=s=>db.query(s);t.after(()=>db.end());const f=await fixture(db);
 const x=new pg.Client({connectionString:url.href}),y=new pg.Client({connectionString:url.href});await Promise.all([x.connect(),y.connect()]);t.after(async()=>{await Promise.allSettled([x.query('rollback'),y.query('rollback')]);await x.end();await y.end();});
 const begin=async(c,isolation='read committed')=>{await c.query('begin isolation level '+isolation);await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);await c.query("set local statement_timeout='8000'");};
 const deliver=async(c,business,jobId,key=crypto.randomUUID())=>(await c.query("select public.t26_notifications($1,'deliver',$2) v",[business,JSON.stringify({jobId,requestId:key})])).rows[0].v;
 const blocked=async c=>{for(let n=0;n<100;n++){if((await db.query('select cardinality(pg_blocking_pids($1))>0 blocked',[c.processID])).rows[0].blocked)return;await new Promise(r=>setTimeout(r,20));}assert.fail('Contender did not block');};
 for(const [business,n]of [[a,1000],[b,2000]]){
  const s=await f.create(business,n);await f.confirm(s);await f.sink(business);const job=(await f.call('list',{},business)).rows[0],key=crypto.randomUUID();
  await begin(x);const first=await deliver(x,business,job.id,key);await begin(y);const contender=deliver(y,business,job.id);await blocked(y);await x.query('commit');assert.equal((await contender).state,'sink_delivered');await y.query('commit');
  await begin(y);assert.deepEqual(await deliver(y,business,job.id,key),first);await y.query('commit');
  assert.equal((await db.query('select count(*)::int n from private_t26.sink where job_id=$1',[job.id])).rows[0].n,1);
  const reminder=await f.call('reminder',{requestId:crypto.randomUUID(),invoiceId:s.invoice},business);
  await begin(x);await deliver(x,business,reminder.id);await x.query('rollback');
  assert.equal((await db.query('select count(*)::int n from private_t26.sink where job_id=$1',[reminder.id])).rows[0].n,0);
  assert.equal((await db.query('select attempts from private_t26.jobs where id=$1',[reminder.id])).rows[0].attempts,0);
  // Establish an old snapshot, commit a genuine accepted EFT allocation, then
  // refuse stale dispatch via the shared write fence. Fresh retry suppresses.
  await begin(x,'repeatable read');await x.query('select count(*) from public.business_memberships');
  await f.pay(s,business,n+3000);
  await assert.rejects(deliver(x,business,reminder.id),e=>e.code==='40001');await x.query('rollback');
  await begin(x);assert.equal((await deliver(x,business,reminder.id)).state,'suppressed');await x.query('commit');
 }
 // A failed sink attempt commits one failure; a concurrent different-key retry
 // sees the backoff and cannot consume a second attempt or duplicate a message.
 const failedBooking=await f.create(a,6000);await f.confirm(failedBooking);const failedJob=(await f.call('list')).rows.find(r=>r.bookingId===failedBooking.booking);
 await db.query("create function public.t26_test_failure() returns trigger language plpgsql as $$begin raise exception 'Synthetic sink failure';end;$$;create trigger t26_test_failure before insert on private_t26.sink for each row execute function public.t26_test_failure();");
 await begin(x);assert.equal((await deliver(x,a,failedJob.id)).state,'failed');await begin(y);const retry=deliver(y,a,failedJob.id);await blocked(y);await x.query('commit');assert.equal((await retry).state,'failed');await y.query('commit');
 assert.equal((await db.query('select attempts from private_t26.jobs where id=$1',[failedJob.id])).rows[0].attempts,1);
 await db.query('drop trigger t26_test_failure on private_t26.sink');await db.query('update private_t26.jobs set available_at=now() where id=$1',[failedJob.id]);
 await begin(y);assert.equal((await deliver(y,a,failedJob.id)).state,'sink_delivered');await y.query('commit');
 assert.equal((await db.query('select count(*)::int n from private_t26.sink where job_id=$1',[failedJob.id])).rows[0].n,1);
 console.log('T26_NATIVE_DUPLICATE_ROLLBACK_PAYMENT_FENCE_PASS');
});
