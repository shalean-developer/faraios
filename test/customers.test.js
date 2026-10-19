import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseCustomerForm,renderCustomers,saveCustomerRecord} from '../src/customers.js';
const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',staff='00000000-0000-4000-8000-000000000003';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
test('customer input validation, escaped notes and scoped optimistic writes',async()=>{
 assert.equal(parseCustomerForm(new URLSearchParams({name:' Test ',email:'test@example.test',status:'active'})).name,'Test');
 for(const f of [{name:'',status:'active'},{name:'A',email:'bad',status:'active'},{name:'A',status:'bad'}])assert.throws(()=>parseCustomerForm(new URLSearchParams(f)));
 assert.throws(()=>parseCustomerForm(new URLSearchParams({label:'Home',address_line:'',status:'active'}),true));
 const html=renderCustomers({id:a,name:'Business'},[],{id:b,name:'<script>',private_notes:'</textarea><script>',version:1},[]);assert.doesNotMatch(html,/<script>/);assert.match(html,/Private office notes/);assert.match(html,/Add address/);
 const filters=[];const query={update(){return this;},eq(k,v){filters.push([k,v]);return this;},select:async()=>({data:[]})};
 await assert.rejects(saveCustomerRecord({from:()=>query},a,{name:'X'},{id:b,version:2}),e=>e.status===409);assert.deepEqual(filters,[['business_id',a],['id',b],['version',2]]);
});
test('Postgres customer notes and addresses enforce tenant/role boundaries, versions and audit',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const path of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql'])await db.exec(await readFile(new URL('../database/'+path,import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2),($3)',[owner,manager,staff]);await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($2,$5,'staff')",[a,b,owner,manager,staff]);
 const asUser=async(id,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await fn();}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}};
 const insert=(business,name)=>db.query("insert into public.business_customers(business_id,name,private_notes) values($1,$2,$3) returning id",[business,name,'Private '+name]);
 const ca=(await asUser(owner,()=>insert(a,'A customer'))).rows[0].id,cb=(await asUser(manager,()=>insert(b,'B customer'))).rows[0].id;
 assert.deepEqual((await asUser(manager,()=>db.query('select name,private_notes from public.business_customers'))).rows,[{name:'B customer',private_notes:'Private B customer'}]);
 assert.equal((await asUser(staff,()=>db.query('select * from public.business_customers'))).rows.length,0);
 await assert.rejects(asUser(manager,()=>insert(a,'Forbidden')),/row-level security/);await assert.rejects(asUser(staff,()=>insert(b,'Forbidden')),/row-level security/);
 const address=(await asUser(manager,()=>db.query("insert into public.customer_addresses(business_id,customer_id,label,address_line) values($1,$2,'Home','Synthetic address') returning id",[b,cb]))).rows[0].id;
 await asUser(manager,()=>db.query("insert into public.customer_addresses(business_id,customer_id,label,address_line) values($1,$2,'Office','Second address')",[b,cb]));
 assert.equal((await asUser(manager,()=>db.query('select * from public.customer_addresses'))).rows.length,2);
 assert.equal((await asUser(staff,()=>db.query('select * from public.customer_addresses'))).rows.length,0);
 await assert.rejects(asUser(owner,()=>db.query("insert into public.customer_addresses(business_id,customer_id,label,address_line) values($1,$2,'Bad','Foreign')",[b,ca])),/foreign key/);
 await assert.rejects(asUser(owner,()=>db.query('update public.business_customers set business_id=$1 where id=$2',[b,ca])),/immutable/);
 await assert.rejects(asUser(owner,()=>db.query('update public.customer_addresses set customer_id=$1 where id=$2',[ca,address])),/immutable/);
 await asUser(manager,()=>db.query("update public.business_customers set private_notes='Updated private note' where id=$1 and version=1",[cb]));
 assert.equal((await asUser(manager,()=>db.query("update public.business_customers set name='Stale' where id=$1 and version=1 returning id",[cb]))).rows.length,0);
 const event=(await db.query("select * from audit.events where entity_table='business_customers' and operation='UPDATE'")).rows[0];assert.equal(event.actor_user_id,manager);assert.equal(event.old_record.private_notes,'Private B customer');assert.equal(event.new_record.private_notes,'Updated private note');
 await assert.rejects(asUser(manager,()=>db.query('delete from public.business_customers where id=$1',[cb])),/permission denied/);
 await db.query("update public.business_memberships set status='suspended' where user_id=$1",[manager]);assert.equal((await asUser(manager,()=>db.query('select * from public.business_customers'))).rows.length,0);
 }finally{await db.close();}
});
