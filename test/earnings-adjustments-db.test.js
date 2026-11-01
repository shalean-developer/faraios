import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {earningsAdjustmentEvent} from '../src/earnings-adjustments.js';
import {readAdjustmentSource,teamEarningsReview} from '../src/adjustment-reviews.js';
const id=n=>'cd000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),worker=id(3),other=id(4),a=id(10),b=id(11),booking=id(20),source=id(30);
export async function adjustmentDatabase(fn){
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create schema auth;create schema audit;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated;");
 await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await db.exec('create table public.one_off_bookings(id uuid primary key,business_id uuid references public.businesses(id),assigned_staff uuid[]);');
 const migration=await readFile(new URL('../database/earnings-adjustments-draft.sql',import.meta.url),'utf8');
 assert.equal(migration,await readFile(new URL('../supabase/migrations/20261022105001_t04_synthetic_earnings_adjustment_reviews.sql',import.meta.url),'utf8'));
 await db.exec(migration);
 await db.query('insert into auth.users values($1),($2),($3),($4)',[owner,manager,worker,other]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'QA A','cleaning'),($2,'QA B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($1,$3,'manager'),($1,$4,'staff'),($1,$5,'staff'),($6,$3,'owner')",[a,owner,manager,worker,other,b]);
 await db.query('insert into public.one_off_bookings values($1,$2,array[$3::uuid,$4::uuid])',[booking,a,worker,other]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 const append=(uid,type,payload,version,key,scope=a,sourceId=source)=>as(uid,()=>db.query('select public.append_earnings_adjustment($1,$2,$3,$4,$5,$6) id',[scope,sourceId,version,key,type,JSON.stringify(payload)]));
 await fn({db,as,append});
 }finally{await db.close();}
}
const original={sourceId:source,bookingId:booking,workerId:worker,originalVersion:3,originalCents:250000,originalPeriod:'2026-10',agreementEvidence:'SYNTHETIC accepted terms',originalRecordEvidence:'SYNTHETIC R2500 paid'};
const proposal={sourceId:source,kind:'reimbursement',deltaCents:5000,reason:'Missed R50',evidence:'SYNTHETIC receipt',occurrenceReference:' missed1 '};
const approve=adjustmentId=>({adjustmentId,reason:'Verified',originalVerificationEvidence:'Original verified',entitlementReviewEvidence:'Full obligations reviewed'});
test('T22 database zero lead and disputed correction preserve other worker amount and exact retry history',()=>adjustmentDatabase(async({db,append,as})=>{
 const second=id(31);
 await append(manager,'register_source',{...original,originalCents:0},0,id(110));
 await append(manager,'register_source',{...original,sourceId:second,workerId:other,originalCents:30000},0,id(111),a,second);
 await append(manager,'propose',{...proposal,sourceId:second},1,id(112),a,second);
 await append(owner,'approve',approve(id(112)),2,id(113),a,second);
 await append(owner,'approve',approve(id(112)),2,id(113),a,second);
 await append(manager,'propose',{...proposal,occurrenceReference:'lead-review'},1,id(114));
 await append(worker,'raise_dispute',{adjustmentId:id(114),reason:'Review lead separately',evidence:'TEST'},2,id(115));
 const client={from(table){const filters=[];return{select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},range(){return this;},then(resolve,reject){
  const allowed={adjustment_review_sources:true,adjustment_review_events:true};if(!allowed[table])throw new Error('Unexpected table');
  as(owner,()=>db.query('select * from public.'+table+' where '+filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')+(table==='adjustment_review_events'?' order by version':''),filters.map(([,v])=>v))).then(result=>resolve({data:result.rows}),reject);
 }}}};
 const records=[];for(const ref of [source,second])records.push(await readAdjustmentSource(client,a,ref));
 const review=teamEarningsReview(records,a);
 assert.equal(review[0].reviewedCents,0);assert.equal(review[0].disputed,true);
 assert.equal(review[1].reviewedCents,30000);assert.equal(review[1].reimbursementCents,5000);assert.equal(review[1].disputed,false);
 assert.equal(records[1].state.events.length,3);
 assert.throws(()=>teamEarningsReview(records,b),/scope/);
 assert.throws(()=>teamEarningsReview([records[0],records[0]],a),/source/);
 assert.equal((await as(other,()=>db.query('select * from public.adjustment_review_sources'))).rows.length,1);
}));
test('database journal preserves correction-only flow and reconstructs core including canonical replay',()=>adjustmentDatabase(async({db,append,as})=>{
 await append(manager,'register_source',original,0,id(100));
 await append(manager,'propose',proposal,1,id(101));
 await append(owner,'approve',approve(id(101).toUpperCase()),2,id(102));
 await append(owner,'freeze_review',{adjustmentId:id(101),reference:'review'},3,id(103));
 await assert.rejects(append(owner,'simulate_settlement',{adjustmentId:id(101),amountCents:255000,reference:'TEST'},4,id(104)),/Correction only/);
 await append(owner,'simulate_settlement',{adjustmentId:id(101).toUpperCase(),amountCents:5000,reference:'TEST-NO-MONEY'},4,id(105));
 assert.equal((await append(owner,'simulate_settlement',{adjustmentId:id(101),amountCents:5000,reference:'TEST-NO-MONEY'},0,id(105))).rows[0].id,source);
 await assert.rejects(append(owner,'simulate_settlement',{adjustmentId:id(101),amountCents:5000,reference:'again'},5,id(106)),/unsimulated/);
 const events=(await as(owner,()=>db.query('select * from public.adjustment_review_events order by version'))).rows;
 let state=null;for(const e of events)state=earningsAdjustmentEvent(state,{businessId:e.business_id,actorId:e.actor_id,role:e.actor_role,key:e.event_key,expectedVersion:e.version-1,type:e.event_type,payload:e.payload,at:new Date(e.created_at).toISOString()});
 assert.equal(state.sources[0].originalCents,250000);assert.equal(state.adjustments[0].simulation.deltaCents,5000);assert.equal(state.execution,'disabled');
 assert.equal((await db.query('select version from public.adjustment_review_sources')).rows[0].version,5);
}));
test('database role, source scope and own-record RLS fail closed; direct mutations are denied',()=>adjustmentDatabase(async({db,append,as})=>{
 await assert.rejects(append(worker,'register_source',original,0,id(100)),/own review/);
 await assert.rejects(append(manager,'register_source',original,0,id(100),b),/scope mismatch/);
 await append(manager,'register_source',original,0,id(100));
 await append(manager,'propose',proposal,1,id(101));
 await assert.rejects(append(manager,'approve',approve(id(101)),2,id(102)),/Owner/);
 await assert.rejects(append(other,'raise_dispute',{adjustmentId:id(101),reason:'x',evidence:'x'},2,id(103)),/unavailable/);
 assert.equal((await as(other,()=>db.query('select * from public.adjustment_review_events'))).rows.length,0);
 assert.equal((await as(worker,()=>db.query('select * from public.adjustment_review_events'))).rows.length,2);
 await append(worker,'raise_dispute',{adjustmentId:id(101),reason:'Review',evidence:'Own worker'},2,id(104));
 await assert.rejects(append(owner,'approve',approve(id(101)),3,id(105)),/Undisputed/);
 await assert.rejects(as(owner,()=>db.query('update public.adjustment_review_sources set version=99')),/permission denied/);
 await assert.rejects(as(owner,()=>db.query('delete from public.adjustment_review_events')),/permission denied/);
 await db.exec('set role anon');await assert.rejects(db.query('select * from public.adjustment_review_sources'),/permission denied/);await db.exec('reset role');
 await db.query("update public.business_memberships set role='staff' where user_id=$1 and business_id=$2",[owner,a]);
 await assert.rejects(append(owner,'approve',approve(id(101)),3,id(106)),/own review/);
}));
test('direct RPC rejects poison payloads and stale approvals without journal mutations',()=>adjustmentDatabase(async({db,append})=>{
 for(const patch of [{originalCents:'250000'},{originalCents:null},{originalVersion:0},{workerId:id(99)},{agreementEvidence:'\u00a0'},{originalPeriod:'2026-99'},{extra:'x'}])await assert.rejects(append(manager,'register_source',{...original,...patch},0,id(100)));
 await assert.rejects(append(manager,'register_source',original,0,'00000000-0000-0000-0000-000000000000'));
 assert.equal((await db.query('select count(*) n from public.adjustment_review_sources')).rows[0].n,0);
 await append(manager,'register_source',original,0,id(100));
 for(const patch of [{deltaCents:'5000'},{deltaCents:0},{deltaCents:-1},{kind:'fine'},{workerId:other},{evidence:null},{evidence:'\u00a0'}])await assert.rejects(append(manager,'propose',{...proposal,...patch},1,id(101)));
 await append(manager,'propose',proposal,1,id(101));
 await append(manager,'propose',{...proposal,occurrenceReference:'other'},2,id(102));
 await append(owner,'approve',approve(id(101)),3,id(103));
 await assert.rejects(append(owner,'approve',approve(id(102)),4,id(104)),/current proposal/);
 await assert.rejects(append(owner,'freeze_review',{adjustmentId:id(101),reference:'r'},0,id(105)),/History changed/);
 assert.equal((await db.query('select count(*) n from public.adjustment_review_events')).rows[0].n,4);
}));
