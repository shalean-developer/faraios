import test from 'node:test';import assert from 'node:assert/strict';import pg from 'pg';
import {portalFixture} from './t24-cleaner-portal.test.js';import {a,owner,worker,agree,accrue} from './t22-earnings.test.js';
test('T24 native: concurrent accrual commit/rollback exposes coherent own earnings without duplicate writes',{skip:!process.env.T24_NATIVE_URL},async t=>{
 const url=new URL(process.env.T24_NATIVE_URL);if(process.env.T24_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t24_test')throw Error('Own disposable T24 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();t.after(()=>db.end());db.exec=s=>db.query(s);const f=await portalFixture(db);await f.call('agree',agree());await f.complete();
 const writer=new pg.Client({connectionString:url.href}),reader=new pg.Client({connectionString:url.href});await Promise.all([writer.connect(),reader.connect()]);t.after(async()=>{await writer.end();await reader.end()});
 const identity=async(c,u)=>{await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[u,JSON.stringify({session_id:u})]);};
 const read=async()=>(await reader.query("select public.t24_cleaner_portal($1,'earnings',0) v",[a])).rows[0].v.data[0];
 for(const isolation of ['READ COMMITTED','REPEATABLE READ']){
  await writer.query('begin');await identity(writer,owner);await writer.query("select public.t22_earnings('accrue',$1)",[JSON.stringify({businessId:a,...accrue()})]);
  await reader.query('begin isolation level '+isolation+' read only');await identity(reader,worker);assert.equal((await read()).accrued,false);
  await writer.query('rollback');assert.equal((await read()).accrued,false);await reader.query('rollback');
 }
 await writer.query('begin');await identity(writer,owner);await writer.query("select public.t22_earnings('accrue',$1)",[JSON.stringify({businessId:a,...accrue()})]);
 await reader.query('begin isolation level repeatable read read only');await identity(reader,worker);assert.equal((await read()).accrued,false);await writer.query('commit');assert.equal((await read()).accrued,false);await reader.query('commit');
 await reader.query('begin read only');await identity(reader,worker);for(let i=0;i<5;i++){const r=await read();assert.equal(r.accrued,true);assert.equal(r.amountCents,17501);assert.ok(r.sourceId);}await reader.query('commit');
 assert.equal((await db.query('select count(*)::int n from private_t22.accruals')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from public.adjustment_review_events')).rows[0].n,2);
});
