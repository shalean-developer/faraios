// Separate connections and native PostgreSQL only; never a hosted database.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {fixture} from './t21-eft.test.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),business=id(10);
test('T21 native: concurrent manual/online writers serialize at READ COMMITTED and REPEATABLE READ', {skip:!process.env.T21_NATIVE_URL},async t=>{
 const url=new URL(process.env.T21_NATIVE_URL);
 if(process.env.T21_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t21_test')throw Error('Own disposable T21 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();t.after(()=>db.end());db.exec=s=>db.query(s);
 const f=await fixture(db);
 await f.as(owner,()=>db.query("select public.t20_payment_owner('configure',$1)",[JSON.stringify({businessId:business,accountId:'123',enabled:true})]));
 const invoke=(c,kind,input)=>c.query(kind==='manual'?"select public.t21_eft('allocate',$1)":"select public.t20_payment_owner('create',$1)",[JSON.stringify({businessId:business,...input})]);
 let serial=1000;
 for(const isolation of ['READ COMMITTED','REPEATABLE READ'])for(const [firstKind,secondKind,rollback] of [['manual','manual',false],['manual','online',false],['online','manual',false],['manual','manual',true]]){
  const invoice=id(serial++),r1=serial++,r2=serial++,onlineKey=id(serial++);
  await db.query("insert into public.one_off_bookings values($1,$2,'confirmed')",[invoice,business]);
  await db.query("insert into public.business_invoices values($1,$2,$1,10000,'ZAR')",[invoice,business]);
  for(const r of [r1,r2]){await f.record(r,6000);await f.call('verify',{receiptId:id(r)});}
  const clients=[new pg.Client({connectionString:url.href}),new pg.Client({connectionString:url.href})];
  await Promise.all(clients.map(c=>c.connect()));
  try{
   for(const c of clients){await c.query('begin isolation level '+isolation);await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[manager,JSON.stringify({session_id:manager})]);}
   // Establish the second transaction's snapshot before the first writer commits.
   await clients[1].query('select public.t21_eft(\'status\',$1)',[JSON.stringify({businessId:business,invoiceId:invoice})]);
   await invoke(clients[0],firstKind,{invoiceId:invoice,...(firstKind==='manual'?{receiptId:id(r1)}:{requestId:onlineKey})});
   const pid=(await clients[1].query('select pg_backend_pid() p')).rows[0].p;
   const pending=invoke(clients[1],secondKind,{invoiceId:invoice,...(secondKind==='manual'?{receiptId:id(r2)}:{requestId:onlineKey})}).then(result=>({result}),error=>({error}));
   let waited=false;
   for(let n=0;n<100;n++){
    const row=(await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0];
    if(row?.wait_event_type==='Lock'){waited=true;break;}
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   assert.ok(waited,'second independent connection must actually wait on first writer');
   await clients[0].query(rollback?'rollback':'commit');
   const outcome=await pending;
   if(rollback){assert.ok(!outcome.error);await clients[1].query('commit');}
   else{
    assert.ok(outcome.error,'competing payment must reject');
    assert.ok(['P0001','40001'].includes(outcome.error.code));await clients[1].query('rollback');
   }
   const allocated=(await db.query('select coalesce(sum(r.amount_cents),0)::int cents from private_t21.allocations a join private_t21.receipts r on r.id=a.receipt_id where a.invoice_id=$1',[invoice])).rows[0].cents;
   const attempts=(await db.query('select count(*)::int n from private_t20.intents where invoice_id=$1',[invoice])).rows[0].n;
   assert.equal(allocated,firstKind==='online'?0:6000);assert.equal(attempts,firstKind==='online'?1:0);
   const status=await f.call('status',{invoiceId:invoice});assert.equal(status.verifiedCents,allocated);assert.equal(status.bookingId,invoice);
  }finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end();}}
 }
});
