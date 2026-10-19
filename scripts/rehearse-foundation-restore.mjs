// Offline application-data recovery rehearsal. Never opens a network connection.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const snapshot=JSON.parse(await readFile(process.argv[2],'utf8'));
if(snapshot.project_ref!=='xdmfyrsauvqznkloroxg'||snapshot.version!==1)throw new Error('Expected FaraiOS staging snapshot v1');
for(const key of ['businesses','memberships','events'])if(!Array.isArray(snapshot[key]))throw new Error('Missing snapshot table');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const db=new PGlite();
try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../database/audit-draft.sql',import.meta.url),'utf8'));
 // Identity placeholders only. Passwords, sessions and real Auth service are NOT restored.
 for(const id of new Set(snapshot.memberships.map(row=>row.user_id)))await db.query('insert into auth.users values ($1)',[id]);
 await db.exec('begin; alter table public.businesses disable trigger audit_business_change; alter table public.business_memberships disable trigger audit_membership_change;');
 for(const [key,table] of [['businesses','public.businesses'],['memberships','public.business_memberships'],['events','audit.events']]){
  for(const row of snapshot[key])await db.query(`insert into ${table} select * from jsonb_populate_record(null::${table},$1::jsonb)`,[JSON.stringify(row)]);
 }
 await db.exec('alter table public.businesses enable trigger audit_business_change; alter table public.business_memberships enable trigger audit_membership_change; commit;');
 const restored={businesses:(await db.query(`select id,name,industry,status,to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') created_at from public.businesses order by id`)).rows,memberships:(await db.query(`select business_id,user_id,role,status,to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') created_at from public.business_memberships order by business_id,user_id`)).rows,events:(await db.query(`select id,business_id,to_char(occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') occurred_at,actor_user_id,database_role,transaction_id,entity_table,operation,old_record,new_record from audit.events order by id`)).rows};
 const source={businesses:snapshot.businesses,memberships:snapshot.memberships,events:snapshot.events};
 assert.equal(digest(restored),digest(source),'Snapshot mismatch after isolated restore');
 // Every member sees exactly their active businesses under the restored RLS policies.
 for(const id of new Set(snapshot.memberships.map(row=>row.user_id))){
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  const actual=(await db.query('select id from public.businesses order by id')).rows.map(row=>row.id);
  const expected=snapshot.businesses.filter(b=>b.status==='active'&&snapshot.memberships.some(m=>m.user_id===id&&m.business_id===b.id&&m.status==='active')).map(b=>b.id).sort();
  assert.deepEqual(actual,expected);await db.exec('reset role');
 }
 await db.exec("reset request.jwt.claim.sub");
 const before=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
 if(snapshot.businesses.length){await db.query("update public.businesses set name='Isolated restore verification' where id=$1",[snapshot.businesses[0].id]);assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,before+1);}
 console.log(JSON.stringify({result:'PASS',scope:'application data only; Auth identities are placeholders',counts:Object.fromEntries(Object.entries(source).map(([key,rows])=>[key,rows.length])),sha256:digest(source),rls:'PASS',auditAfterRestore:'PASS'}));
}finally{await db.close();}
