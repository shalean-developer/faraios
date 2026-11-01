import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,id,a,b,worker,lead,owner,manager,job,agree,accrue} from './t22-earnings.test.js';
import {renderCleanerPortal,cleanerPortalData} from '../src/cleaner-portal.js';
export async function portalFixture(db){
 const f=await fixture(db);
 await f.db.exec(`alter table public.one_off_bookings add column starts_at timestamptz default '2026-11-01T07:00Z',add column local_start text default '2026-11-01T09:00',add column time_zone text default 'Africa/Johannesburg',add column customer_snapshot jsonb default '{"name":"SYNTHETIC customer","private_notes":"MUST NOT LEAK"}',add column address_snapshot jsonb default '{"address_line":"SYNTHETIC street","private":"MUST NOT LEAK"}'; create table public.staff_profiles(business_id uuid,user_id uuid,display_name text,phone text);`);
 await f.db.exec(await readFile(new URL('../database/t24-cleaner-portal-candidate.sql',import.meta.url),'utf8'));
 f.portal=(section='jobs',user=worker,biz=a,page=0)=>f.as(user,async()=>(await f.db.query('select public.t24_cleaner_portal($1,$2,$3) v',[biz,section,page])).rows[0].v);
 return f;
}
test('T24 database restricts assignments, projection, profile, business, current role and session',async t=>{
 const f=await portalFixture();t.after(()=>f.db.close());
 await f.db.query('insert into public.staff_profiles values($1,$2,$3,$4)',[a,worker,'SYNTHETIC cleaner','000']);
 const own=await f.portal();assert.equal(own.data.length,1);assert.equal(own.data[0].id,job);assert.doesNotMatch(JSON.stringify(own),/MUST NOT LEAK|assigned_staff|price_lines|total_cents/);
 assert.equal((await f.portal('profile')).data.displayName,'SYNTHETIC cleaner');
 for(const args of [['jobs',owner],['jobs',manager],['jobs',worker,b],['bogus'],['jobs',worker,a,-1],['jobs',worker,a,null]])await assert.rejects(f.portal(...args));
 await f.db.query('update public.one_off_bookings set assigned_staff=$1',[ [lead] ]);assert.equal((await f.portal()).data.length,0);
 await f.db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,worker]);await assert.rejects(f.portal(),/denied/);
 await f.db.query("update public.business_memberships set status='active' where business_id=$1 and user_id=$2",[a,worker]);
 await f.db.query('delete from auth.sessions where user_id=$1',[worker]);await assert.rejects(f.portal(),/denied/);
 await assert.rejects(f.as(null,()=>f.db.query("select public.t24_cleaner_portal($1,'jobs',0)",[a]),'anon'),/permission denied/);
});
test('T24 own agreement and exact accrued cents never disclose teammate or create financial rows on replay',async t=>{
 const f=await portalFixture();t.after(()=>f.db.close());await f.call('agree',agree());
 let r=await f.portal('earnings');assert.equal(r.data.length,1);assert.equal(r.data[0].amountCents,17501);assert.equal(r.data[0].accrued,false);assert.equal(r.data[0].sourceId,null);assert.doesNotMatch(JSON.stringify(r),new RegExp(lead));
 await f.complete();await f.call('accrue',accrue());r=await f.portal('earnings');assert.equal(r.data[0].accrued,true);assert.equal(r.data[0].amountCents,17501);
 const baseline=JSON.stringify((await f.db.query('select * from public.adjustment_review_events order by source_id,version')).rows);
 for(let i=0;i<5;i++)assert.deepEqual(await f.portal('earnings'),r);
 assert.equal(JSON.stringify((await f.db.query('select * from public.adjustment_review_events order by source_id,version')).rows),baseline);
 await assert.rejects(f.as(worker,()=>f.db.query('select * from private_t22.agreements')),/permission denied/);
});
test('T24 stable paging, safe render, empty state and fail-closed response validation',async t=>{
 const f=await portalFixture();t.after(()=>f.db.close());
 for(let n=100;n<151;n++)await f.db.query("insert into public.one_off_bookings(id,business_id,status,assigned_staff) values($1,$2,'assigned',$3)",[id(n),a,[worker]]);
 assert.equal((await f.portal()).data.length,51);assert.equal((await f.portal('jobs',worker,a,1)).data.length,2);
 const html=renderCleanerPortal({id:a,name:'<business>'},'jobs',{rows:[{id:job,customerName:'<script>',address:{address_line:'<img>'},status:'assigned',localStart:'2026-11-01T09:00',timeZone:'Africa/Johannesburg',durationMinutes:210}],hasNext:true});
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/Next/);
 assert.match(renderCleanerPortal({id:a,name:'Example'},'schedule',{rows:[]}),/No records/);
 await assert.rejects(cleanerPortalData({rpc:async()=>({data:{userId:lead}})},a,worker,'jobs'),/unavailable/);
});
