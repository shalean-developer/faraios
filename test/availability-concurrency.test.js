import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
const database=process.env.T16_TEST_DATABASE_URL;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20),ba=id(30),bb=id(40);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('independent connections prevent shared-cleaner overlaps and duplicate recurring generation',{skip:!database,timeout:45000},async()=>{
 // This test provisions an empty disposable database, never a project database.
 const target=new URL(database);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/faraios_t16_test');
 const args=[database,'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'];
 const sql=text=>{const r=spawnSync('psql',args,{input:text,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr||r.error?.message);return r.stdout.trim();};
 let setup=`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`;
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql'])setup+=await readFile(new URL('../database/'+file,import.meta.url),'utf8');
 setup+=`insert into auth.users values('${owner}','owner@test.invalid'),('${manager}','manager@test.invalid'),('${staff}','staff@test.invalid');insert into public.businesses(id,name,industry) values('${a}','A','cleaning'),('${b}','B','cleaning');insert into public.business_memberships(business_id,user_id,role) values('${a}','${owner}','owner'),('${b}','${owner}','owner'),('${b}','${manager}','manager'),('${a}','${staff}','staff'),('${b}','${staff}','staff');set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`;
 for(const [business,n,booking] of [[a,10,ba],[b,20,bb]])setup+=`
 insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values('${business}','Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg');
 insert into public.business_customers(id,business_id,name) values('${id(n+100)}','${business}','Synthetic');
 insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values('${id(n+101)}','${business}','${id(n+100)}','Home','Synthetic');
 insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values('${id(n+102)}','${business}','service','Synthetic','fixed','visit',10000,'ZAR',1,true);
 insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values('${booking}','${business}',gen_random_uuid(),'${id(n+100)}','${id(n+101)}','2026-10-20 09:00',120,'[{"catalogue_id":"${id(n+102)}","quantity":1}]');
 update public.one_off_bookings set status='confirmed' where id='${booking}';`;
 sql(setup);
 const connect=name=>{
  const child=spawn('psql',args,{env:{...process.env,PGAPPNAME:name}});let stdout='',stderr='';
  child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  const closed=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));});
  return {child,closed,output:()=>stdout};
 };
 const first=connect('t16_winner');let second;
 try{
  first.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);update public.one_off_bookings set status='assigned',assigned_staff=array['${staff}'::uuid],change_reason='Concurrency winner' where id='${ba}' and version=2;select 'RESERVATION_HELD';\n`);
  for(let i=0;i<100&&!first.output().includes('RESERVATION_HELD');i++)await pause(25);
  assert.match(first.output(),/RESERVATION_HELD/);
  second=connect('t16_contender');second.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${manager}',true);update public.one_off_bookings set status='assigned',assigned_staff=array['${staff}'::uuid],change_reason='Concurrent contender' where id='${bb}' and version=2;commit;`);
  let blocked=false;
  for(let i=0;i<50&&!blocked;i++){
   blocked=sql("select count(*) from pg_stat_activity where application_name='t16_contender' and wait_event_type='Lock'")==='1';
   if(!blocked)await pause(25);
  }
  assert.equal(blocked,true,'The competing independent connection must wait on the uncommitted reservation');
  first.child.stdin.end('commit;\n');
  const [winner,contender]=await Promise.all([first.closed,second.closed]);
  assert.equal(winner.code,0,winner.stderr);assert.notEqual(contender.code,0);assert.match(contender.stderr,/23P01/);assert.match(contender.stderr,/cleaners are busy/);assert.doesNotMatch(contender.stderr,/conflicting key|Key \(/);
  assert.equal(sql(`select status||':'||version from public.one_off_bookings order by id`),'assigned:3\nconfirmed:2');
  assert.equal(sql('select count(*) from audit.cleaner_reservations'),'1');
 }finally{
  for(const connection of [first,second].filter(Boolean))if(connection.child.exitCode===null)connection.child.kill('SIGTERM');
 }

 // T17 uses the same isolated database after T16, so parallel test files cannot
 // race while provisioning schemas. Hold generated visits uncommitted and retry.
 const recurring=sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.create_recurring('${a}','${ba}',gen_random_uuid(),'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day');`).split('\n').at(-1);
 const through=sql("select ((now() at time zone 'Africa/Johannesburg')::date+14)::text");
 const sourceBefore=sql(`select md5(to_jsonb(b)::text) from public.one_off_bookings b where id='${ba}'`);
 const generator=connect('t17_generator');let retry;
 try{
  generator.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.generate_recurring('${a}','${recurring}',1,'${through}');select 'GENERATION_HELD';\n`);
  for(let i=0;i<100&&!generator.output().includes('GENERATION_HELD');i++)await pause(25);
  assert.match(generator.output(),/GENERATION_HELD/);
  retry=connect('t17_retry');retry.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select 'RETRY:'||public.generate_recurring('${a}','${recurring}',1,'${through}');commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t17_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}
  assert.equal(blocked,true,'Retry must wait on the same schedule row');generator.child.stdin.end('commit;\n');
  const [created,retried]=await Promise.all([generator.closed,retry.closed]);assert.equal(created.code,0,created.stderr);assert.equal(retried.code,0,retried.stderr);assert.match(retried.stdout,/RETRY:0/);
  const counts=sql(`select count(*)||':'||count(distinct recurring_occurrence_date) from public.one_off_bookings where recurring_schedule_id='${recurring}'`).split(':');assert.equal(counts[0],counts[1]);assert.ok(Number(counts[0])>0);
  assert.equal(sql(`select md5(to_jsonb(b)::text) from public.one_off_bookings b where id='${ba}'`),sourceBefore);
 }finally{for(const c of [generator,retry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}
});
