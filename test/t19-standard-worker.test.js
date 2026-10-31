import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {invoiceFixture} from '../test-support/t19-runtime-fixture.mjs';
import {createStandardHttpsStore} from '../src/t19-standard-https-store.js';
import {createStandardInvoiceWorker,createStandardInvoiceJobs} from '../src/t19-standard-worker.js';
import {createStandardConnection} from '../src/t19-standard-connection.js';
import {standardConfig,createTokenCipher} from '../src/t19-standard-secrets.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(10),b=id(20),owner=id(1),manager=id(2),machine=id(9000),session=id(9001),ownerSession=id(9002),managerSession=id(9003);
async function setup(t){
 const f=await invoiceFixture(),db=f.db;t.after(()=>db.close());
 const invoice=(await f.as(owner,()=>f.prepare(a,10))).rows[0].id;
 const invoiceB=(await f.as(owner,()=>f.prepare(b,20))).rows[0].id;
 await db.exec(`create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(auth.jwt()->>'sub',''),nullif(current_setting('request.jwt.claim.sub',true),''))::uuid$$;
 insert into auth.users values('${machine}','backend@test.invalid');insert into auth.sessions values('${session}','${machine}',null),('${ownerSession}','${owner}',null),('${managerSession}','${manager}',null);`);
 for(const name of ['t19-standard-store.sql','t19-standard-backend-role.sql','t19-standard-https.sql','t19-standard-https-org-pins.sql','t19-standard-request-principal.sql','t19-standard-jobs.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));
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
 const approve=async(business=a,inv=invoice,customer='123',actor=owner)=>{await claims(actor,actor===owner?ownerSession:managerSession);await db.exec('set role authenticated');try{return (await db.query('select public.t19_standard_approve_invoice($1,$2,$3) id',[business,inv,customer])).rows[0].id;}finally{await db.exec('reset role');}};
 let posts=0,fault=null,remote=null;
 const fetchImpl=async(url,options)=>{
  const u=new URL(url);assert.equal(u.searchParams.get('organization_id'),'111');assert.equal(options.headers.Authorization,'Zoho-oauthtoken synthetic-access');
  if(u.pathname.endsWith('/organizations'))return Response.json({code:0,organizations:[{organization_id:'111',currency_code:'ZAR',is_org_active:true}]});
  if(u.pathname.endsWith('/contacts/123'))return Response.json({code:0,contact:{contact_id:'123',contact_name:'Synthetic customer',currency_code:'ZAR',status:'active'}});
  if(u.pathname.endsWith('/invoices')&&options.method==='POST'){
   posts++;assert.equal(u.searchParams.get('send'),'false');const p=JSON.parse(options.body);
   remote={invoice_id:'9001',invoice_number:'TEST-1',reference_number:p.reference_number,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,total:'100.00',sub_total:'100.00',tax_total:0,shipping_charge:0,adjustment:0,payment_made:0,credits_applied:0,line_items:[{name:'Synthetic service',quantity:1,rate:'100.00',item_total:'100.00',unit:'visit',tax_id:'',discount_amount:0}]};
   if(fault==='lost_response')throw Error('synthetic provider secret must not escape');return Response.json({code:0,invoice:{invoice_id:'9001'}});
  }
  if(u.pathname.endsWith('/invoices')){
   if(fault==='rate_limit')return new Response('',{status:429});
   return Response.json({code:0,invoices:remote?[{invoice_id:'9001',reference_number:remote.reference_number}]:[],page_context:{has_more_page:false}});
  }
  if(u.pathname.endsWith('/invoices/9001'))return Response.json({code:0,invoice:remote});
  throw Error('unexpected synthetic request');
 };
 const worker=createStandardInvoiceWorker({connection,jobs,fetchImpl});
 await claims();
 return {...f,invoice,invoiceB,claims,rpc,store,jobs,connection,approve,worker,posts:()=>posts,fault:v=>{fault=v;},remote:()=>remote};
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
 // Explicit isolated operator recovery: retain durable dispatch and reopen for read-only reconciliation.
 await f.db.query("update private_t19_standard.invoice_jobs set state='running',available_at=clock_timestamp() where id=$1",[jobId]);
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
