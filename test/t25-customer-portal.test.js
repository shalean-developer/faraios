import test from 'node:test';import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {fixture,id,a,b,owner,customer,other,staff,enrol,booking} from '../test-support/t25-fixture.js';
import {customerRoute,customerFormPayload,renderCustomerPortal} from '../src/customer-portal.js';
async function setup(t){const db=new PGlite({extensions:{btree_gist}});t.after(()=>db.close());return fixture(db);}
test('T25 public projection, own relationships, email collision, business isolation and current session enforcement',async t=>{
 const f=await setup(t);const pub=await f.call('public',{},null);assert.equal(pub.name,'Synthetic alpha');assert.doesNotMatch(JSON.stringify(pub),/PRIVATE DEPOT|same@example|memberships|staff_id/);
 for(const action of ['account','history','enrol','link'])await assert.rejects(f.call(action,{},null));
 const rel=await enrol(f);assert.equal((await f.call('account')).customers.length,1);assert.equal((await f.call('account',{},other)).customers.length,0);assert.equal((await f.call('account',{},customer,'beta')).customers.length,0);
 await assert.rejects(f.call('address',{requestId:id(500),customer:rel.customer,label:'Stolen',address_line:'wrong'},other),/denied/);
 assert.equal((await f.as(customer,()=>f.db.query('select * from public.business_customers'))).rows.length,0);
 await assert.rejects(f.as(customer,()=>f.db.query('select * from private_t25.relationships')),/permission denied/);
 await assert.rejects(f.call('link',{requestId:id(501),customer:rel.customer,user:other,evidence:'Email match'},other),/denied/);
 await f.call('link',{requestId:id(502),customer:rel.customer,user:other,evidence:'Synthetic independently verified relationship'},owner);
 assert.equal((await f.call('account',{},other)).customers.length,1);
 const office=(await f.as(owner,()=>f.db.query("select public.t25_customer_access($1,'links',$2) v",[a,JSON.stringify({customer:rel.customer})]))).rows[0].v;assert.equal(office.links.length,2);assert.equal(office.route,'alpha');
 await assert.rejects(f.as(other,()=>f.db.query("select public.t25_customer_access($1,'links',$2)",[a,JSON.stringify({customer:rel.customer})])),/denied/);
 await f.call('revoke',{requestId:id(503),customer:rel.customer,user:other,evidence:'Synthetic access revoked'},owner);
 assert.equal((await f.call('account',{},other)).customers.length,0);
 await f.db.query('update auth.users set is_anonymous=true where id=$1',[customer]);await assert.rejects(f.call('account'),/denied/);await f.db.query('update auth.users set is_anonymous=false where id=$1',[customer]);
 await f.db.query('delete from auth.sessions where user_id=$1',[customer]);await assert.rejects(f.call('account'),/denied/);
 await assert.rejects(f.call('public',{},null,'unknown'),/unavailable/);
});
test('T25 authoritative draft snapshots, idempotency, private history and failed-write rollback',async t=>{
 const f=await setup(t),rel=await enrol(f),p=booking(rel);
 const first=await f.call('book',p);assert.equal(first.status,'draft');assert(first.totalCents>10000);assert(first.durationMinutes>=210);
 assert.deepEqual(await f.call('book',p),first);
 await assert.rejects(f.call('book',{...p,localStart:'2099-11-03T09:00'}),/different details/);
 assert.equal((await f.db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,1);
 assert.equal((await f.db.query('select count(*)::int n from audit.cleaner_reservations')).rows[0].n,0);
 const hist=await f.call('history');assert.equal(hist.rows.length,1);assert.equal(hist.rows[0].id,first.booking);assert.doesNotMatch(JSON.stringify(hist),/assigned_staff|access_notes|private_notes|configuration|same@example/);
 assert.equal((await f.call('history',{},other)).rows.length,0);assert.equal((await f.call('history',{booking:first.booking},customer,'beta')).rows.length,0);
 await f.db.query('update public.business_catalogue set price_cents=99999 where id=$1',[id(110)]);assert.equal((await f.call('history')).rows[0].totalCents,first.totalCents);
 await assert.rejects(f.call('book',{...p,requestId:id(1500)}),e=>e.code==='40001');
 for(const overrides of [{customer:id(999)},{address:id(999)},{totalCents:1},{durationMinutes:1},{scope:{...p.scope,assessment:{additional_cents:0,duration_minutes:15,reason:'Forged'}}},{localStart:'2000-01-01T09:00'},{localStart:'2099-11-02T23:00'},{selection:[{catalogue_id:id(120),quantity:1}]}])await assert.rejects(f.call('book',{...p,requestId:crypto.randomUUID(),...overrides}));
 assert.equal((await f.db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,1);
 const ownContext=await f.as(customer,()=>f.db.query('select public.booking_context($1) v',[a]));assert.deepEqual(ownContext.rows[0].v.staff,[]);
 await assert.rejects(f.as(staff,()=>f.db.query('select public.booking_context($1)',[a])),/denied/);
 // Office workflow and assignment controls remain in force.
 await f.as(owner,()=>f.db.query("update public.one_off_bookings set status='confirmed' where id=$1",[first.booking]));
 await f.as(owner,()=>f.db.query("update public.one_off_bookings set status='assigned',assigned_staff=$2,change_reason='Synthetic assignment' where id=$1",[first.booking,[staff]]));
 assert.equal((await f.db.query('select count(*)::int n from audit.cleaner_reservations')).rows[0].n,1);
});
test('T25 safe form, route and rendering contracts never offer office overrides',async()=>{
 assert.equal(customerRoute('/b/alpha'),'alpha');for(const p of ['/b/../alpha','/b/ALPHA','//evil.test','/b/alpha/other'])assert.equal(customerRoute(p),null);
 const html=renderCustomerPortal('alpha',{name:'<script>',catalogue:[],workingDays:[1],serviceAreas:[],timeZone:'UTC',opensAt:'08:00',closesAt:'18:00'});assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/awaits office confirmation/);
 assert.throws(()=>customerFormPayload(new URLSearchParams({action:'link',requestId:id(2000)}),[]),/Invalid customer action/);
});
