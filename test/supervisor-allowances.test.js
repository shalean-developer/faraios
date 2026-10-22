import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {allowanceMonth,parseSupervisorAllowance,previewMonthlyEarnings,renderSupervisorAllowances,saveSupervisorAllowance} from '../src/supervisor-allowances.js';

const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),foreign=id(4),otherStaff=id(5),a=id(10),b=id(20);
const migration='../supabase/migrations/20261022070131_supervisor_monthly_allowances.sql';
const addMonth=value=>{const date=new Date(value+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);return date.toISOString().slice(0,10);};
const form=()=>new URLSearchParams({allowance_enabled:'yes',allowance_amount:'500.01',allowance_version:'0',effective_month:'2027-01',allowance_reason:'Agreed supervisor allowance'});

test('allowance form validates amount/month/version, leaves Off at zero and ignores client authority fields',async()=>{
 const f=form();f.set('business_id',b);f.set('actor_user_id',foreign);
 assert.deepEqual(parseSupervisorAllowance(f),{p_version:0,p_enabled:true,p_amount_cents:50001,p_effective_month:'2027-01-01',p_reason:'Agreed supervisor allowance'});
 for(const [key,value]of [['allowance_enabled','true'],['allowance_version',''],['allowance_version','-1'],['allowance_version','2147483647'],['allowance_version','1.1'],['allowance_amount','0'],['allowance_amount','-1'],['allowance_amount','1.001'],['allowance_amount','21474836.48'],['effective_month','2027-13'],['effective_month','2027-01-02'],['effective_month','0000-01'],['allowance_reason',' '],['allowance_reason','x'.repeat(501)]]){
  const bad=new URLSearchParams(f);bad.set(key,value);assert.throws(()=>parseSupervisorAllowance(bad),key+': '+value);
 }
 const off=new URLSearchParams(f);off.set('allowance_enabled','no');off.set('allowance_amount','500');assert.equal(parseSupervisorAllowance(off).p_amount_cents,0);
 let captured;await saveSupervisorAllowance({rpc:async(name,p)=>{captured={name,p};return {data:1};}},a,staff,f);
 assert.equal(captured.name,'configure_supervisor_allowance');assert.equal(captured.p.p_business_id,a);assert.equal(captured.p.p_user_id,staff);assert.equal(captured.p.actor_user_id,undefined);
 await assert.rejects(saveSupervisorAllowance({rpc:async()=>({error:{code:'40001'}})},a,staff,f),e=>e.status===409);
 assert.equal(allowanceMonth('2027-12'),'2027-12-01');
});

test('monthly preview separates booking pay, retains earlier months and resolves scheduled revisions by effective month',()=>{
 const args={businessId:a,userId:staff,month:'2027-01',changes:[],bookingCents:30000};
 assert.deepEqual(previewMonthlyEarnings(args),{kind:'preview',businessId:a,userId:staff,month:'2027-01',bookingCents:30000,allowanceCents:0,totalCents:30000,policyVersion:0});
 const changes=[{business_id:a,user_id:staff,version:1,effective_month:'2027-01-01',enabled:true,amount_cents:50000},{business_id:a,user_id:staff,version:2,effective_month:'2027-02-01',enabled:false,amount_cents:0},{business_id:a,user_id:staff,version:3,effective_month:'2027-01-01',enabled:true,amount_cents:70000},{business_id:a,user_id:otherStaff,version:1,effective_month:'2027-01-01',enabled:true,amount_cents:99999}];
 const source=structuredClone(changes);
 assert.equal(previewMonthlyEarnings({...args,changes,month:'2026-12'}).allowanceCents,0);
 assert.deepEqual([previewMonthlyEarnings({...args,changes}).allowanceCents,previewMonthlyEarnings({...args,changes}).totalCents],[70000,100000]);
 for(const month of ['2027-02','2027-03'])assert.equal(previewMonthlyEarnings({...args,changes,month}).allowanceCents,0);
 assert.equal(previewMonthlyEarnings({...args,changes,bookingCents:null}).totalCents,null);
 assert.throws(()=>previewMonthlyEarnings({...args,changes:[{...changes[0],business_id:b}]}),/scope/);
 assert.throws(()=>previewMonthlyEarnings({...args,changes,bookingCents:2147483647}),/exceeds/);
 assert.deepEqual(changes,source);
 const html=renderSupervisorAllowances({id:a,name:'<Business>'},{context:{current_month:'2026-12-01',next_month:'2027-01-01',time_zone:'UTC'},changes:[],accounts:[{user_id:staff,label:'<Supervisor>'}]},{owner:true,userId:staff});
 assert.match(html,/Off — booking earnings only/);assert.match(html,/No allowance is accrued or paid/);assert.match(html,/Booking earnings/);assert.match(html,/Change history/);assert.doesNotMatch(html,/<Supervisor>|<Business>/);
 assert.doesNotMatch(renderSupervisorAllowances({id:a,name:'A'},{context:{current_month:'2026-12-01',next_month:'2027-01-01',time_zone:'UTC'},changes:[],accounts:[{user_id:staff,label:'S'}]},{owner:false,userId:staff}),/Save allowance change/);
});

async function fixture(){
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;");
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@faraios.test'),($2,'manager@faraios.test'),($3,'staff@faraios.test'),($4,'foreign@faraios.test'),($5,'other@faraios.test')",[owner,manager,staff,foreign,otherStaff]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($1,$4,'manager'),($1,$5,'staff'),($2,$6,'owner'),($2,$5,'staff'),($2,$7,'staff')",[a,b,owner,manager,staff,foreign,otherStaff]);
 await db.exec(await readFile(new URL(migration,import.meta.url),'utf8'));
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 const context=async(user=owner,biz=a)=>(await as(user,()=>db.query('select public.supervisor_allowance_context($1) c',[biz]))).rows[0].c;
 const next=(await context()).next_month;
 const save=({user=owner,biz=a,recipient=staff,version=0,on=true,amount=50000,month=next,reason='Agreed supervisor allowance'}={})=>as(user,()=>db.query('select public.configure_supervisor_allowance($1,$2,$3,$4,$5,$6,$7) v',[biz,recipient,version,on,amount,month,reason]));
 return {db,as,context,next,save};
}

test('Postgres allowance RPC enforces owner/tenant/staff scope, future months and append-only audited revisions',async()=>{
 const {db,as,context,next,save}=await fixture();try{
 assert.equal((await db.query('select count(*)::int n from public.supervisor_allowance_changes')).rows[0].n,0);
 assert.equal((await context(manager)).next_month,next);
 for(const user of [manager,staff,foreign])await assert.rejects(save({user}),e=>e.code==='42501');
 for(const user of [staff,foreign])await assert.rejects(context(user),e=>e.code==='42501');
 await assert.rejects(save({biz:b}),e=>e.code==='42501');
 await assert.rejects(save({recipient:otherStaff}),/active staff/);await assert.rejects(save({recipient:owner}),/active staff/);
 const current=(await context()).current_month;
 for(const opts of [{month:current},{month:next.slice(0,8)+'02'},{month:'infinity'},{on:true,amount:0},{on:false,amount:1},{on:null},{reason:''},{reason:'x'.repeat(501)},{version:null}])await assert.rejects(save(opts));
 await db.exec('set role anon');await assert.rejects(db.query('select public.supervisor_allowance_context($1)',[a]),e=>e.code==='42501');await assert.rejects(db.query("select public.configure_supervisor_allowance($1,$2,0,true,1,$3,'No')",[a,staff,next]),e=>e.code==='42501');await db.exec('reset role');
 assert.equal((await save()).rows[0].v,1);await assert.rejects(save(),e=>e.code==='40001');
 const first=(await db.query('select * from public.supervisor_allowance_changes')).rows[0];
 const stop=addMonth(next);await save({version:1,on:false,amount:0,month:stop});
 await save({version:2,amount:70000});
 const rows=(await db.query('select * from public.supervisor_allowance_changes order by version')).rows;
 assert.deepEqual(rows[0],first);assert.equal(rows.length,3);
 const apiRows=rows.map(r=>({...r,effective_month:r.effective_month.toISOString().slice(0,10)}));
 const preview=month=>previewMonthlyEarnings({businessId:a,userId:staff,month:month.slice(0,7),changes:apiRows,bookingCents:30000});
 assert.equal(preview(next).totalCents,100000);assert.equal(preview(stop).totalCents,30000);
 for(const user of [owner,manager])assert.equal((await as(user,()=>db.query('select * from public.supervisor_allowance_changes'))).rows.length,3);
 for(const user of [staff,foreign])assert.equal((await as(user,()=>db.query('select * from public.supervisor_allowance_changes'))).rows.length,0);
 for(const query of ['update public.supervisor_allowance_changes set amount_cents=1','delete from public.supervisor_allowance_changes',"insert into public.supervisor_allowance_changes select * from public.supervisor_allowance_changes"]){await assert.rejects(as(owner,()=>db.exec(query)),e=>e.code==='42501');}
 const events=(await db.query("select * from audit.events where entity_table='supervisor_allowance_changes' order by (new_record->>'version')::int")).rows;
 assert.equal(events.length,3);assert.equal(events[0].actor_user_id,owner);assert.equal(events[1].old_record.version,1);assert.equal(events[1].new_record.enabled,false);
 // A failing audit must undo the new revision, preserving all prior rows.
 await db.exec("create function public.fail_allowance_audit() returns trigger language plpgsql as $$begin if new.entity_table='supervisor_allowance_changes' then raise exception 'Synthetic audit failure';end if;return new;end$$;create trigger fail_allowance before insert on audit.events for each row execute function public.fail_allowance_audit();");
 await assert.rejects(save({version:3}),/Synthetic audit failure/);assert.equal((await db.query('select count(*)::int n from public.supervisor_allowance_changes')).rows[0].n,3);
 await db.exec('drop trigger fail_allowance on audit.events;drop function public.fail_allowance_audit();');
 await save({user:foreign,biz:b,amount:10000});assert.equal((await as(owner,()=>db.query('select * from public.supervisor_allowance_changes'))).rows.length,3);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,staff]);await assert.rejects(save({version:3}),/active staff/);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,owner]);await assert.rejects(save({version:3}),e=>e.code==='42501');
 assert.equal((await db.query('select count(*)::int n from public.supervisor_allowance_changes')).rows[0].n,4);
 }finally{await db.close();}
});

test('rollback-only staging acceptance script passes on a disposable fixture and leaves no allowances or businesses behind',async()=>{
 const {db}=await fixture();try{
 await db.exec('create table public.business_accounting_connections(enabled boolean)');
 let script=await readFile(new URL('../scripts/verify-supervisor-allowances-staging.sql',import.meta.url),'utf8');
 script=script.replaceAll('612be091-b1d7-4911-9c3b-143446a9fe27',a).replaceAll('0cc3f518-d64e-40c2-8817-bc14d1ef1420',b);
 const before=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
 const results=await db.exec(script);
 const result=results.flatMap(r=>r.rows??[]).find(r=>r.acceptance)?.acceptance;
 assert.ok(result.checks>=30);assert.equal(result.anonymous_context,'DENIED');
 assert.equal((await db.query('select count(*)::int n from public.supervisor_allowance_changes')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from public.businesses')).rows[0].n,2);
 assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,before);
 }finally{await db.close();}
});
