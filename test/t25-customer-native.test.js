import test from 'node:test';import assert from 'node:assert/strict';import pg from 'pg';
import {fixture,customer,owner,enrol,booking,id} from '../test-support/t25-fixture.js';
test('T25 native: concurrent duplicate, rollback, response loss and revocation serialize safely',{skip:!process.env.T25_NATIVE_URL},async t=>{
 const url=new URL(process.env.T25_NATIVE_URL);if(process.env.T25_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t25_test')throw Error('Own disposable T25 database required');
 const db=new pg.Client({connectionString:url.href});await db.connect();t.after(()=>db.end());db.exec=s=>db.query(s);const f=await fixture(db),rel=await enrol(f),p=booking(rel);
 const x=new pg.Client({connectionString:url.href}),y=new pg.Client({connectionString:url.href});await Promise.all([x.connect(),y.connect()]);t.after(async()=>{await Promise.allSettled([x.query('rollback'),y.query('rollback')]);await x.end();await y.end();});
 const identity=async(c,uid=customer)=>{await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await c.query("set local statement_timeout='8000'");};
 const call=async(c,payload=p,action='book')=>(await c.query('select public.t25_customer_portal($1,$2,$3) v',['alpha',action,JSON.stringify(payload)])).rows[0].v;
 const blocked=async c=>{for(let i=0;i<100;i++){const r=await db.query('select cardinality(pg_blocking_pids($1))>0 blocked',[c.processID]);if(r.rows[0].blocked)return;await new Promise(r=>setTimeout(r,20));}assert.fail('Contender did not block on database lock');};
 await x.query('begin');await identity(x);const first=await call(x);
 await y.query('begin');await identity(y);const contender=call(y);await blocked(y);await x.query('commit');assert.deepEqual(await contender,first);await y.query('commit');
 // The response can be lost after commit: retry reads the durable result.
 await y.query('begin');await identity(y);assert.deepEqual(await call(y),first);await y.query('commit');
 assert.equal((await db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,1);
 // Failed response before commit rolls back booking, audit, and receipt together.
 const p2={...p,requestId:id(5000)};await x.query('begin');await identity(x);await call(x,p2);await x.query('rollback');
 assert.equal((await db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,1);
 await y.query('begin');await identity(y);await call(y,p2);await y.query('commit');
 assert.equal((await db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,2);
 // Relationship row sharing serializes an in-flight write against office revocation.
 await x.query('begin');await identity(x);await call(x,{...p,requestId:id(5001)});
 await y.query('begin');await identity(y,owner);const revoke=call(y,{requestId:id(5002),customer:rel.customer,user:customer,evidence:'Synthetic independent revocation'},'revoke');await blocked(y);await x.query('commit');await revoke;await y.query('commit');
 await x.query('begin');await identity(x);await assert.rejects(call(x,{...p,requestId:id(5003)}),e=>e.code==='42501');await x.query('rollback');
 // Under a repeatable snapshot a concurrent duplicate may serialize-fail; a fresh
 // retry must return the original result rather than create another booking.
 const relOther=await enrol(f,customer,'beta',5100),p3=booking(relOther,5102,id(120));
 const beta=c=>c.query("select public.t25_customer_portal('beta','book',$1) v",[JSON.stringify(p3)]);
 await x.query('begin isolation level repeatable read');await identity(x);await x.query('select count(*) from public.business_memberships');
 await y.query('begin');await identity(y);const saved=(await beta(y)).rows[0].v;await y.query('commit');
 try{assert.deepEqual((await beta(x)).rows[0].v,saved);await x.query('commit');}catch(e){assert(['40001','23505'].includes(e.code));await x.query('rollback');}
 await x.query('begin');await identity(x);assert.deepEqual((await beta(x)).rows[0].v,saved);await x.query('commit');
 assert.equal((await db.query("select count(*)::int n from public.one_off_bookings where business_id=$1",[id(20)])).rows[0].n,1);
 // Real mandatory per-option assessment flags in the second business.
 await db.query("update public.business_catalogue set cleaning_config=jsonb_set(cleaning_config,'{rules,property_type,House,assessment}','true') where id=$1",[id(120)]);
 const pending={...p3,requestId:id(5200),catalogueVersions:{[id(120)]:'2'}};
 const assessed=async(c,action,payload)=>(await c.query("select public.t25_customer_assessment('beta',$1,$2) v",[action,JSON.stringify(payload)])).rows[0].v;
 await x.query('begin');await identity(x);const request=await assessed(x,'submit',pending);
 await y.query('begin');await identity(y);const duplicate=assessed(y,'submit',pending);await blocked(y);await x.query('commit');assert.deepEqual(await duplicate,request);await y.query('commit');
 await x.query('begin');await identity(x,owner);const quoted=await assessed(x,'assess',{requestId:id(5201),request:request.request,version:request.version,additional_cents:0,duration_minutes:420,reason:'Native synthetic assessment'});await x.query('commit');
 const quote=(await db.query('select quote_version from private_t25.assessment_requests where id=$1',[request.request])).rows[0];
 const consent={requestId:id(5202),request:request.request,version:quoted.version,quoteVersion:quote.quote_version,consent:true};
 await x.query('begin');await identity(x);const agreed=await assessed(x,'agree',consent);
 await y.query('begin');await identity(y);const duplicateConsent=assessed(y,'agree',consent);await blocked(y);await x.query('commit');assert.deepEqual(await duplicateConsent,agreed);await y.query('commit');
 const finish={requestId:id(5203),request:request.request,version:agreed.version};
 const count=async()=>(await db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n;
 const before=await count();await x.query('begin');await identity(x,owner);await assessed(x,'finalize',finish);await x.query('rollback');assert.equal(await count(),before);
 assert.equal((await db.query('select state from private_t25.assessment_requests where id=$1',[request.request])).rows[0].state,'agreed');
 await x.query('begin');await identity(x,owner);const savedAssessment=await assessed(x,'finalize',finish);
 await y.query('begin');await identity(y,owner);const duplicateBooking=assessed(y,'finalize',finish);await blocked(y);await x.query('commit');assert.deepEqual(await duplicateBooking,savedAssessment);await y.query('commit');
 await y.query('begin');await identity(y,owner);assert.deepEqual(await assessed(y,'finalize',finish),savedAssessment);await y.query('commit');assert.equal(await count(),before+1);
 console.log('T25_ASSESSMENT_NATIVE_CONSENT_ROLLBACK_RETRY_PASS');
 console.log('T25_CUSTOMER_NATIVE_CONCURRENCY_ROLLBACK_RETRY_PASS');
});
