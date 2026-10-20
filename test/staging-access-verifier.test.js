import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {PassThrough,Writable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {renderWorkspace} from '../src/workspace.js';
import {accessOptions,askPassword,verifyStagingAccess,stagingOrigin,restoreOrigin} from '../scripts/verify-staging-access.mjs';

const business='10000000-0000-4000-8000-000000000001',foreign='20000000-0000-4000-8000-000000000002';
const cookie='faraios_staging=12345678-1234-4234-8234-123456789012';
const password=' synthetic secret with spaces ';
const options=role=>({role,business,'denied-business':foreign,email:role+'.qa@faraios.test'});
const sharedOptions=()=>({role:'staff',business,'shared-business':foreign,email:'staff.qa@faraios.test'});
const args=role=>Object.entries(options(role)).map(([key,value])=>`--${key}=${value}`);
const page=(role,all=false,extra=false,selected=business)=>renderWorkspace({userId:'00000000-0000-4000-8000-000000000001',businessIds:[business],memberships:[{userId:'00000000-0000-4000-8000-000000000001',businessId:business,role,status:'active'},...(extra?[{userId:'00000000-0000-4000-8000-000000000001',businessId:foreign,role,status:'active'}]:[])],businesses:[{id:business,name:'Synthetic QA business'},...(extra?[{id:foreign,name:'Synthetic other business'}]:[])]},all?'all':selected);

test('restore verifier uses only its fixed port/cookie and requires isolation before credential submission',async()=>{
 for(const role of ['manager','staff']){
  const f=fixture(role,{sharedBusiness:role==='staff'}),calls=[];
  const transport=async(url,init)=>{
   calls.push(url);assert.equal(new URL(url).origin,restoreOrigin);
   if(new URL(url).pathname==='/restore-health')return Response.json({environment:'restore-test',businessWrites:'disabled',accountingWorker:'disabled'});
   const headers={...init.headers};if(headers.Origin)headers.Origin=stagingOrigin;if(headers.Cookie)headers.Cookie=headers.Cookie.replace('faraios_restore_test=','faraios_staging=');
   const response=await f.transport(url.replace(restoreOrigin,stagingOrigin),{...init,headers});
   const rh=new Headers(response.headers);const cookie=rh.get('set-cookie');if(cookie)rh.set('set-cookie',cookie.replace('faraios_staging=','faraios_restore_test='));
   return new Response((await response.text()).replace('FaraiOS STAGING · No production data','FaraiOS RESTORE TEST · Integrations disabled'),{status:response.status,headers:rh});
  };
  const report=await verifyStagingAccess(role==='staff'?sharedOptions():options(role),password,{restoreTest:true,fetchImpl:transport});assert.equal(report.passed,true);assert.equal(report.cleanup,'PASSED');assert.equal(report.environment,'restore-test');assert.equal(calls[0],restoreOrigin+'/restore-health');
 }
 let count=0;const report=await verifyStagingAccess(options('manager'),password,{restoreTest:true,fetchImpl:async()=>{count++;return Response.json({environment:'staging',businessWrites:'enabled',accountingWorker:'enabled'});}});assert.equal(report.passed,false);assert.equal(count,1);
});

function fixture(role,{allowForeign=false,sharedBusiness=false,authStatus=303,ownerSettings=403,moduleStatus,extraBusiness=false,badLocation=false,logoutStatus=303,throwOnModule=false,largePage=false}={}){
 const calls=[];let loggedIn=false,ended=false;
 const transport=async(url,init)=>{
  calls.push({url,init});assert.equal(new URL(url).origin,stagingOrigin);assert.equal(init.redirect,'manual');
  const path=new URL(url),method=init.method;
  if(method==='POST'){
   assert.ok(['/login','/logout'].includes(path.pathname));assert.equal(init.headers.Origin,stagingOrigin);
   if(path.pathname==='/login'){
    assert.equal(init.body.get('password'),password);loggedIn=authStatus===303;
    return new Response('private page body',{status:authStatus,headers:loggedIn?{'Set-Cookie':cookie+'; HttpOnly; SameSite=Strict; Path=/','Location':badLocation?'https://example.invalid/?secret=private-redirect':'/dashboard'}:{}});
   }
   assert.equal(init.headers.Cookie,cookie);ended=true;
   return new Response('',{status:logoutStatus,headers:{Location:'/login'}});
  }
  assert.equal(method,'GET');
  if(path.pathname==='/login')return new Response(largePage?'x'.repeat(1_048_577):'<div>FaraiOS STAGING · No production data</div><form action="/login">',{status:200});
  assert.equal(init.headers.Cookie,cookie);assert.equal(loggedIn,true);
  if(ended)return new Response('',{status:303,headers:{Location:'/login'}});
  const denied=path.searchParams.get('business')===foreign;
  if(path.pathname==='/dashboard')return new Response(denied&&!sharedBusiness?'private denied body':page(role,path.searchParams.get('business')==='all',extraBusiness||sharedBusiness,denied?foreign:business),{status:denied&&!sharedBusiness?(allowForeign?200:403):200});
  if(path.pathname==='/settings')return new Response('private settings body',{status:ownerSettings});
  if(throwOnModule)throw new Error('transport error with '+password+' '+cookie);
  return new Response('private module body',{status:moduleStatus??(denied||role==='staff'?403:200)});
 };
 return {transport,calls};
}

for(const role of ['manager','staff'])test(role+' verifier requires permitted reads, forbidden reads and local-session cleanup',async()=>{
 const f=fixture(role),r=await verifyStagingAccess(options(role),password,{fetchImpl:f.transport});
 assert.equal(r.passed,true);assert.equal(r.cleanup,'PASSED');assert.equal(r.checks.filter(c=>c.name.startsWith('OTHER_')).length,9);
 assert.deepEqual(f.calls.filter(c=>c.init.method==='POST').map(c=>new URL(c.url).pathname),['/login','/logout']);
 assert.ok(f.calls.some(c=>new URL(c.url).searchParams.get('role')==='owner'));
 const serialized=JSON.stringify(r);for(const secret of [password,cookie,'private module body','private denied body'])assert.ok(!serialized.includes(secret));
});

test('shared staff must have both exact dashboard memberships while all office modules and settings stay denied',async()=>{
 const f=fixture('staff',{sharedBusiness:true}),r=await verifyStagingAccess(sharedOptions(),password,{fetchImpl:f.transport});
 assert.equal(r.passed,true);assert.equal(r.cleanup,'PASSED');assert.equal(r.checks.length,35);
 for(const name of ['SHARED_BUSINESS_SCOPE','VERIFIED_ROLE','STAFF_DASHBOARD_SCOPE','SHARED_VERIFIED_ROLE','SHARED_STAFF_DASHBOARD_SCOPE'])assert.ok(r.checks.some(c=>c.name===name&&c.pass));
 for(const name of ['OWN_DASHBOARD','SHARED_DASHBOARD'])assert.ok(r.checks.some(c=>c.name===name&&c.actual===200&&c.pass));
 const modules=['CUSTOMERS','BOOKINGS','CATALOGUE','STAFF','QUOTES','RECURRING','CALENDAR','INVOICES'];
 for(const prefix of ['OWN','SHARED'])for(const module of [...modules,'OWNER_SETTINGS'])assert.ok(r.checks.some(c=>c.name===prefix+'_'+module&&c.actual===403&&c.pass));
 assert.ok(!r.checks.some(c=>c.name.startsWith('OTHER_')));
 assert.deepEqual(f.calls.filter(c=>c.init.method==='POST').map(c=>new URL(c.url).pathname),['/login','/logout']);
 assert.ok(f.calls.filter(c=>new URL(c.url).searchParams.get('business')===foreign).every(c=>new URL(c.url).searchParams.get('role')==='owner'));
 for(const secret of [password,cookie,'private module body'])assert.ok(!JSON.stringify(r).includes(secret));
});

test('shared staff cannot pass with missing/extra membership, elevated role or exposed office access',async()=>{
 for(const change of ['missing','extra','role','office']){
  const f=fixture('staff',{sharedBusiness:change!=='missing'});
  const r=await verifyStagingAccess(sharedOptions(),password,{fetchImpl:async(url,init)=>{
   const path=new URL(url);
   if(change==='extra'&&path.pathname==='/dashboard'&&path.searchParams.get('business')==='all')return new Response(page('staff',true,true).replace('</select>','<option value="30000000-0000-4000-8000-000000000003">Unexpected business</option></select>'));
   if(change==='role'&&path.pathname==='/dashboard'&&path.searchParams.get('business')===foreign)return new Response(page('manager',false,true,foreign));
   if(change==='office'&&path.pathname==='/invoices'&&path.searchParams.get('business')===foreign)return new Response('private invoice body');
   return f.transport(url,init);
  }});
  assert.equal(r.passed,false);assert.equal(r.failure,'CHECK_FAILED');assert.equal(r.cleanup,'PASSED');assert.ok(r.checks.some(c=>!c.pass));assert.ok(!JSON.stringify(r).includes('private invoice body'));
 }
 const f=fixture('staff',{sharedBusiness:true});const r=await verifyStagingAccess(options('staff'),password,{fetchImpl:f.transport});assert.equal(r.passed,false);assert.equal(r.checks.find(c=>!c.pass).name,'SINGLE_BUSINESS_SCOPE');assert.equal(r.cleanup,'PASSED');
});

test('shared mode rejects ambiguous boundaries and manager use before any request',async()=>{
 for(const invalid of [{...sharedOptions(),role:'manager'},{...sharedOptions(),'denied-business':business},{...sharedOptions(),'shared-business':business},{...sharedOptions(),'shared-business':'invalid'},{...sharedOptions(),'shared-business':undefined}]){
  let calls=0;await assert.rejects(verifyStagingAccess(invalid,password,{fetchImpl:async()=>{calls++;}}),/INVALID_OPTIONS/);assert.equal(calls,0);
 }
});

test('a foreign allow, extra business, owner access, wrong role or module failure cannot pass',async()=>{
 for(const setup of [{allowForeign:true},{extraBusiness:true},{ownerSettings:200},{moduleStatus:503}]){
  const f=fixture('manager',setup),r=await verifyStagingAccess(options('manager'),password,{fetchImpl:f.transport});
  assert.equal(r.passed,false);assert.equal(r.failure,'CHECK_FAILED');assert.equal(r.cleanup,'PASSED');assert.ok(r.checks.some(c=>!c.pass));
 }
 const f=fixture('staff'),r=await verifyStagingAccess(options('manager'),password,{fetchImpl:f.transport});assert.equal(r.passed,false);assert.equal(r.cleanup,'PASSED');
});

test('failed sign-in and oversized/non-staging response stop before business reads',async()=>{
 for(const setup of [{authStatus:401},{largePage:true}]){
  const f=fixture('manager',setup),r=await verifyStagingAccess(options('manager'),password,{fetchImpl:f.transport});
  assert.equal(r.passed,false);assert.equal(r.cleanup,'NOT_NEEDED');assert.ok(!f.calls.some(c=>new URL(c.url).pathname==='/dashboard'));
 }
 const calls=[];const r=await verifyStagingAccess(options('manager'),password,{fetchImpl:async(...a)=>{calls.push(a);return new Response('<form action="/login">Production</form>');}});
 assert.equal(r.passed,false);assert.equal(calls.length,1);assert.equal(r.failure,'CHECK_FAILED');
});

test('request errors are sanitized and logout failure cannot be reported as success',async()=>{
 for(const setup of [{throwOnModule:true},{badLocation:true},{logoutStatus:502}]){
  const f=fixture('manager',setup),r=await verifyStagingAccess(options('manager'),password,{fetchImpl:f.transport});
  assert.equal(r.passed,false);assert.ok(!JSON.stringify(r).includes(password));assert.ok(!JSON.stringify(r).includes(cookie));assert.ok(!JSON.stringify(r).includes('private-redirect'));
  assert.equal(r.cleanup,setup.logoutStatus?'UNCONFIRMED':'PASSED');
 }
});

test('foreign diagnostic/code/message properties cannot leak through the public failure label',async()=>{
 const f=fixture('manager');const sentinel=password+' '+cookie;
 const r=await verifyStagingAccess(options('manager'),password,{fetchImpl:async(url,init)=>{
  if(url.includes('/catalogue?'))throw Object.assign(new Error(sentinel),{diagnostic:sentinel,code:sentinel});
  return f.transport(url,init);
 }});
 assert.equal(r.failure,'REQUEST_FAILED');assert.equal(r.cleanup,'PASSED');assert.ok(!JSON.stringify(r).includes(sentinel));assert.ok(!JSON.stringify(r).includes(password));assert.ok(!JSON.stringify(r).includes(cookie));
 assert.equal(r.requestFailure.check,'OTHER_CATALOGUE');assert.equal(r.requestFailure.phase,'HEADERS');assert.equal(r.requestFailure.httpStatus,null);
});

test('a failed own quote request retains earlier denial evidence and identifies only safe request metadata',async()=>{
 const f=fixture('manager'),sentinel=password+' '+cookie;
 const r=await verifyStagingAccess(options('manager'),password,{fetchImpl:async(url,init)=>{
  const path=new URL(url);if(path.pathname==='/quotes'&&path.searchParams.get('business')===business)throw Object.assign(new Error(sentinel),{code:sentinel,name:'TimeoutError'});
  return f.transport(url,init);
 }});
 assert.equal(r.passed,false);assert.equal(r.failure,'REQUEST_FAILED');assert.equal(r.cleanup,'PASSED');
 assert.deepEqual(r.requestFailure,{check:'OWN_QUOTES',phase:'HEADERS',httpStatus:null,elapsedMs:r.requestFailure.elapsedMs,timeoutMs:10_000});assert.ok(Number.isSafeInteger(r.requestFailure.elapsedMs)&&r.requestFailure.elapsedMs>=0);
 assert.ok(r.checks.some(c=>c.name==='OTHER_QUOTES'&&c.actual===403&&c.pass));assert.ok(!r.checks.some(c=>c.name==='OWN_QUOTES'||c.name.includes('RECURRING')));
 for(const secret of [password,cookie,sentinel])assert.ok(!JSON.stringify(r).includes(secret));
});

test('only an expired local deadline is classified as a request timeout and cleanup gets a fresh deadline',async()=>{
 const f=fixture('manager');
 const r=await verifyStagingAccess(options('manager'),password,{timeoutMs:50,fetchImpl:async(url,init)=>{
  const path=new URL(url);
  if(path.pathname==='/quotes'&&path.searchParams.get('business')===business)return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>resolve(new Response('late')),500);init.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(init.signal.reason);},{once:true});
  });
  if(path.pathname==='/logout')assert.equal(init.signal.aborted,false);
  return f.transport(url,init);
 }});
 assert.equal(r.failure,'REQUEST_TIMEOUT');assert.equal(r.requestFailure.check,'OWN_QUOTES');assert.equal(r.requestFailure.phase,'HEADERS');assert.equal(r.requestFailure.httpStatus,null);assert.equal(r.requestFailure.timeoutMs,50);assert.equal(r.cleanup,'PASSED');assert.equal(r.passed,false);
});

test('body failures retain a received HTTP status without passing an incomplete response',async()=>{
 for(const timedOut of [false,true]){
  const f=fixture('manager');
  const r=await verifyStagingAccess(options('manager'),password,{timeoutMs:50,fetchImpl:async(url,init)=>{
   const path=new URL(url);
   if(path.pathname==='/quotes'&&path.searchParams.get('business')===business)return new Response(new ReadableStream({start(controller){
    if(!timedOut){controller.error(new Error(password+' '+cookie));return;}
    const timer=setTimeout(()=>controller.close(),500);init.signal.addEventListener('abort',()=>{clearTimeout(timer);controller.error(init.signal.reason);},{once:true});
   }}),{status:200});
   return f.transport(url,init);
  }});
  assert.equal(r.failure,timedOut?'REQUEST_TIMEOUT':'REQUEST_FAILED');assert.equal(r.requestFailure.check,'OWN_QUOTES');assert.equal(r.requestFailure.phase,'BODY');assert.equal(r.requestFailure.httpStatus,200);assert.equal(r.cleanup,'PASSED');assert.equal(r.passed,false);assert.ok(!r.checks.some(c=>c.name==='OWN_QUOTES'));assert.ok(!JSON.stringify(r).includes(password));assert.ok(!JSON.stringify(r).includes(cookie));
 }
});

test('cleanup transport diagnostics cannot overwrite the original failure or disclose transport errors',async()=>{
 const f=fixture('manager');
 const r=await verifyStagingAccess(options('manager'),password,{fetchImpl:async(url,init)=>{
  const path=new URL(url);if(path.pathname==='/logout'||path.pathname==='/quotes')throw new Error(password+' '+cookie);return f.transport(url,init);
 }});
 assert.equal(r.failure,'REQUEST_FAILED');assert.equal(r.cleanup,'UNCONFIRMED');assert.equal(r.requestFailure.check,'OTHER_QUOTES');assert.equal(r.cleanupFailure.check,'SIGN_OUT');assert.equal(r.cleanupFailure.phase,'HEADERS');assert.equal(r.cleanupFailure.httpStatus,null);assert.equal(r.passed,false);assert.ok(!JSON.stringify(r).includes(password));assert.ok(!JSON.stringify(r).includes(cookie));
});

test('cancellation after sign-in still uses a fresh cleanup request',async()=>{
 const f=fixture('manager'),controller=new AbortController();let aborted=false;
 const r=await verifyStagingAccess(options('manager'),password,{signal:controller.signal,fetchImpl:async(url,init)=>{
  if(url.includes('/catalogue?')&&!aborted){aborted=true;controller.abort();throw new Error('cancel');}
  if(new URL(url).pathname==='/logout')assert.equal(init.signal.aborted,false);
  return f.transport(url,init);
 }});
 assert.equal(r.failure,'CANCELLED');assert.equal(r.cleanup,'PASSED');assert.equal(r.passed,false);
});

test('ambiguous login outcomes report unconfirmed cleanup rather than inventing a session',async()=>{
 const f=fixture('manager');const r=await verifyStagingAccess(options('manager'),password,{fetchImpl:async(url,init)=>{
  if(init.method==='POST')throw new Error('lost response');return f.transport(url,init);
 }});assert.equal(r.cleanup,'UNCONFIRMED');assert.equal(r.passed,false);
});

test('invalid options cannot send credentials to a configurable origin or accept secrets in arguments',async()=>{
 for(const input of [[...args('manager'),'--origin=https://example.com'],[...args('manager'),'--password=private'],args('manager').map(v=>v.replace('--role=manager','--role=owner')),args('manager').map(v=>v.replace(foreign,business)),args('manager').map(v=>v.replace('@faraios.test','@example.com'))])assert.throws(()=>accessOptions(input),/INVALID_OPTIONS/);
 let calls=0;await assert.rejects(verifyStagingAccess({...options('manager'),origin:'https://example.com'},password,{fetchImpl:async()=>{calls++;}}),/INVALID_OPTIONS/);assert.equal(calls,0);
 for(const timeoutMs of [0,10_001,Infinity,NaN,1.5])await assert.rejects(verifyStagingAccess(options('manager'),password,{timeoutMs,fetchImpl:async()=>{calls++;}}),/INVALID_TIMEOUT/);assert.equal(calls,0);
});

test('hidden terminal input preserves password whitespace and never echoes it',async()=>{
 const input=new PassThrough();input.isTTY=true;input.setRawMode=value=>{input.isRaw=value;return input;};
 let shown='';const output=new Writable({write(chunk,_encoding,done){shown+=chunk;done();}});output.isTTY=true;
 const result=askPassword({input,output});input.write(password+'\r');assert.equal(await result,password);assert.ok(!shown.includes(password));assert.match(shown,/hidden/);assert.equal(input.isRaw,false);
});

test('noninteractive CLI fails with a fixed label and no network or argument disclosure',()=>{
 const result=spawnSync(process.execPath,['scripts/verify-staging-access.mjs',...args('manager')],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/INTERACTIVE_TERMINAL_REQUIRED/);assert.ok(!result.stderr.includes('manager.qa'));
});

test('real HTTP transport observes status and cookie cleanup independently of browser navigation',async()=>{
 const f=fixture('manager');const server=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const response=await f.transport(stagingOrigin+req.url,{method:req.method,redirect:'manual',headers:{Cookie:req.headers.cookie,Origin:req.headers.origin},...(req.method==='POST'?{body:new URLSearchParams(body)}:{})});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const target='http://127.0.0.1:'+server.address().port;const result=await verifyStagingAccess(options('manager'),password,{fetchImpl:(url,init)=>fetch(target+new URL(url).pathname+new URL(url).search,init)});assert.equal(result.passed,true);assert.equal(result.cleanup,'PASSED');}
 finally{await new Promise(resolve=>server.close(resolve));}
});
