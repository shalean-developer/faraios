import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,id,owner,manager,worker,foreign,a,b,job,agree,accrue} from './t22-earnings.test.js';
export async function payoutFixture(db){
 const f=await fixture(db);
 await f.db.exec(await readFile(new URL('../database/monthly-settlements-draft.sql',import.meta.url),'utf8'));
 await f.db.exec(await readFile(new URL('../database/t23-payouts-candidate.sql',import.meta.url),'utf8'));
 await f.call('agree',{...agree(),originalPeriod:'2026-09'});await f.complete();await f.call('accrue',accrue());
 const sources=(await f.db.query('select * from public.adjustment_review_sources order by worker_id')).rows;
 f.source=sources.find(s=>s.worker_id===worker).id;
 f.append=(type,payload,version,key,user=owner,sid=id(300),biz=a)=>f.as(user,()=>f.db.query('select public.append_monthly_settlement($1,$2,$3,$4,$5,$6)',[biz,sid,version,key,type,JSON.stringify(payload)]));
 f.state=async(sid=id(300))=>(await f.db.query('select state,version from public.settlement_review_statements where id=$1',[sid])).rows[0];
 f.adjust=(type,payload,version,key)=>f.as(owner,()=>f.db.query('select public.append_earnings_adjustment($1,$2,$3,$4,$5,$6)',[a,f.source,version,key,type,JSON.stringify(payload)]));
 return f;
}
export const create={workerId:worker,period:'2026-09',calendarEvidence:'SYNTHETIC calendar reviewed',closedDates:[]};
export const freeze={reference:'SYNTHETIC freeze',fullPayReviewEvidence:'SYNTHETIC terms and completion review'};
export const approval={reference:'SYNTHETIC approval',paymentDetailsEvidence:'SYNTHETIC EXAMPLE ONLY no bank details'};
export async function prepared(f){await f.append('create',create,0,id(301));await f.append('add_accrued',{sourceId:f.source,evidence:'SYNTHETIC reviewed accrued original'},1,id(302));await f.append('freeze',freeze,2,id(303));await f.append('approve',approval,3,id(304));}
test('T23 durable originals, frozen snapshots, partial recovery, later reimbursement and exact reconciliation',async t=>{
 const f=await payoutFixture();t.after(()=>f.db.close());await prepared(f);
 const original=(await f.state()).state.lines[0];assert.equal(original.amountCents,17501);assert.equal(original.sourceId,f.source);
 assert.deepEqual((await f.state()).state.freeze.lines,[original]);
 await f.append('submit',{amountCents:17501,reference:'SYNTHETIC-T23-1'},4,id(305));
 const recon={transferId:id(305),outcome:'partial',clearedCents:10000,remainingFailed:false,allocations:{[id(302)]:10000},clearingEvidence:'SYNTHETIC not a bank payment',allocationEvidence:'SYNTHETIC source allocation',reference:'SYNTHETIC partial'};
 await f.append('reconcile',recon,5,id(306));await assert.rejects(f.append('submit',{amountCents:7501,reference:'SYNTHETIC retry'},6,id(307)),/uncertain/);
 await f.append('reconcile',{...recon,remainingFailed:true},6,id(307));await f.append('submit',{amountCents:7501,reference:'SYNTHETIC-T23-2'},7,id(308));
 await f.append('reconcile',{...recon,transferId:id(308),outcome:'cleared',clearedCents:7501,allocations:{[id(302)]:7501},reference:'SYNTHETIC finish'},8,id(309));
 await f.append('submit',{amountCents:7501,reference:'SYNTHETIC-T23-2'},0,id(308));assert.equal((await f.state()).version,9);
 await assert.rejects(f.append('submit',{amountCents:17501,reference:'SYNTHETIC duplicate'},9,id(310)),/exact outstanding/);
 await f.adjust('propose',{sourceId:f.source,kind:'reimbursement',deltaCents:5000,reason:'SYNTHETIC missed expense',evidence:'SYNTHETIC receipt',occurrenceReference:'t23-r50'},1,id(320));
 await assert.rejects(f.append('add_adjustment',{sourceId:id(320),evidence:'SYNTHETIC pending'},9,id(321)),/correction required/);
 await f.adjust('approve',{adjustmentId:id(320),reason:'SYNTHETIC approved',originalVerificationEvidence:'SYNTHETIC original',entitlementReviewEvidence:'SYNTHETIC entitlement'},2,id(322));
 await f.adjust('freeze_review',{adjustmentId:id(320),reference:'SYNTHETIC freeze correction'},3,id(323));
 await f.append('add_adjustment',{sourceId:id(320),evidence:'SYNTHETIC approved frozen delta'},9,id(324));
 assert.equal((await f.state()).state.approval,null);assert.equal((await f.state()).state.lines[1].adjustmentKind,'reimbursement');
 await assert.rejects(f.append('submit',{amountCents:5000,reference:'SYNTHETIC later'},10,id(325)),/owner-approved/);
 await f.append('freeze',freeze,10,id(325));await f.append('approve',approval,11,id(326));await f.append('submit',{amountCents:5000,reference:'SYNTHETIC-T23-3'},12,id(327));
 await f.append('reconcile',{...recon,transferId:id(327),outcome:'cleared',clearedCents:5000,allocations:{[id(324)]:5000},reference:'SYNTHETIC reimbursement'},13,id(328));
 const s=(await f.state()).state;assert.equal(s.transfers.reduce((n,t)=>n+t.clearedCents,0),22501);assert.equal(s.lines[0].amountCents,17501);assert.equal(s.execution,'disabled');
 await f.append('provide_statement',{reference:'SYNTHETIC statement and three example references provided'},14,id(329));
});
test('T23 direct SQL denies manual/foreign/paid-only sources, fresh role/session and duplicate cross-period claims',async t=>{
 const f=await payoutFixture();t.after(()=>f.db.close());await prepared(f);
 await assert.rejects(f.append('freeze',freeze,4,id(310),manager),/Owner/);
 await assert.rejects(f.append('add_accrued',{sourceId:f.source,evidence:'SYNTHETIC'},4,id(310),worker),/selection/);
 await assert.rejects(f.append('create',create,0,id(310),foreign,id(311),a),/denied/);
 await f.append('create',{...create,period:'2026-10'},0,id(310),owner,id(311));
 await assert.rejects(f.append('add_accrued',{sourceId:f.source,evidence:'SYNTHETIC duplicate'},1,id(312),owner,id(311)),/unique/);
 await assert.rejects(f.append('add_line',{kind:'visit',amountCents:17501,priorClearedCents:0,originalPeriod:'2026-09',bookingId:job,sourceReference:'invented',evidence:'SYNTHETIC'},1,id(312),owner,id(311)),/accrued original/);
 await assert.rejects(f.append('add_accrued',{sourceId:f.source,evidence:'SYNTHETIC',amountCents:1},1,id(312),owner,id(311)),/selection/);
 await f.db.query('delete from auth.sessions where user_id=$1',[owner]);await assert.rejects(f.append('freeze',freeze,4,id(312)),/session/);
});
test('T23 protected R0 and source amount tampering, foreign worker and unaccrued originals are enforced in SQL',async t=>{
 const f=await payoutFixture();t.after(()=>f.db.close());
 const zeroJob=id(500),zeroAgreement=id(501),zeroRequest=id(502);
 await f.db.query("insert into public.one_off_bookings select $1,business_id,'assigned',currency,array[$2::uuid],duration_minutes,recurring_schedule_id,selection,version from public.one_off_bookings where id=$3",[zeroJob,worker,job]);
 await f.call('agree',{bookingId:zeroJob,agreementId:zeroAgreement,kind:'existing',originalVersion:1,workers:[{userId:worker,amountCents:0}],originalPeriod:'2026-09',agreementEvidence:'SYNTHETIC protected R0',entitlementEvidence:'SYNTHETIC protected terms'});
 await f.db.query("update public.one_off_bookings set status='completed' where id=$1",[zeroJob]);await f.call('accrue',{...accrue(),bookingId:zeroJob,agreementId:zeroAgreement,requestId:zeroRequest});
 const zero=(await f.db.query('select id from public.adjustment_review_sources where booking_id=$1',[zeroJob])).rows[0].id;
 await f.append('create',create,0,id(301));
 await f.append('add_accrued',{sourceId:zero,evidence:'SYNTHETIC explicit zero'},1,id(302));assert.equal((await f.state()).state.lines[0].amountCents,0);
 const payload={kind:'visit',sourceId:f.source,bookingId:job,originalPeriod:'2026-09',amountCents:99999,priorClearedCents:0,sourceReference:'invented',evidence:'SYNTHETIC'};
 await assert.rejects(f.append('add_line',payload,2,id(303)),/accrued original/);
 const other=(await f.db.query('select id from public.adjustment_review_sources where worker_id<>$1',[worker])).rows[0].id;
 await assert.rejects(f.append('add_accrued',{sourceId:other,evidence:'SYNTHETIC wrong worker'},2,id(303)),/accrued original/);
 // A completed booking plus a registered review source is insufficient without durable accrual.
 const fakeJob=id(510),fakeSource=id(511);await f.db.query("insert into public.one_off_bookings select $1,business_id,'completed',currency,array[$2::uuid],duration_minutes,recurring_schedule_id,selection,version from public.one_off_bookings where id=$3",[fakeJob,worker,job]);
 await f.as(owner,()=>f.db.query('select public.append_earnings_adjustment($1,$2,0,$2,$3,$4)',[a,fakeSource,'register_source',JSON.stringify({sourceId:fakeSource,bookingId:fakeJob,workerId:worker,originalVersion:1,originalCents:100,originalPeriod:'2026-09',agreementEvidence:'SYNTHETIC review only',originalRecordEvidence:'SYNTHETIC no accrual'})]));
 await assert.rejects(f.append('add_accrued',{sourceId:fakeSource,evidence:'SYNTHETIC no accrual'},2,id(303)),/accrued original/);
 await f.append('add_accrued',{sourceId:f.source,evidence:'SYNTHETIC positive worker'},2,id(303));await f.append('freeze',freeze,3,id(304));await f.append('approve',approval,4,id(305));assert.equal((await f.state()).state.approval.totalCents,17501);
});
test('T23 real local HTTP forms reach SQL for accrued selection, freeze, approval, submission and source reconciliation',async t=>{
 const {createStagingServer}=await import('../src/staging-server.js');const f=await payoutFixture();t.after(()=>f.db.close());
 const createClient=()=>({auth:{signInWithPassword:async()=>({data:{session:{expires_at:Date.now()/1000+3600}}}),getUser:async()=>({data:{user:{id:owner}}}),signOut:async()=>({})},
 from(table){const filters=[];const result=async()=>{
 if(table==='businesses')return{data:(await f.db.query("select * from public.businesses where status='active'")).rows};
 if(table==='business_memberships')return{data:(await f.db.query("select * from public.business_memberships where user_id=$1 and status='active'",[owner])).rows};
 assert.ok(['settlement_review_statements','settlement_review_events'].includes(table));assert.ok(filters.every(([k])=>['business_id','id','statement_id'].includes(k)));
 return{data:await f.as(owner,async()=>(await f.db.query('select * from public.'+table+' where '+filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')+(table==='settlement_review_events'?' order by version':''),filters.map(([,v])=>v))).rows)};
 };return{select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},range:()=>result(),then(resolve,reject){result().then(resolve,reject);}};},
 rpc:async(name,p)=>{if(name==='staff_context')return{data:[{user_id:worker,label:'SYNTHETIC cleaner'}]};assert.equal(name,'append_monthly_settlement');try{return{data:(await f.append(p.p_type,p.p_payload,p.p_version,p.p_key,owner,p.p_statement_id,p.p_business_id)).rows[0].append_monthly_settlement};}catch(e){return{error:{code:e.code}};}}
 });
 const server=createStagingServer({createClient});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=synthetic%40example.test&password=synthetic',redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
 const path='/monthly-settlements?business='+a;const post=async(values,saved=true)=>fetch(base+path+(saved?'&statement='+id(300):''),{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values),redirect:'manual'});
 const body=(action,version,key,extra)=>({action,version:String(version),event_key:id(key),...extra});
 assert.equal((await post(body('create',0,301,{statement_id:id(300),worker_id:worker,period:'2026-09',calendar_evidence:'SYNTHETIC calendar',closed_dates:''}),false)).status,303);
 assert.equal((await post(body('add_accrued',1,302,{source_id:f.source,evidence:'SYNTHETIC accrued source'}))).status,303);
 const page=await fetch(base+path+'&statement='+id(300),{headers:{Cookie:cookie}});assert.equal(page.status,200);assert.match(await page.text(),/Include approved adjustment/);
 assert.equal((await post(body('freeze',2,303,{reference:'SYNTHETIC freeze',full_pay_review:'SYNTHETIC full pay'}))).status,303);
 assert.equal((await post(body('approve',3,304,{reference:'SYNTHETIC approval',payment_details:'SYNTHETIC example details'}))).status,303);
 assert.equal((await post(body('submit',4,305,{reference:'SYNTHETIC HTTP transfer',amount:'175.01'}))).status,303);
 assert.equal((await post(body('reconcile',5,306,{transfer_id:id(305),outcome:'cleared',cleared:'175.01',remaining_failed:'false',['allocation_'+id(302)]:'175.01',clearing_evidence:'SYNTHETIC no money',allocation_evidence:'SYNTHETIC source match',reference:'SYNTHETIC cleared'}))).status,303);
 assert.equal((await f.state()).state.transfers[0].clearedCents,17501);
});
test('T23 disputed linked adjustment invalidates approval, resolution requires new freeze and retains clearing',async t=>{
 const f=await payoutFixture();t.after(()=>f.db.close());await prepared(f);
 await f.adjust('propose',{sourceId:f.source,kind:'reimbursement',deltaCents:5000,reason:'SYNTHETIC expense',evidence:'SYNTHETIC receipt',occurrenceReference:'t23-dispute'},1,id(600));
 await f.adjust('approve',{adjustmentId:id(600),reason:'SYNTHETIC approved',originalVerificationEvidence:'SYNTHETIC original',entitlementReviewEvidence:'SYNTHETIC entitlement'},2,id(601));
 await assert.rejects(f.append('add_adjustment',{sourceId:id(600),evidence:'SYNTHETIC unfrozen'},4,id(602)),/correction required/);
 await f.adjust('freeze_review',{adjustmentId:id(600),reference:'SYNTHETIC frozen'},3,id(603));
 await f.append('add_adjustment',{sourceId:id(600),evidence:'SYNTHETIC delta'},4,id(604));await f.append('freeze',freeze,5,id(605));await f.append('approve',approval,6,id(606));
 await f.adjust('raise_dispute',{adjustmentId:id(600),reason:'SYNTHETIC dispute',evidence:'SYNTHETIC worker evidence'},4,id(607));
 await assert.rejects(f.append('submit',{amountCents:22501,reference:'SYNTHETIC denied'},7,id(608)),/adjustment changed/);
 await f.append('dispute',{lineId:id(604),reason:'SYNTHETIC disputed delta',evidence:'SYNTHETIC separate review'},7,id(608),worker);
 await f.append('freeze',freeze,8,id(609));await f.append('approve',approval,9,id(610));await f.append('submit',{amountCents:17501,reference:'SYNTHETIC undisputed only'},10,id(611));
 const s=(await f.state()).state;assert.deepEqual(s.transfers[0].remainingLines,{[id(302)]:17501});assert.equal(s.lines[1].disputed,true);
 await assert.rejects(f.adjust('simulate_settlement',{adjustmentId:id(600),amountCents:5000,reference:'SYNTHETIC duplicate'},5,id(612)),/review|undisputed|monthly/);
});
