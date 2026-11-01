// Independent connections; never reads a hosted connection variable.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {fixture,id,owner,a,job,agree,accrue} from './t22-earnings.test.js';
test('T22 native: agreement and accrual races, exact replay and rollback preserve one source per worker',{skip:!process.env.T22_NATIVE_URL},async t=>{
 const url=new URL(process.env.T22_NATIVE_URL);
 if(process.env.T22_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t22_test')throw Error('Own disposable T22 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();t.after(()=>db.end());db.exec=s=>db.query(s);const f=await fixture(db);
 let serial=1000;
 for(const isolation of ['READ COMMITTED','REPEATABLE READ'])for(const [action,sameKey,rollback]of [['agree',false,false],['agree',false,true],['accrue',false,false],['accrue',true,false],['accrue',false,true]]){
  const jobId=id(serial++),agreementId=id(serial++),otherAgreement=id(serial++),requestId=id(serial++),otherRequest=id(serial++);
  await db.query("insert into public.one_off_bookings select $1,business_id,'assigned',currency,assigned_staff,duration_minutes,recurring_schedule_id,selection,version from public.one_off_bookings where id=$2",[jobId,job]);
  const agreementInput={...agree(),businessId:a,bookingId:jobId,agreementId};
  const accrualInput={...accrue(),businessId:a,bookingId:jobId,agreementId,requestId};
  if(action==='accrue'){await f.call('agree',agreementInput);await db.query("update public.one_off_bookings set status='completed' where id=$1",[jobId]);}
  const clients=[new pg.Client({connectionString:url.href}),new pg.Client({connectionString:url.href})];await Promise.all(clients.map(c=>c.connect()));
  try{
   for(const c of clients){await c.query('begin isolation level '+isolation);await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[owner,JSON.stringify({session_id:owner})]);}
   await clients[1].query('select count(*) from public.businesses');
   const first=action==='agree'?agreementInput:accrualInput;
   const second=action==='agree'?{...agreementInput,agreementId:otherAgreement}:sameKey?accrualInput:{...accrualInput,requestId:otherRequest};
   const invoke=(client,input)=>client.query('select public.t22_earnings($1,$2)',[action,JSON.stringify(input)]);
   await invoke(clients[0],first);
   const pid=(await clients[1].query('select pg_backend_pid() p')).rows[0].p;
   const pending=invoke(clients[1],second).then(result=>({result}),error=>({error}));let waited=false;
   for(let n=0;n<100;n++){const row=(await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0];if(row?.wait_event_type==='Lock'){waited=true;break;}await new Promise(r=>setTimeout(r,20));}
   assert.ok(waited,'competing writer must really wait');await clients[0].query(rollback?'rollback':'commit');const outcome=await pending;
   if(rollback||sameKey&&isolation==='READ COMMITTED'){assert.ok(!outcome.error,String(outcome.error));await clients[1].query('commit');}
   else{assert.ok(outcome.error);assert.ok(['40001','23505','P0001'].includes(outcome.error.code));await clients[1].query('rollback');}
   const rows=(await db.query('select * from private_t22.agreements where booking_id=$1',[jobId])).rows;assert.equal(rows.length,1);
   if(action==='accrue'){
    assert.equal((await db.query('select * from private_t22.accruals where agreement_id=$1',[agreementId])).rows.length,1);
    assert.equal((await db.query('select * from public.adjustment_review_sources where booking_id=$1',[jobId])).rows.length,2);
    assert.equal((await db.query('select count(*)::int n from public.adjustment_review_events where source_id in (select id from public.adjustment_review_sources where booking_id=$1)',[jobId])).rows[0].n,2);
    const retry=rollback?second:first;await f.call('accrue',retry);
   }
  }finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end();}}
 }
});
