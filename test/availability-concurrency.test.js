import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
const database=process.env.T16_TEST_DATABASE_URL;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20),ba=id(30),bb=id(40);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('independent connections prevent shared-cleaner overlaps and duplicate recurring/quote/invoice creation',{skip:!database,timeout:45000},async()=>{
 // This test provisions an empty disposable database, never a project database.
 const target=new URL(database);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/faraios_t16_test');
 const args=[database,'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'];
 const sql=text=>{const r=spawnSync('psql',args,{input:text,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr||r.error?.message);return r.stdout.trim();};
 let setup=`create role anon;create role authenticated;create role service_role;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`;
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql'])setup+=await readFile(new URL('../database/'+file,import.meta.url),'utf8');
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

 // T18: both independent requests return the exact same persisted conversion.
 const quote=sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.create_quote('${a}',gen_random_uuid(),'${id(110)}','${id(111)}','[{"catalogue_id":"${id(112)}","quantity":1}]',null,120);`).split('\n').at(-1);
 sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.change_quote('${a}','${quote}',1,'issued','Shared fixture');select public.change_quote('${a}','${quote}',2,'accepted','Accepted fixture');`);
 const quoteStart=sql("select ((now() at time zone 'Africa/Johannesburg')::date+1)::text||' 09:00'");
 const converter=connect('t18_converter');let conversionRetry;
 try{
  converter.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.convert_quote('${a}','${quote}',3,'${quoteStart}','');select 'CONVERSION_HELD';\n`);
  for(let i=0;i<100&&!converter.output().includes('CONVERSION_HELD');i++)await pause(25);
  assert.match(converter.output(),/CONVERSION_HELD/);
  conversionRetry=connect('t18_retry');conversionRetry.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select 'RETRY:'||public.convert_quote('${a}','${quote}',3,'${quoteStart}','')::text;commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t18_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}
  assert.equal(blocked,true,'Conversion retry must wait on the accepted quote row');converter.child.stdin.end('commit;\n');
  const [created,retried]=await Promise.all([converter.closed,conversionRetry.closed]);assert.equal(created.code,0,created.stderr);assert.equal(retried.code,0,retried.stderr);
  const firstReceipt=JSON.parse(created.stdout.split('\n').find(s=>s.startsWith('{'))),retryReceipt=JSON.parse(retried.stdout.split('\n').find(s=>s.startsWith('RETRY:')).slice(6));assert.deepEqual(retryReceipt,firstReceipt);
  assert.equal(sql(`select count(*) from public.one_off_bookings where source_quote_id='${quote}'`),'1');assert.equal(sql(`select count(*) from public.quote_invoice_handoffs where quote_id='${quote}'`),'1');assert.equal(sql(`select status||':'||version from public.business_quotes where id='${quote}'`),'converted:4');
 }finally{for(const c of [converter,conversionRetry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}

 // Contact edits cannot race between scope validation and the saved snapshot.
 const contact=connect('t18_contact_edit');let quoteReader;
 try{
  contact.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);update public.business_customers set phone='0000000099' where id='${id(110)}';select 'CONTACT_HELD';\n`);
  for(let i=0;i<100&&!contact.output().includes('CONTACT_HELD');i++)await pause(25);
  assert.match(contact.output(),/CONTACT_HELD/);
  quoteReader=connect('t18_contact_quote');quoteReader.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select 'QUOTE:'||public.create_quote('${a}',gen_random_uuid(),'${id(110)}','${id(111)}','[{"catalogue_id":"${id(112)}","quantity":1}]',null,120)::text;commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t18_contact_quote' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}
  assert.equal(blocked,true,'Quote calculation must wait for the active contact version');contact.child.stdin.end('commit;\n');
  const [edited,quoted]=await Promise.all([contact.closed,quoteReader.closed]);assert.equal(edited.code,0,edited.stderr);assert.equal(quoted.code,0,quoted.stderr);
  const saved=quoted.stdout.split('\n').find(s=>s.startsWith('QUOTE:')).slice(6);
  assert.equal(sql(`select agreement->'customer_snapshot'->>'phone' from public.business_quotes where id='${saved}'`),'0000000099');
 }finally{for(const c of [contact,quoteReader].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}

 // T19: one invoice per booking, then one active accounting claim across workers.
 const invoicePreparer=connect('t19_preparer');let invoiceRetry;
 try{
  invoicePreparer.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.prepare_invoice('${a}','${ba}');select 'INVOICE_HELD';\n`);
  for(let i=0;i<100&&!invoicePreparer.output().includes('INVOICE_HELD');i++)await pause(25);assert.match(invoicePreparer.output(),/INVOICE_HELD/);
  invoiceRetry=connect('t19_invoice_retry');invoiceRetry.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select 'RETRY:'||public.prepare_invoice('${a}','${ba}');commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t19_invoice_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}assert.equal(blocked,true);invoicePreparer.child.stdin.end('commit;\n');
  const [created,retried]=await Promise.all([invoicePreparer.closed,invoiceRetry.closed]);assert.equal(created.code,0,created.stderr);assert.equal(retried.code,0,retried.stderr);
  const saved=sql(`select id from public.business_invoices where business_id='${a}' and booking_id='${ba}'`);assert.match(retried.stdout,new RegExp('RETRY:'+saved));assert.equal(sql('select count(*) from public.business_invoices'),'1');
 }finally{for(const c of [invoicePreparer,invoiceRetry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}
 const savedInvoice=sql(`select id from public.business_invoices where business_id='${a}' and booking_id='${ba}'`);
 sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.configure_accounting('${a}',0,'111','https://www.zohoapis.com','A_TEST',true);`);
 const claimWinner=connect('t19_claim_winner');let claimRetry;
 try{
  claimWinner.child.stdin.write(`begin;set local role service_role;select public.claim_invoice_sync('${a}','${savedInvoice}','${owner}','123');select 'CLAIM_HELD';\n`);
  for(let i=0;i<100&&!claimWinner.output().includes('CLAIM_HELD');i++)await pause(25);assert.match(claimWinner.output(),/CLAIM_HELD/);
  claimRetry=connect('t19_claim_retry');claimRetry.child.stdin.end(`begin;set local lock_timeout='10s';set local role service_role;select public.claim_invoice_sync('${a}','${savedInvoice}','${owner}','123');commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t19_claim_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}assert.equal(blocked,true);claimWinner.child.stdin.end('commit;\n');
  const [claimed,retried]=await Promise.all([claimWinner.closed,claimRetry.closed]);assert.equal(claimed.code,0,claimed.stderr);assert.notEqual(retried.code,0);assert.match(retried.stderr,/40001/);assert.equal(sql(`select version from public.business_invoices where id='${savedInvoice}'`),'2');
 }finally{for(const c of [claimWinner,claimRetry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}

 // T04: a daily cap must also serialize non-overlapping jobs across businesses.
 sql(await readFile(new URL('../supabase/migrations/20261021152058_t04_duration_workload.sql',import.meta.url),'utf8'));
 sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);update public.business_settings set max_daily_minutes=480 where business_id='${a}';`);
 for(const [index,isolation]of ['read committed','repeatable read'].entries()){
  const firstId=id(500+index*2),secondId=id(501+index*2),day=`2030-01-${String(10+index).padStart(2,'0')}`;
  for(const [biz,n,bid,time]of [[a,10,firstId,'08:00'],[b,20,secondId,'13:00']])sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values('${bid}','${biz}',gen_random_uuid(),'${id(n+100)}','${id(n+101)}','${day} ${time}',300,'[{"catalogue_id":"${id(n+102)}","quantity":1}]');update public.one_off_bookings set status='confirmed' where id='${bid}';`);
  const winner=connect('t04_daily_winner');let contender;
  try{
   winner.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);update public.one_off_bookings set status='assigned',assigned_staff=array['${staff}'::uuid],setup_minutes=0,travel_minutes=0,change_reason='Daily winner' where id='${firstId}';select 'DAILY_HELD';\n`);
   for(let i=0;i<100&&!winner.output().includes('DAILY_HELD');i++)await pause(25);assert.match(winner.output(),/DAILY_HELD/);
   contender=connect('t04_daily_contender');contender.child.stdin.end(`begin isolation level ${isolation};set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${manager}',true);update public.one_off_bookings set status='assigned',assigned_staff=array['${staff}'::uuid],setup_minutes=0,travel_minutes=0,change_reason='Daily contender' where id='${secondId}';commit;`);
   let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t04_daily_contender' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}assert.equal(blocked,true,`${isolation} daily sum must wait on the cleaner row`);
   winner.child.stdin.end('commit;\n');const [won,lost]=await Promise.all([winner.closed,contender.closed]);assert.equal(won.code,0,won.stderr);assert.notEqual(lost.code,0);assert.match(lost.stderr,isolation==='repeatable read'?/40001/:/23514/);assert.doesNotMatch(lost.stderr,/Secret|conflicting key|Key \(/);
   assert.equal(sql(`select status from public.one_off_bookings where id='${secondId}'`),'confirmed');assert.equal(sql(`select count(*) from audit.cleaner_reservations where booking_id in ('${firstId}','${secondId}')`),'1');
  }finally{for(const c of [winner,contender].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}
 }

 // T04 allowances: concurrent owner saves cannot overwrite a scheduled change.
 sql(await readFile(new URL('../database/earnings-rules-draft.sql',import.meta.url),'utf8'));
 sql(await readFile(new URL('../supabase/migrations/20261021223123_business_vat_settings.sql',import.meta.url),'utf8'));
 sql(await readFile(new URL('../supabase/migrations/20261022070131_supervisor_monthly_allowances.sql',import.meta.url),'utf8'));
 const nextMonth=sql("select (date_trunc('month',now() at time zone 'Africa/Johannesburg')+interval '1 month')::date::text");
 const allowanceWinner=connect('t04_allowance_winner');let allowanceRetry;
 try{
  allowanceWinner.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.configure_supervisor_allowance('${a}','${staff}',0,true,50000,'${nextMonth}','Winner');select 'ALLOWANCE_HELD';\n`);
  for(let i=0;i<100&&!allowanceWinner.output().includes('ALLOWANCE_HELD');i++)await pause(25);assert.match(allowanceWinner.output(),/ALLOWANCE_HELD/);
  allowanceRetry=connect('t04_allowance_retry');allowanceRetry.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.configure_supervisor_allowance('${a}','${staff}',0,false,0,'${nextMonth}','Stale contender');commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t04_allowance_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}assert.equal(blocked,true,'Allowance retry must wait for the same business and staff scope');
  allowanceWinner.child.stdin.end('commit;\n');const [won,lost]=await Promise.all([allowanceWinner.closed,allowanceRetry.closed]);assert.equal(won.code,0,won.stderr);assert.notEqual(lost.code,0);assert.match(lost.stderr,/40001/);
  assert.equal(sql(`select count(*)||':'||max(amount_cents) from public.supervisor_allowance_changes where business_id='${a}' and user_id='${staff}'`),'1:50000');
 }finally{for(const c of [allowanceWinner,allowanceRetry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}

 // Stage 1: two owner sessions cannot reserve the same remaining customer money.
 sql(await readFile(new URL('../database/cancellation-review-draft.sql',import.meta.url),'utf8'));
 const cancellationInput={policyVersion:'shalean-cancel-20261021-v1',agreementKind:'new_accepted',acceptanceEvidence:'TEST prospective acceptance',cause:'customer',action:'cancel',stage:'accepted',originalStart:sql(`select to_char(starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from public.one_off_bookings where id='${ba}'`),requestedAt:'2026-10-19T08:00:00+02:00',stageTimes:{accepted:'2026-10-18T08:00:00+02:00'},workers:[{id:staff,agreedCents:30000,expenseCents:0}],eligibleLabourCents:10000,reasonableLossCents:0,verifiedReceiptsCents:10000,performedServiceCents:0,completedRefundsCents:0,pendingRefundsCents:0,reviewedCustomerFeeCents:0,collectedPoolCents:0,mandatoryRightsReviewed:true,feeMustBeWaived:false,holidays:[]};
 sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);insert into public.business_cancellation_review_policies(business_id,policy_version,approval_reference) values('${a}','shalean-cancel-20261021-v1','TEST owner decision');`);
 const cancellationCase=sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.append_cancellation_review('${a}','${ba}',null,0,'${id(900)}','prepare','${JSON.stringify(cancellationInput)}');`).split('\n').at(-1);
 sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.append_cancellation_review('${a}','${ba}','${cancellationCase}',1,'${id(901)}','approve','{"reason":"Synthetic approval"}');`);
 const refundPayload=JSON.stringify({amountCents:7000,receiptReference:'TEST-PAY',route:'test-card',originalRoute:'test-card'});
 const refundWinner=connect('t04_refund_winner');let refundRetry;
 try{
  refundWinner.child.stdin.write(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.append_cancellation_review('${a}','${ba}','${cancellationCase}',2,'${id(902)}','reserve_refund','${refundPayload}');select 'REFUND_HELD';\n`);
  for(let i=0;i<100&&!refundWinner.output().includes('REFUND_HELD');i++)await pause(25);assert.match(refundWinner.output(),/REFUND_HELD/);
  refundRetry=connect('t04_refund_retry');refundRetry.child.stdin.end(`begin;set local lock_timeout='10s';set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.append_cancellation_review('${a}','${ba}','${cancellationCase}',2,'${id(903)}','reserve_refund','${refundPayload}');commit;`);
  let blocked=false;for(let i=0;i<50&&!blocked;i++){blocked=sql("select count(*) from pg_stat_activity where application_name='t04_refund_retry' and wait_event_type='Lock'")==='1';if(!blocked)await pause(25);}assert.equal(blocked,true,'Refund reservations must serialize on the case');
  refundWinner.child.stdin.end('commit;\n');const [won,lost]=await Promise.all([refundWinner.closed,refundRetry.closed]);assert.equal(won.code,0,won.stderr);assert.notEqual(lost.code,0);assert.match(lost.stderr,/40001/);
  assert.equal(sql(`select count(*) from public.cancellation_review_events where case_id='${cancellationCase}' and event_type='reserve_refund'`),'1');
 }finally{for(const c of [refundWinner,refundRetry].filter(Boolean))if(c.child.exitCode===null)c.child.kill('SIGTERM');}

});
