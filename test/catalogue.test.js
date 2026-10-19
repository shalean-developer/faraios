import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {listCatalogue,parseCatalogueItem,renderCatalogue,saveCatalogueItem,deleteCatalogueItem,renderCatalogueDelete} from '../src/catalogue.js';
const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',staff='00000000-0000-4000-8000-000000000003';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const form=()=>new URLSearchParams({kind:'service',name:'Synthetic service',description:'',pricing_model:'fixed',unit_label:'visit',price:'250.01',team_size:'2',status:'inactive'});
test('catalogue money uses exact cents and rejects ambiguous prices and invalid options',()=>{
 assert.equal(parseCatalogueItem(form()).price_cents,25001);
 for(const price of ['-1','1e3','1.001','NaN','1,000.00','21474836.48']){const f=form();f.set('price',price);assert.throws(()=>parseCatalogueItem(f));}
 for(const [key,value] of [['kind','other'],['pricing_model','custom'],['team_size','0'],['team_size','1.5'],['status','bogus'],['name','']]){const f=form();f.set(key,value);assert.throws(()=>parseCatalogueItem(f));}
 const f=form();f.set('kind','extra');f.set('team_size','');f.set('price','0');assert.equal(parseCatalogueItem(f).team_size,null);assert.equal(parseCatalogueItem(f).price_cents,0);
 const markup=renderCatalogue({id:a,name:'<script>'},[],false);assert.doesNotMatch(markup,/<script>|<form[^>]*method="post"/);assert.match(markup,/Read-only catalogue/);
});
test('catalogue updates use business, item and version predicates; conflicts fail explicitly',async()=>{
 const filters=[];let payload;
 const query={eq(k,v){filters.push([k,v]);return this;},select:async()=>({data:[]})};
 const client={from:()=>({update(row){payload=row;return query;}})};
 await assert.rejects(saveCatalogueItem(client,a,parseCatalogueItem(form()),{id:b,version:2}),e=>e.status===409);
 assert.deepEqual(filters,[['business_id',a],['id',b],['version',2]]);assert.equal(payload.business_id,undefined);
});
test('catalogue Postgres separates businesses, limits manager/staff and preserves audit/version history',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const path of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','catalogue-delete-draft.sql'])await db.exec(await readFile(new URL('../database/'+path,import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2),($3)',[owner,manager,staff]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($2,$5,'staff')",[a,b,owner,manager,staff]);
 const asUser=async(id,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await fn();}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}};
 const insert=(business,price)=>db.query("insert into public.business_catalogue(business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size) values($1,'service','Synthetic','fixed','visit',$2,'ZAR',2) returning id",[business,price]);
 const first=(await asUser(owner,()=>insert(a,25000))).rows[0].id;await asUser(owner,()=>insert(b,40000));
 assert.deepEqual((await asUser(manager,()=>db.query('select business_id,price_cents from public.business_catalogue'))).rows,[{business_id:b,price_cents:40000}]);
 assert.equal((await asUser(staff,()=>db.query('select * from public.business_catalogue'))).rows.length,0);
 await assert.rejects(asUser(manager,()=>insert(b,1)),/row-level security/);
 const changed=await asUser(manager,()=>db.query('update public.business_catalogue set price_cents=1 where business_id=$1 returning id',[b]));assert.equal(changed.rows.length,0);
 await asUser(owner,()=>db.query('update public.business_catalogue set price_cents=26000 where id=$1 and version=1',[first]));
 assert.equal((await db.query('select version from public.business_catalogue where id=$1',[first])).rows[0].version,2);
 assert.equal((await asUser(owner,()=>db.query('update public.business_catalogue set price_cents=27000 where id=$1 and version=1 returning id',[first]))).rows.length,0);
 await assert.rejects(asUser(owner,()=>db.query('update public.business_catalogue set business_id=$1 where id=$2',[b,first])),/immutable/);
 const event=(await db.query("select * from audit.events where entity_table='business_catalogue' and operation='UPDATE'")).rows[0];assert.equal(event.actor_user_id,owner);assert.equal(event.old_record.price_cents,25000);assert.equal(event.new_record.price_cents,26000);
 assert.equal((await asUser(manager,()=>db.query('delete from public.business_catalogue returning id'))).rows.length,0);
 assert.equal((await asUser(staff,()=>db.query('delete from public.business_catalogue returning id'))).rows.length,0);
 assert.equal((await asUser(owner,()=>db.query('delete from public.business_catalogue where id=$1 and business_id=$2 returning id',[first,b]))).rows.length,0);
 assert.equal((await asUser(owner,()=>db.query('delete from public.business_catalogue where id=$1 and version=1 returning id',[first]))).rows.length,0);
 assert.equal((await asUser(owner,()=>db.query('delete from public.business_catalogue where id=$1 and version=2 returning id',[first]))).rows.length,1);
 const removed=(await db.query("select * from audit.events where entity_table='business_catalogue' and operation='DELETE'")).rows[0];assert.equal(removed.actor_user_id,owner);assert.equal(removed.old_record.id,first);assert.equal(removed.new_record,null);
 await db.query("update public.business_memberships set status='suspended' where user_id=$1",[owner]);assert.equal((await asUser(owner,()=>db.query('select * from public.business_catalogue'))).rows.length,0);
 }finally{await db.close();}
});

test('delete scopes requests and renders escaped owner confirmation',async()=>{
 const filters=[];const query={eq(k,v){filters.push([k,v]);return this;},select:async()=>({data:[]})};
 await assert.rejects(deleteCatalogueItem({from:()=>({delete:()=>query})},a,b,2),e=>e.status===409);
 assert.deepEqual(filters,[['business_id',a],['id',b],['version',2]]);
 const item={id:b,kind:'extra',name:'<script>',version:2};
 assert.match(renderCatalogueDelete({id:a,name:'A'},item),/Confirm delete/);
 assert.doesNotMatch(renderCatalogueDelete({id:a,name:'A'},item),/<script>/);
 assert.match(renderCatalogue({id:a,name:'A'},[{...item,price_cents:0,pricing_model:'fixed'}],true,null,'',false,'extra'),/Delete extra/);
 assert.doesNotMatch(renderCatalogue({id:a,name:'A'},[{...item,price_cents:0,pricing_model:'fixed'}],false),/Delete extra/);
});


test('catalogue reads every scoped page before filtering and resolving applicability',async()=>{
 const rows=Array.from({length:600},(_,i)=>({id:'item-'+i,business_id:a,kind:'extra',name:'Extra '+String(i).padStart(3,'0'),price_cents:100,is_active:true,unit_label:'visit',pricing_model:'fixed'}));
 const service={id:'last-service',business_id:a,kind:'service',name:'Z service',cleaning_config:{extras:['item-599'],base_minutes:60},price_cents:100,is_active:true,team_size:1};rows.push(service);
 const ranges=[];const client={from:table=>{assert.equal(table,'business_catalogue');return {select(){return this;},eq(k,v){assert.equal(k,'business_id');assert.equal(v,a);return this;},order(){return this;},async range(start,end){ranges.push([start,end]);return {data:rows.slice(start,end+1)};}};}};
 const loaded=await listCatalogue(client,a);assert.equal(loaded.length,601);assert.deepEqual(ranges,[[0,499],[500,999]]);
 const html=renderCatalogue({id:a,name:'A'},loaded,true,null,'',false,'extra',{q:'Extra 599',service:'last-service'});assert.match(html,/<h3>Extra 599/);assert.match(html,/catalogue-service-chip">Z service/);assert.match(html,/1 of 600 extras/);
 rows[600]={...service,business_id:'foreign'};await assert.rejects(()=>listCatalogue(client,a),/Catalogue unavailable/);
});
