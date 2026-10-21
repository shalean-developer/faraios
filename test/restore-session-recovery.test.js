import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {clearRestoreStaffSessions} from '../scripts/clear-restore-staff-sessions.mjs';
const password='synthetic private password';
const token='synthetic.access.token';
const account={id:'12345678-1234-4234-8234-123456789012',email:'cleaner.qa@faraios.test'};
const origin='https://zrlojsvkqipuwkkyfrkn.supabase.co';

function fixture({user=account,failure,controller}={}){
 const calls=[];
 return {calls,fetchImpl:async(url,init)=>{
  assert.equal(new URL(url).origin,origin);assert.equal(init.redirect,'error');
  const path=new URL(url).pathname+new URL(url).search;calls.push(path);
  assert.ok(init.signal);assert.match(init.headers.apikey,/^sb_publishable_/);
  if(path==='/auth/v1/token?grant_type=password'){
   assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body),{email:account.email,password});
   assert.equal(init.headers.Authorization,undefined);
   return failure==='password'?Response.json({private:password},{status:400}):Response.json({access_token:token});
  }
  assert.equal(init.headers.Authorization,'Bearer '+token);
  if(path==='/auth/v1/user'){
   assert.equal(init.method,'GET');
   if(failure==='identity')throw Error(password+' '+token);
   if(controller)controller.abort();
   return Response.json(user);
  }
  assert.equal(init.method,'POST');assert.equal(init.body,undefined);
  assert.ok(['/auth/v1/logout?scope=global','/auth/v1/logout?scope=local'].includes(path));
  if(failure==='global'&&path.endsWith('global'))throw Error(password+' '+token);
  return new Response(null,{status:204});
 }};
}

test('only the fixed restored staff QA account is verified before global provider sign-out',async()=>{
 const f=fixture(),report=await clearRestoreStaffSessions(password,{fetchImpl:f.fetchImpl});
 assert.deepEqual(f.calls,['/auth/v1/token?grant_type=password','/auth/v1/user','/auth/v1/logout?scope=global']);
 assert.equal(report.providerSignOut,'ACKNOWLEDGED');assert.equal(report.sessionRowVerification,'PENDING_READ_ONLY_CHECK');assert.equal(report.localAppSessions,'RESTART_REQUIRED');assert.equal(report.businessWrites,'NOT_PERFORMED');
 for(const secret of [password,token,account.id])assert.ok(!JSON.stringify(report).includes(secret));
});
test('wrong verified account or failed verification cleans only the new session; no global action',async()=>{
 for(const setup of [{user:{...account,email:'manager.qa@faraios.test'}},{user:{...account,id:'-'.repeat(36)}},{failure:'identity'}]){
  const f=fixture(setup),report=await clearRestoreStaffSessions(password,{fetchImpl:f.fetchImpl});
  assert.equal(report.providerSignOut,'UNCONFIRMED');assert.equal(report.localCleanup,'ACKNOWLEDGED');assert.ok(!f.calls.some(p=>p.endsWith('global')));assert.equal(f.calls.at(-1),'/auth/v1/logout?scope=local');
  assert.ok(!JSON.stringify(report).includes(password));assert.ok(!JSON.stringify(report).includes(token));
 }
});
test('failed password and lost global response cannot pass or trigger an automatic retry',async()=>{
 for(const failure of ['password','global']){
  const f=fixture({failure}),report=await clearRestoreStaffSessions(password,{fetchImpl:f.fetchImpl});
  assert.equal(report.providerSignOut,'UNCONFIRMED');assert.equal(report.localCleanup,'NOT_NEEDED');assert.equal(f.calls.length,failure==='password'?1:3);assert.equal(report.failure,failure==='password'?'SIGN_IN_REJECTED':'SIGN_OUT_UNCONFIRMED');
  for(const secret of [password,token])assert.ok(!JSON.stringify(report).includes(secret));
 }
});
test('cancellation after verification prevents global action and gives local cleanup a fresh signal',async()=>{
 const controller=new AbortController(),f=fixture({controller});
 const report=await clearRestoreStaffSessions(password,{signal:controller.signal,fetchImpl:async(url,init)=>{
  if(url.endsWith('scope=local'))assert.equal(init.signal.aborted,false);
  return f.fetchImpl(url,init);
 }});
 assert.equal(report.failure,'RECOVERY_CANCELLED');assert.equal(report.localCleanup,'ACKNOWLEDGED');assert.ok(!f.calls.some(p=>p.endsWith('global')));
});
test('a real expired deadline has a fixed label and no success or retry',async()=>{
 let calls=0;
 const report=await clearRestoreStaffSessions(password,{timeoutMs:25,fetchImpl:async(_url,init)=>{calls++;return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>resolve(Response.json({access_token:token})),500);
  init.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Error(password+' '+token));},{once:true});
 });}});
 assert.equal(report.failure,'SIGN_IN_TIMEOUT');assert.equal(report.providerSignOut,'UNCONFIRMED');assert.equal(calls,1);
});
test('malformed password and unbounded deadline stop before any request',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('must not run');};
 for(const timeoutMs of [0,30_001,NaN,Infinity,1.5])await assert.rejects(clearRestoreStaffSessions(password,{timeoutMs,fetchImpl}),/INVALID_TIMEOUT/);
 for(const value of ['',null,'x'.repeat(1025)])await assert.rejects(clearRestoreStaffSessions(value,{fetchImpl}),/INVALID_PASSWORD/);
 assert.equal(calls,0);
});
test('CLI refuses arguments and noninteractive input without echoing values or contacting Auth',()=>{
 for(const args of [[],['--password='+password],['--email=other@example.invalid']]){
  const r=spawnSync(process.execPath,['scripts/clear-restore-staff-sessions.mjs',...args],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,args.length?/INVALID_OPTIONS/:/INTERACTIVE_TERMINAL_REQUIRED/);
  assert.ok(!r.stdout.includes(password));assert.ok(!r.stderr.includes(password));assert.ok(!r.stderr.includes('other@example.invalid'));
 }
});
