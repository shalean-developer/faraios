import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {payoutFixture,prepared,create} from './t23-payouts.test.js';
import {id,owner,a} from './t22-earnings.test.js';
test('T23 native: concurrent claims and submissions, exact replay and interrupted transaction recovery',{skip:!process.env.T23_NATIVE_URL},async t=>{
 const url=new URL(process.env.T23_NATIVE_URL);
 if(process.env.T23_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t23_test')throw Error('Own disposable T23 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();t.after(()=>db.end());db.exec=s=>db.query(s);const f=await payoutFixture(db);

 for(const isolation of ['READ COMMITTED','REPEATABLE READ'])for(const [action,sameKey,rollback]of [['submit',false,false],['submit',true,false],['submit',false,true],['claim',false,false],['claim',false,true]]){
  // Reset ONLY this disposable isolated database; never a hosted recovery procedure.
  await db.query('delete from public.settlement_review_claims');
  await db.query('delete from public.settlement_review_events');
  await db.query('delete from public.settlement_review_statements');
  if(action==='claim'){
   await f.append('create',create,0,id(301));
   await f.append('create',{...create,period:'2026-10'},0,id(401),owner,id(400));
  }else await prepared(f);
  const clients=[new pg.Client({connectionString:url.href}),new pg.Client({connectionString:url.href})];await Promise.all(clients.map(c=>c.connect()));
  try{
   for(const c of clients){await c.query('begin isolation level '+isolation);await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[owner,JSON.stringify({session_id:owner})]);}
   await clients[1].query('select count(*) from public.businesses');
   const type=action==='claim'?'add_accrued':'submit';const payload=action==='claim'?{sourceId:f.source,evidence:'SYNTHETIC claim race'}:{amountCents:17501,reference:'SYNTHETIC race'};
   const invoke=(c,key)=>c.query('select public.append_monthly_settlement($1,$2,$3,$4,$5,$6)',[a,action==='claim'&&c===clients[1]?id(400):id(300),action==='claim'?1:4,key,type,JSON.stringify(payload)]);
   await invoke(clients[0],id(410));const pid=(await clients[1].query('select pg_backend_pid() p')).rows[0].p;
   const pending=invoke(clients[1],sameKey?id(410):id(411)).then(result=>({result}),error=>({error}));let waited=false;
   for(let n=0;n<100;n++){if((await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0]?.wait_event_type==='Lock'){waited=true;break;}await new Promise(r=>setTimeout(r,20));}
   assert.ok(waited,'writer must actually wait for concurrent transaction');await clients[0].query(rollback?'rollback':'commit');const outcome=await pending;
   if(rollback||sameKey&&isolation==='READ COMMITTED'){assert.ok(!outcome.error,String(outcome.error));await clients[1].query('commit');}
   else{assert.ok(outcome.error);assert.ok(['40001','23505','P0001'].includes(outcome.error.code));await clients[1].query('rollback');}
   if(action==='claim')assert.equal((await db.query('select count(*)::int n from public.settlement_review_claims')).rows[0].n,1);
   else assert.equal((await f.state()).state.transfers.length,1);
  }finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end();}}

 }
});
