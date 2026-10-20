import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {PassThrough,Writable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {renderWorkspace} from '../src/workspace.js';
import {accessOptions,askPassword,verifyStagingAccess,stagingOrigin} from '../scripts/verify-staging-access.mjs';

const business='10000000-0000-4000-8000-000000000001',foreign='20000000-0000-4000-8000-000000000002';
const cookie='faraios_staging=12345678-1234-4234-8234-123456789012';
const password=' synthetic secret with spaces ';
const options=role=>({role,business,'denied-business':foreign,email:role+'.qa@faraios.test'});
const args=role=>Object.entries(options(role)).map(([key,value])=>`--${key}=${value}`);
const page=(role,all=false,extra=false)=>renderWorkspace({userId:'00000000-0000-4000-8000-000000000001',businessIds:[business],memberships:[{userId:'00000000-0000-4000-8000-000000000001',businessId:business,role,status:'active'},...(extra?[{userId:'00000000-0000-4000-8000-000000000001',businessId:foreign,role,status:'active'}]:[])],businesses:[{id:business,name:'Synthetic QA business'},...(extra?[{id:foreign,name:'Synthetic other business'}]:[])]},all?'all':business);

function fixture(role,{allowForeign=false,authStatus=303,ownerSettings=403,moduleStatus,extraBusiness=false,badLocation=false,logoutStatus=303,throwOnModule=false,largePage=false}={}){
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
  if(path.pathname==='/dashboard')return new Response(denied?'private denied body':page(role,path.searchParams.get('business')==='all',extraBusiness),{status:denied?(allowForeign?200:403):200});
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
