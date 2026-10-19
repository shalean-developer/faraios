import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseBusinessSettings,renderBusinessSettings,saveBusinessSettings} from '../src/business-settings.js';
const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const valid=()=>new URLSearchParams({display_name:'Independent Co',contact_email:'office@example.invalid',contact_phone:'',service_areas:'Area A\nArea B\nArea A',working_days:'1',opens_at:'08:00',closes_at:'17:00',time_zone:'Africa/Johannesburg'});
test('settings validate bounded inputs without injecting business scope',()=>{
 const form=valid();form.set('business_id',b);const parsed=parseBusinessSettings(form);assert.deepEqual(parsed.service_areas,['Area A','Area B']);assert.equal(parsed.business_id,undefined);
 for(const [key,value] of [['opens_at','18:00'],['closes_at','07:00'],['working_days','7'],['contact_email','bad'],['time_zone','bogus'],['display_name','']]){const bad=valid();bad.set(key,value);assert.throws(()=>parseBusinessSettings(bad));}
 const markup=renderBusinessSettings({id:a,name:'<img>'},{display_name:'"><script>',service_areas:['<script>']});assert.doesNotMatch(markup,/<script>|<img>/);assert.match(markup,/&lt;script&gt;/);
});
test('saving settings always scopes the record to the server-authorised business',async()=>{
 let payload;const client={from:()=>({upsert(row){payload=row;return{select:async()=>({data:[{business_id:a}]})};}})};
 await saveBusinessSettings(client,a,{...parseBusinessSettings(valid()),business_id:b});assert.equal(payload.business_id,a);
});
test('Postgres settings permit owners only, separate two businesses and record atomic audit',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query('insert into auth.users values ($1),($2)',[owner,manager]);
 await db.query("insert into public.businesses(id,name,industry) values ($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values ($1,$3,'owner'),($2,$4,'manager')",[a,b,owner,manager]);
 const change=async(id,business,name)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,$2,'{1,2}','08:00','17:00','UTC') on conflict(business_id) do update set display_name=excluded.display_name",[business,name]);}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}};
 await change(owner,a,'Owner A');await assert.rejects(change(manager,b,'Manager B'),/row-level security/);await assert.rejects(change(owner,b,'Foreign B'),/row-level security/);
 const event=(await db.query("select * from audit.events where entity_table='business_settings'")).rows[0];assert.equal(event.actor_user_id,owner);assert.equal(event.new_record.display_name,'Owner A');
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner')",[b,owner]);await change(owner,b,'Owner B');
 assert.deepEqual((await db.query('select display_name from public.business_settings order by business_id')).rows,[{display_name:'Owner A'},{display_name:'Owner B'}]);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[manager]);assert.equal((await db.query('select * from public.business_settings')).rows.length,0);
 await assert.rejects(db.query('delete from audit.events'),/permission denied/);await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,owner]);await assert.rejects(change(owner,a,'Suspended'),/row-level security/);
 }finally{await db.close();}
});
