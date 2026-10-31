import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {invoiceFixture} from '../test-support/t19-runtime-fixture.mjs';
import {createStandardHttpsStore} from '../src/t19-standard-https-store.js';
import {createStandardInvoiceWorker,createStandardInvoiceJobs} from '../src/t19-standard-worker.js';
import {createStandardTaxMappings} from '../src/t19-standard-taxes.js';
import {createStandardItemMappings} from '../src/t19-standard-items.js';
import {createStandardConnection} from '../src/t19-standard-connection.js';
import {standardConfig,createTokenCipher} from '../src/t19-standard-secrets.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(10),b=id(20),owner=id(1),manager=id(2),machine=id(9000),session=id(9001),ownerSession=id(9002),managerSession=id(9003);
async function setup(t,{vat=false}={}){
 const f=await invoiceFixture(),db=f.db;t.after(()=>db.close());
 if(vat)await f.as(owner,async()=>{
  await db.query('select public.configure_business_vat($1,0,true,$2,$3,$4,true)',[a,'4000000000','2026-01-01','Synthetic T19 VAT test only']);
  await db.query('update public.business_catalogue set price_cents=11500 where id=$1',[id(112)]);
  await db.query("insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,$2,$3,$4,$5,'2026-11-05 09:00',120,$6)",[id(2100),a,id(2101),id(110),id(111),JSON.stringify([{catalogue_id:id(112),quantity:1}])]);
 });
 const invoice=(await f.as(owner,()=>f.prepare(a,vat?1900:10))).rows[0].id;
 const invoiceB=(await f.as(owner,()=>f.prepare(b,20))).rows[0].id;
 await db.exec(`create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(auth.jwt()->>'sub',''),nullif(current_setting('request.jwt.claim.sub',true),''))::uuid$$;
 insert into auth.users values('${machine}','backend@test.invalid');insert into auth.sessions values('${session}','${machine}',null),('${ownerSession}','${owner}',null),('${managerSession}','${manager}',null);`);
 for(const name of ['t19-standard-store.sql','t19-standard-backend-role.sql','t19-standard-https.sql','t19-standard-https-org-pins.sql','t19-standard-request-principal.sql','t19-standard-lease-recovery.sql','t19-standard-jobs.sql','t19-standard-jobs-approval-facade.sql','t19-standard-invoice-review.sql','t19-standard-item-errors.sql','t19-standard-vat.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));
 const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.example.test',ZOHO_API_DOMAIN:'https://www.zohoapis.com',ZOHO_CLIENT_ID:'synthetic-client',ZOHO_CLIENT_SECRET:'synthetic-secret',ZOHO_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),ZOHO_TOKEN_KEY_ID:'test'}),cipher=createTokenCipher(config);
 for(const [businessId,org,n] of [[a,'111',9100],[b,'222',9200]]){
  await db.query(`insert into private_t19_standard.backend_businesses values($1,$2,'staging',true,$3,'https://www.zohoapis.com')`,[machine,businessId,org]);
  const binding={environment:'staging',businessId,connectionId:id(n),generation:1,organizationId:org,apiDomain:config.apiDomain,clientId:config.clientId};
  await db.query(`insert into private_t19_standard.connections(environment,business_id,connection_id,generation,organization_id,api_domain,client_id,status,envelope) values('staging',$1,$2,1,$3,$4,$5,'connected',$6)`,[businessId,binding.connectionId,org,config.apiDomain,config.clientId,JSON.stringify(cipher.seal(binding,{refreshToken:'synthetic-refresh',accessToken:'synthetic-access',expiresAt:Date.now()+3600000}))]);
 }
 const claims=async(sub=machine,sid=session)=>{await db.query("select set_config('request.jwt.claims',$1,false),set_config('request.jwt.claim.sub',$2,false)",[JSON.stringify({sub,session_id:sid,role:'authenticated'}),sub]);};
 const rpc=async(name,args)=>{await db.exec('set role authenticated');try{const r=await db.query(`select public.${name}($1,$2::jsonb) value`,[args.action,JSON.stringify(args.input)]);return {data:r.rows[0].value,error:null};}finally{await db.exec('reset role');}};
 const store=createStandardHttpsStore({rpc}),jobs=createStandardInvoiceJobs({rpc,scope:store.leaseScope});
 const connection=createStandardConnection({config,store,cipher,provider:{},sessions:{read:async()=>null}});
 const review=async(business=a,actor=owner)=>{await claims(actor,actor===owner?ownerSession:managerSession);await db.exec('set role authenticated');try{return (await db.query('select public.t19_standard_invoice_review($1) value',[business])).rows[0].value;}finally{await db.exec('reset role');}};
 const submit=async(business,input)=>{await db.exec('set role authenticated');try{return (await db.query('select public.t19_standard_approve_reviewed_invoice($1,$2::jsonb) id',[business,JSON.stringify(input)])).rows[0].id;}finally{await db.exec('reset role');}};
 const approvalInput=(view,inv=invoice,customer='123')=>{const i=view.invoices.find(i=>i.id===inv);return {invoiceId:inv,customerId:customer,connectionId:view.connection.id,generation:view.connection.generation,organizationId:view.connection.organizationId,apiDomain:view.connection.apiDomain,invoiceVersion:i?.version??0,totalCents:i?.totalCents??0,confirm:true};};
 const reconcile=async(jobId,business=a)=>{const view=await review(business);await db.exec('set role authenticated');try{return (await db.query('select public.t19_standard_reconcile_invoice($1,$2,$3,$4) id',[business,jobId,view.connection.id,view.connection.generation])).rows[0].id;}finally{await db.exec('reset role');}};
 const approve=async(business=a,inv=invoice,customer='123',actor=owner)=>submit(business,approvalInput(await review(business,actor),inv,customer));
 let posts=0,fault=null,remote=null;
 const fetchImpl=async(url,options)=>{
  const u=new URL(url);assert.equal(u.searchParams.get('organization_id'),'111');assert.equal(options.headers.Authorization,'Zoho-oauthtoken synthetic-access');
  if(u.pathname.endsWith('/organizations'))return Response.json({code:0,organizations:[{organization_id:'111',currency_code:'ZAR',is_org_active:true,country_code:'ZA'}]});
  if(u.pathname.endsWith('/items/555'))return Response.json({code:0,item:{item_id:'555',name:'Synthetic service',unit:'visit',status:'active',can_be_sold:true,rate:999,tax_id:'',tax_percentage:0,item_tax_preferences:[]}});
  if(u.pathname.endsWith('/contacts/123'))return Response.json({code:0,contact:{contact_id:'123',contact_name:'Synthetic customer',currency_code:'ZAR',status:'active'}});
  if(u.pathname.endsWith('/invoices')&&options.method==='POST'){
   posts++;assert.equal(JSON.parse(options.body).line_items[0].item_id,'555');assert.equal(u.searchParams.get('send'),'false');const p=JSON.parse(options.body);
   remote={invoice_id:'9001',invoice_number:'TEST-1',reference_number:p.reference_number,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,total:'100.00',sub_total:'100.00',tax_total:0,shipping_charge:0,adjustment:0,payment_made:0,credits_applied:0,line_items:[{item_id:'555',name:'Synthetic service',quantity:1,rate:'100.00',item_total:'100.00',unit:'visit',tax_id:'',discount_amount:0}]};
   if(fault==='lost_response')throw Error('synthetic provider secret must not escape');return Response.json({code:0,invoice:{invoice_id:'9001'}});
  }
  if(u.pathname.endsWith('/invoices')){
   if(fault==='rate_limit')return new Response('',{status:429});
   return Response.json({code:0,invoices:remote?[{invoice_id:'9001',reference_number:remote.reference_number}]:[],page_context:{has_more_page:false}});
  }
  if(u.pathname.endsWith('/invoices/9001'))return Response.json({code:0,invoice:remote});
  throw Error('unexpected synthetic request');
 };
 const mappings={version:1,environment:'staging',connections:[{businessId:a,connectionId:id(9100),generation:1,organizationId:'111',apiDomain:config.apiDomain,items:[{catalogueId:id(112),itemId:'555'}]}]};
 const worker=createStandardInvoiceWorker({connection,jobs,fetchImpl,resolveItems:createStandardItemMappings(mappings)});
 await claims();
 return {...f,invoice,invoiceB,claims,rpc,store,jobs,connection,approve,review,submit,approvalInput,reconcile,worker,fetchImpl,mappings,posts:()=>posts,fault:v=>{fault=v;},remote:()=>remote};
}
test('owner approval and worker RPC deny foreign invoice, manager, browser token access and revoked sessions',async t=>{
 const f=await setup(t);
 await assert.rejects(()=>f.approve(b));await assert.rejects(()=>f.approve(a,f.invoice,'123',manager));
 const job=await f.approve();assert.equal(await f.approve(),job);
 await f.db.exec('set role authenticated');await assert.rejects(()=>f.db.query('select * from private_t19_standard.invoice_jobs'),e=>e.code==='42501');await assert.rejects(()=>f.db.query('select envelope from private_t19_standard.connections'),e=>e.code==='42501');await f.db.exec('reset role');
 assert.equal((await f.worker.runOnce(a)).status,'unavailable'); // owner is not backend
 await f.claims();await f.db.exec(`delete from auth.sessions where id='${session}'`);assert.equal((await f.worker.runOnce(a)).status,'unavailable');assert.equal(f.posts(),0);
});
test('approved standard worker creates one verified draft; pending queue then idles',async t=>{
 const f=await setup(t);
 const facade=(await f.db.query("select prosecdef from pg_proc where oid='public.t19_standard_approve_invoice(uuid,uuid,text)'::regprocedure")).rows[0];assert.equal(facade.prosecdef,false);
 for(const role of ['anon','service_role']){await f.db.exec('set role '+role);await assert.rejects(()=>f.db.query("select public.t19_standard_jobs('pending','{}')"),e=>e.code==='42501');await f.db.exec('reset role');}
 await f.db.exec('set role authenticated');await assert.rejects(()=>f.db.query('select * from private_t19_standard.invoice_jobs'),e=>e.code==='42501');await f.db.exec('reset role');
 const jobId=await f.approve();await f.claims();
 assert.deepEqual(await f.worker.runOnce(a),{jobId,status:'matched'});assert.equal(f.posts(),1);
 assert.deepEqual(await f.worker.runOnce(a),{status:'idle'});assert.equal(f.posts(),1);
 const invoice=(await f.db.query('select sync_status,external_invoice_id from public.business_invoices where id=$1',[f.invoice])).rows[0];assert.equal(invoice.sync_status,'matched');assert.equal(invoice.external_invoice_id,'9001');
});
test('lost create response reconciles existing identity without a second POST after recovery',async t=>{
 const f=await setup(t),jobId=await f.approve();await f.claims();f.fault('lost_response');
 assert.equal((await f.worker.runOnce(a)).status,'review_required');assert.equal(f.posts(),1);
 await f.reconcile(jobId);await f.claims();
 f.fault(null);assert.equal((await f.worker.runOnce(a)).status,'matched');assert.equal(f.posts(),1);
});
test('interrupted dispatch remains reconciliation-only and absence never creates replacement',async t=>{
 const f=await setup(t),jobId=await f.approve();await f.claims();
 await f.connection.access(a,async(_token,binding)=>{const c=await f.jobs.claim(binding,jobId);await f.jobs.dispatch(binding,jobId,c.invoice.attempt_id);});
 assert.equal((await f.worker.runOnce(a)).status,'review_required');assert.equal(f.posts(),0);
});
test('pre-dispatch rate limit schedules bounded retry; stale owner and reconnect quarantine jobs',async t=>{
 const f=await setup(t),jobId=await f.approve();await f.claims();f.fault('rate_limit');
 assert.equal((await f.worker.runOnce(a)).status,'failed');assert.equal(f.posts(),0);
 const job=(await f.db.query('select state,available_at>clock_timestamp() delayed from private_t19_standard.invoice_jobs where id=$1',[jobId])).rows[0];assert.equal(job.state,'retry');assert.equal(job.delayed,true);
 await f.db.exec(`update private_t19_standard.connections set generation=2 where business_id='${a}'`);
 // Update synthetic envelope binding for the independently changed generation.
 const binding={environment:'staging',businessId:a,connectionId:id(9100),generation:2,organizationId:'111',apiDomain:'https://www.zohoapis.com',clientId:'synthetic-client'};
 const cipher=createTokenCipher({key:Buffer.from('ab'.repeat(32),'hex'),keyId:'test'});
 await f.db.query('update private_t19_standard.connections set envelope=$1 where business_id=$2',[JSON.stringify(cipher.seal(binding,{refreshToken:'synthetic-refresh',accessToken:'synthetic-access',expiresAt:Date.now()+3600000})),a]);
 assert.equal((await f.worker.runOnce(a)).status,'idle');assert.equal((await f.db.query('select state from private_t19_standard.invoice_jobs where id=$1',[jobId])).rows[0].state,'review_required');assert.equal(f.posts(),0);
});

test('independent worker cannot overlap a held business connection lease',async t=>{
 const f=await setup(t);await f.approve();await f.claims();
 let enter,release;const entered=new Promise(r=>enter=r),blocked=new Promise(r=>release=r);
 const held=f.connection.access(a,async()=>{enter();await blocked;});await entered;
 assert.equal((await f.worker.runOnce(a)).status,'unavailable');assert.equal(f.posts(),0);
 release();await held;assert.equal((await f.worker.runOnce(a)).status,'matched');assert.equal(f.posts(),1);
});
test('business scope and current owner are enforced by SQL before provider writes',async t=>{
 const f=await setup(t),foreignJob=await f.approve(b,f.invoiceB,'999'),jobId=await f.approve();await f.claims();
 await assert.rejects(()=>f.connection.access(a,async(_token,binding)=>f.jobs.claim(binding,foreignJob)));
 await f.db.exec(`update public.business_memberships set role='manager' where user_id='${owner}' and business_id='${a}'`);
 assert.equal((await f.worker.runOnce(a)).status,'idle');assert.equal(f.posts(),0);
 assert.equal((await f.db.query('select state from private_t19_standard.invoice_jobs where id=$1',[jobId])).rows[0].state,'review_required');
});
test('retry exhaustion is bounded and visible without dispatch',async t=>{
 const f=await setup(t),jobId=await f.approve();await f.claims();f.fault('rate_limit');
 for(let n=0;n<5;n++){assert.equal((await f.worker.runOnce(a)).status,'failed');await f.db.query('update private_t19_standard.invoice_jobs set available_at=clock_timestamp() where id=$1',[jobId]);}
 const row=(await f.db.query('select state,attempts,dispatched,error_code from private_t19_standard.invoice_jobs where id=$1',[jobId])).rows[0];
 assert.deepEqual(row,{state:'review_required',attempts:5,dispatched:false,error_code:'rate_limited'});assert.equal(f.posts(),0);assert.equal((await f.worker.runOnce(a)).status,'idle');
});

test('historical attempts enter the replacement queue as reconciliation-only',async t=>{
 const f=await setup(t);await f.db.query("update public.business_invoices set sync_status='failed',attempt_id=$1,attempt_mode='create' where id=$2",[id(9999),f.invoice]);
 const jobId=await f.approve();await f.claims();assert.equal((await f.worker.runOnce(a)).status,'review_required');assert.equal(f.posts(),0);
 const job=(await f.db.query('select dispatched,mode from private_t19_standard.invoice_jobs where id=$1',[jobId])).rows[0];assert.equal(job.dispatched,true);assert.equal(job.mode,'reconcile');
});

test('reviewed approval is version/amount/organisation bound, explicitly confirmed and cannot use the old API',async t=>{
 const f=await setup(t),view=await f.review(),input=f.approvalInput(view);
 for(const patch of [{confirm:false},{generation:2},{invoiceVersion:input.invoiceVersion+1},{totalCents:input.totalCents+1},{organizationId:'222'},{apiDomain:'https://attacker.invalid'},{invoiceId:f.invoiceB}])await assert.rejects(()=>f.submit(a,{...input,...patch}));
 await f.db.exec('set role authenticated');await assert.rejects(()=>f.db.query('select public.t19_standard_approve_invoice($1,$2,$3)',[a,f.invoice,'123']),e=>e.code==='42501');await f.db.exec('reset role');
 assert.equal((await f.db.query('select count(*)::integer n from private_t19_standard.invoice_jobs')).rows[0].n,0);
 const jobId=await f.submit(a,input);assert.equal(await f.submit(a,input),jobId);
});
test('legacy tax evidence is held without rewriting historical invoices',async t=>{
 const f=await setup(t);await f.db.exec('alter table public.business_invoices disable trigger user');await f.db.query("update public.business_invoices set snapshot=snapshot-'tax_snapshot' where id=$1",[f.invoice]);await f.db.exec('alter table public.business_invoices enable trigger user');
 const view=await f.review();assert.equal(view.invoices[0].taxReady,false);await assert.rejects(()=>f.submit(a,f.approvalInput(view)));
 assert.equal((await f.db.query('select count(*)::integer n from private_t19_standard.invoice_jobs')).rows[0].n,0);
});

test('owner cannot use reconciliation to dispatch an unapproved or undispatched create',async t=>{const f=await setup(t),jobId=await f.approve();await assert.rejects(()=>f.reconcile(jobId));assert.equal(f.posts(),0);});

test('unmapped standard items are held before dispatch and keep a durable visible mapping reason',async t=>{
 const f=await setup(t);await f.approve();await f.claims();
 const worker=createStandardInvoiceWorker({connection:f.connection,jobs:f.jobs,fetchImpl:f.fetchImpl});
 assert.equal((await worker.runOnce(a)).status,'review_required');assert.equal(f.posts(),0);
 const j=(await f.db.query('select state,dispatched,error_code from private_t19_standard.invoice_jobs')).rows[0];
 assert.deepEqual(j,{state:'review_required',dispatched:false,error_code:'item_mapping'});
 assert.equal((await f.db.query('select error_code from public.business_invoices where id=$1',[f.invoice])).rows[0].error_code,'mismatch');
});

test('explicit fictitious non-VAT correction retains original evidence and cannot change price or bypass owner guards',async t=>{
 const f=await setup(t);
 // Model a pre-VAT-migration document in this disposable fixture only.
 await f.db.exec('alter table public.business_invoices disable trigger user');
 await f.db.query("update public.business_invoices set snapshot=snapshot-'tax_snapshot' where id=$1",[f.invoice]);
 await f.db.exec('alter table public.business_invoices enable trigger user');
 const original=(await f.db.query('select snapshot,version,total_cents from public.business_invoices where id=$1',[f.invoice])).rows[0];
 await f.db.exec(await readFile(new URL('../database/t19-standard-test-tax-correction.sql',import.meta.url),'utf8'));
 await f.db.query("insert into public.business_vat_settings(business_id,enabled,version,change_reason) values($1,false,1,'Synthetic test non-VAT policy')",[a]);
 const correct=async({business=a,version=original.version,total=original.total_cents,confirm=true}={})=>{await f.db.exec('set role authenticated');try{return await f.db.query("select public.t19_standard_correct_test_nonvat($1,$2,$3,$4,'Owner chooses non-VAT for fictitious test only',$5)",[business,f.invoice,version,total,confirm]);}finally{await f.db.exec('reset role');}};
 await f.claims(manager,managerSession);await assert.rejects(()=>correct());
 await f.claims(owner,ownerSession);
 for(const args of [{business:b},{version:999},{total:1},{confirm:false}])await assert.rejects(()=>correct(args));
 await f.db.query('update public.business_vat_settings set enabled=true,vat_number=$1,registration_date=$2 where business_id=$3',['4000000001','2026-01-01',a]);await assert.rejects(()=>correct());
 await f.db.query('update public.business_vat_settings set enabled=false,vat_number=null,registration_date=null where business_id=$1',[a]);
 await correct();
 const after=(await f.db.query('select snapshot,version,total_cents from public.business_invoices where id=$1',[f.invoice])).rows[0];
 assert.deepEqual(after.snapshot,{...original.snapshot,tax_snapshot:{enabled:false,policy_version:1,price_basis:'customer_total',rate_bps:0,vat_number:null,registration_date:null,net_cents:10000,vat_cents:0,total_cents:10000}});assert.equal(after.total_cents,original.total_cents);assert.equal(after.version,original.version+1);
 const retained=(await f.db.query('select original_snapshot,corrected_snapshot from private_t19_standard.test_tax_corrections where invoice_id=$1',[f.invoice])).rows[0];assert.deepEqual(retained.original_snapshot,original.snapshot);assert.deepEqual(retained.corrected_snapshot,after.snapshot);
 await assert.rejects(()=>correct());
 await f.db.exec('set role authenticated');await assert.rejects(()=>f.db.query('select * from private_t19_standard.test_tax_corrections'),e=>e.code==='42501');await f.db.exec('reset role');
 await assert.rejects(()=>f.db.query("update public.business_invoices set snapshot=jsonb_set(snapshot,'{total_cents}','1') where id=$1",[f.invoice]));
 const jobId=await f.approve();await f.claims();assert.deepEqual(await f.worker.runOnce(a),{jobId,status:'matched'});assert.equal(f.posts(),1);
});

test('killed native worker recovers expired lease and reconciles one dispatched invoice without another POST',{skip:!process.env.T19_CUSTODY_NATIVE_URL,timeout:30000},async t=>{
 const {fork}=await import('node:child_process');
 const {once}=await import('node:events');
 const f=await setup(t),job=await f.approve();await f.claims();
 const child=fork(new URL('../test-support/t19-killed-standard-worker.mjs',import.meta.url),[],{stdio:['ignore','pipe','pipe','ipc']});
 t.after(()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');});
 let childError='';child.stderr.on('data',d=>{childError+=d;});
 const posted=new Promise((resolve,reject)=>{
  child.on('error',reject);child.on('exit',()=>reject(Error('child exited before dispatch: '+childError)));
  child.on('message',async message=>{
   try{
    assert.equal(message.unexpectedResult,undefined);
    const response=await f.fetchImpl(message.url,message.options);
    if(message.options.method==='POST'&&new URL(message.url).pathname.endsWith('/invoices')){resolve();return;} // Provider accepted; never return its receipt to child.
    child.send({seq:message.seq,body:await response.json()});
   }catch(e){reject(e);}
  });
 });
 await posted;assert.equal(f.posts(),1);
 const exited=once(child,'exit');child.kill('SIGKILL');await exited;
 const row=(await f.db.query('select holder,released from private_t19_standard.operation_leases where business_id=$1',[a])).rows[0];assert.equal(row.released,false);
 assert.equal((await f.worker.runOnce(a)).status,'unavailable');
 await f.db.query("update private_t19_standard.operation_leases set expires_at=clock_timestamp()-interval '31 seconds' where business_id=$1",[a]);
 // Old holder cannot commit after takeover, including job dispatch/finish.
 await f.store.lock('staging',a,async()=>{
  for(const action of ['guard','release','refresh'])await assert.rejects(()=>f.rpc('t19_standard_store',{action,input:{businessId:a,environment:'staging',lease:row.holder}}),e=>e.code==='42501');
  const attempt=(await f.db.query('select attempt_id from private_t19_standard.invoice_jobs where id=$1',[job])).rows[0].attempt_id;
  for(const action of ['guard','dispatch','finish'])await assert.rejects(()=>f.rpc('t19_standard_jobs',{action,input:{businessId:a,environment:'staging',lease:row.holder,connectionId:id(9100),generation:1,jobId:job,attemptId:attempt,result:{outcome:'matched'}}}),e=>e.code==='42501');
 });
 assert.equal((await f.worker.runOnce(a)).status,'matched');assert.equal(f.posts(),1);
 assert.equal((await f.worker.runOnce(a)).status,'idle');assert.equal(f.posts(),1);
 const result=(await f.db.query('select state,dispatched from private_t19_standard.invoice_jobs where id=$1',[job])).rows[0];assert.equal(result.state,'completed');assert.equal(result.dispatched,true);
});

test('VAT standard worker enforces saved inclusive tax, SQL receipt amounts and original no-VAT barriers',async t=>{
 const f=await setup(t,{vat:true});
 await f.claims();
 await assert.rejects(()=>f.db.query("update public.business_invoices set sync_status='syncing' where id=$1",[f.invoice]),/VAT accounting sync requires/);
 const job=await f.approve();
 // Today's setting changes neither the saved VAT agreement nor its approved total.
 await f.as(owner,()=>f.db.query('select public.configure_business_vat($1,1,false,null,null,$2,true)',[a,'Synthetic VAT off after saved agreement']));await f.claims();
 const binding=await f.store.connection('staging',a);
 await f.store.lock('staging',a,async()=>{
  const claim=await f.jobs.claim(binding,job);
  for(const patch of [{provider_tax_cents:0,provider_net_cents:11500},{provider_tax_cents:1501,provider_net_cents:9999},{provider_tax_cents:'1500',provider_net_cents:10000}])await assert.rejects(()=>f.jobs.finish(binding,job,claim.invoice.attempt_id,{outcome:'matched',error_code:'',receipt:{tax_snapshot:claim.invoice.snapshot.tax_snapshot,...patch,provider_tax_id:'555'}}),/accounting_result_denied/);
  await f.jobs.finish(binding,job,claim.invoice.attempt_id,{outcome:'failed',error_code:'rate_limited',receipt:null});
 });
 await f.db.query("update private_t19_standard.invoice_jobs set available_at=clock_timestamp()-interval '1 second' where id=$1",[job]);
 let posts=0,remote;
 const fetchImpl=async(url,options)=>{
  const u=new URL(url);assert.equal(u.searchParams.get('organization_id'),'111');
  if(u.pathname.endsWith('/contacts/123'))return Response.json({code:0,contact:{contact_id:'123',contact_name:'Synthetic customer',currency_code:'ZAR',status:'active',tax_treatment:'vat_not_registered'}});
  if(u.pathname.endsWith('/settings/taxes'))return Response.json({code:0,taxes:[{tax_id:'555',tax_name:'VAT15 TEST',tax_type:'tax',tax_percentage:15,status:'Active',tax_specific_type:''}],page_context:{has_more_page:false}});
  if(u.pathname.endsWith('/invoices')&&options.method==='POST'){
   posts++;const p=JSON.parse(options.body);assert.equal(p.is_inclusive_tax,true);assert.equal(p.line_items[0].tax_id,'555');assert.equal(p.line_items[0].rate,115);assert.equal(p.line_items[0].item_id,'555');assert.deepEqual(p.contact_persons,[]);assert.equal(u.searchParams.get('send'),'false');
   remote={invoice_id:'9001',invoice_number:'VAT-TEST-1',reference_number:p.reference_number,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,is_inclusive_tax:true,tax_treatment:'vat_not_registered',is_reverse_charge_applied:false,date:'2026-11-05',total:115,sub_total:100,tax_total:15,taxes:[{tax_name:'VAT15 TEST',tax_amount:15}],payment_made:0,line_items:[{item_id:'555',name:'Synthetic service',quantity:1,rate:115,item_total:100,unit:'visit',tax_id:'555',tax_name:'VAT15 TEST',tax_type:'tax',tax_percentage:15,discount_amount:0}]};
   return Response.json({code:0,invoice:{invoice_id:'9001'}});
  }
  if(u.pathname.endsWith('/invoices/9001'))return Response.json({code:0,invoice:remote});
  if(u.pathname.endsWith('/invoices'))return Response.json({code:0,invoices:[],page_context:{has_more_page:false}});
  return f.fetchImpl(url,options);
 };
 const mapping={version:1,environment:'staging',connections:[{businessId:a,connectionId:id(9100),generation:1,organizationId:'111',apiDomain:'https://www.zohoapis.com',policies:[{policyVersion:1,vatNumber:'4000000000',registrationDate:'2026-01-01',taxId:'555',taxName:'VAT15 TEST',verifiedStagingVat:true}]}]};
 const worker=createStandardInvoiceWorker({connection:f.connection,jobs:f.jobs,fetchImpl,resolveItems:createStandardItemMappings(f.mappings),resolveTax:createStandardTaxMappings(mapping)});
 assert.equal((await worker.runOnce(a)).status,'matched');assert.equal(posts,1);assert.equal((await worker.runOnce(a)).status,'idle');assert.equal(posts,1);
 const i=(await f.db.query('select snapshot,total_cents,sync_status,external_invoice_id from public.business_invoices where id=$1',[f.invoice])).rows[0];assert.equal(i.total_cents,11500);assert.equal(i.snapshot.tax_snapshot.enabled,true);assert.equal(i.snapshot.tax_snapshot.vat_cents,1500);assert.equal(i.sync_status,'matched');
 for(const bad of [{enabled:true},{...i.snapshot.tax_snapshot,vat_number:null},{...i.snapshot.tax_snapshot,registration_date:'2026-02-30'},{...i.snapshot.tax_snapshot,policy_version:null},{...i.snapshot.tax_snapshot,vat_cents:1501}])assert.equal((await f.db.query('select private_t19_standard.invoice_tax_ready($1::jsonb,11500) ready',[JSON.stringify(bad)])).rows[0].ready,false);
 await f.db.exec('set role anon');await assert.rejects(()=>f.db.query('select private_t19_standard.vat_attempt_allowed(null::public.business_invoices)'),e=>e.code==='42501');await f.db.exec('reset role');
});
