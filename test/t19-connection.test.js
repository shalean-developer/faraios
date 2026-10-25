import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {request} from 'node:http';
import {readFileSync} from 'node:fs';
import {createConnectionService,validateManifest,origin} from '../src/t19-connection.js';
const businessId='00000000-0000-4000-8000-000000000001', foreignBusiness='00000000-0000-4000-8000-000000000002';
const manifest={businessId,organizationId:'111',identity:'test@example.invalid',zohoUserId:'123',apiDomain:'https://www.zohoapis.com',environment:'staging',currency:'ZAR',approved:true,custodyVerification:{secretSourceVerified:true},clientVerification:{clientType:'Server-based',clientOwner:'synthetic-owner'},approvalReference:'owner-approved-synthetic',operator:'test-operator',custodian:'test-custodian',reviewer:'test-reviewer',probeSha:'synthetic-reviewed-sha',clientId:'dummy-client',redirectUri:origin+'/zoho/callback',startsAt:0,endsAt:60000,fixture:{invoiceId:'9001',customerId:'222',number:'TEST-1',reference:'SYNTHETIC-1',status:'draft',totalCents:100},fixtureEvidence:'synthetic-ui',identityEvidence:'attended-synthetic',cleanupReference:'synthetic-cleanup'};
function harness({execution=true,fetchOverride,manifestOverride={}}={}){
 let current=1000,db={connections:{},clients:{'dummy-client':{clientSecret:'dummy-client-secret',businessId,organizationId:'111',approvalDigest:createHash('sha256').update(JSON.stringify({...manifest,...manifestOverride})).digest('hex')}}},reads=0,writes=0;const calls=[];
 const users=new Map([['owner',{userId:'10000000-0000-4000-8000-000000000001',businessIds:[businessId],memberships:[{businessId,role:'owner',status:'active'}]}],['foreign',{userId:'10000000-0000-4000-8000-000000000002',businessIds:[foreignBusiness],memberships:[{businessId:foreignBusiness,role:'owner',status:'active'}]}],['manager',{userId:'10000000-0000-4000-8000-000000000003',businessIds:[businessId],memberships:[{businessId,role:'manager',status:'active'}]}]]);
 const sessions={read:async sid=>structuredClone(users.get(sid)??null),login:async email=>({id:email,identity:users.get(email)})};
 const vault={read:async()=>{reads++;return structuredClone(db);},write:async value=>{writes++;db=structuredClone(value);}};
 const fetchImpl=async(url,options)=>{calls.push({url,options});if(fetchOverride)return fetchOverride(url,options);const path=new URL(url).pathname;
  if(path==='/oauth/v2/token')return Response.json({access_token:'dummy-access',refresh_token:'dummy-refresh',api_domain:'https://www.zohoapis.com',expires_in:3600,token_type:'Bearer'});
  if(path==='/books/v3/organizations/111')return Response.json({code:0,organization:{organization_id:'111',currency_code:'ZAR',is_org_active:true}});
  if(path==='/books/v3/invoices/9001')return Response.json({code:0,invoice:{invoice_id:'9001',customer_id:'222',invoice_number:'TEST-1',reference_number:'SYNTHETIC-1',status:'draft',total:'1.00',currency_code:'ZAR'}});
  throw new Error('Unexpected synthetic request');
 };
 const built=createConnectionService({vault,sessions,manifest:{...manifest,...manifestOverride},execution,fetchImpl,now:()=>current});
 return {...built,calls,users,vault,sessions,get db(){return structuredClone(db);},get reads(){return reads;},get writes(){return writes;},setNow:value=>{current=value;},async consent(){const start=await built.service.authorise('owner');const state=new URL(start.authorizationUrl).searchParams.get('state');await built.service.callback('owner',state,'dummy-code');return state;}};
}
const rejected=(promise,code)=>assert.rejects(promise,e=>e.code===code);
test('review manifest matches registered callback but remains unapproved; former callback fails execution validation',()=>{
 const review=JSON.parse(readFileSync(new URL('../config/t19-shalean-review.json',import.meta.url),'utf8'));
 validateManifest(review);assert.equal(review.redirectUri,origin+'/zoho/callback');assert.equal(review.redirectUri,review.clientVerification.registeredRedirectUri);assert.equal(review.clientVerification.callbackMatchesRequired,true);assert.equal(review.approved,false);
 assert.throws(()=>validateManifest(review,{execution:true}),e=>e.code==='approval_required');
 assert.throws(()=>validateManifest({...manifest,redirectUri:origin+'/oauth/callback'},{execution:true,now:1000}),e=>e.code==='approval_required');
});
async function httpHarness(t,h){await new Promise(r=>h.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>h.server.close(r)));const port=h.server.address().port;
 const send=({path='/',method='GET',data,headers={}}={})=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path,method,headers:{Host:'127.0.0.1:3102',...(data?{'Content-Type':'application/json',Origin:origin}:{}),...headers}},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:body?JSON.parse(body):null}));});req.on('error',reject);if(data)req.write(JSON.stringify(data));req.end();});
 const login=await send({path:'/login',method:'POST',data:{email:'owner',password:'dummy'}});assert.equal(login.status,200);assert.match(login.headers['set-cookie'][0],/HttpOnly; SameSite=Lax; Path=\//);const cookie=login.headers['set-cookie'][0].split(';')[0];return {send,cookie,csrf:login.body.csrf};
}
test('synthetic consent, exactly two provider reads, then local disable with distinct revocation state',async()=>{
 const h=harness();await h.consent();assert.equal(h.db.connections[businessId].provenance.kind,'attended');const result=await h.service.verify('owner');assert.equal(result.status,'verified');assert.equal(h.calls.length,3);assert.equal(h.calls[0].options.method,'POST');assert.ok(h.calls.slice(1).every(c=>c.options.method==='GET'));
 const state=await h.service.disable('owner');assert.equal(state.providerRevoked,false);assert.equal(state.cleanupPending,true);assert.equal(state.generation,2);assert.equal(h.db.connections[businessId].credentials,undefined);assert.equal(h.db.connections[businessId].cleanup.refreshToken,'dummy-refresh');await rejected(h.service.verify('owner'),'credentials');assert.equal(h.calls.length,3);
});
test('owner-only business isolation rejects before vault and provider access',async()=>{const h=harness();for(const sid of [undefined,'foreign','manager'])for(const action of ['status','authorise','verify','disable'])await rejected(h.service[action](sid),'forbidden');assert.equal(h.reads,0);assert.equal(h.calls.length,0);});
test('execution gate blocks authorisation and verification without provider or storage access',async()=>{const h=harness({execution:false});await rejected(h.service.authorise('owner'),'approval_required');await rejected(h.service.verify('owner'),'approval_required');assert.equal(h.reads,0);assert.equal(h.calls.length,0);});
test('manifest approval, time-window and fixture requirements fail closed',()=>{for(const change of [{approved:false},{custodian:''},{fixture:null},{startsAt:2000},{endsAt:500},{endsAt:3601001},{redirectUri:'https://evil.invalid/callback'}])assert.throws(()=>validateManifest({...manifest,...change},{execution:true,now:1000}),e=>e.code==='approval_required');});
test('OAuth state is session-bound, single-use and invalid callbacks never exchange',async()=>{const h=harness();const {authorizationUrl}=await h.service.authorise('owner');const state=new URL(authorizationUrl).searchParams.get('state');await rejected(h.service.callback('foreign',state,'dummy-code'),'oauth_state');await rejected(h.service.callback('owner',state,'dummy-code'),'oauth_state');assert.equal(h.calls.length,0);});
test('successful callback cannot be replayed and same window cannot authorise twice',async()=>{const h=harness();const state=await h.consent();await rejected(h.service.callback('owner',state,'dummy-code'),'oauth_state');await rejected(h.service.authorise('owner'),'already_attempted');assert.equal(h.calls.length,1);});
test('owner revoked before callback prevents token exchange',async()=>{const h=harness();const {authorizationUrl}=await h.service.authorise('owner');h.users.delete('owner');await rejected(h.service.callback('owner',new URL(authorizationUrl).searchParams.get('state'),'dummy-code'),'forbidden');assert.equal(h.calls.length,0);});
test('approval expiry blocks callback and reads without exchange or refresh',async()=>{const h=harness();const {authorizationUrl}=await h.service.authorise('owner');h.setNow(60000);await rejected(h.service.callback('owner',new URL(authorizationUrl).searchParams.get('state'),'dummy-code'),'approval_required');assert.equal(h.calls.length,0);});
test('credential expiry and stale credential context reject without provider calls',async()=>{for(const type of ['expiry','context']){const h=harness();await h.consent();const data=h.db;const c=data.connections[businessId];if(type==='expiry')c.credentials.expiresAt=1000;else c.credentials.context='foreign';await h.vault.write(data);await rejected(h.service.verify('owner'),'credentials');assert.equal(h.calls.length,1);}});
test('immutable binding rejects after restart with changed organisation',async()=>{const h=harness();await h.consent();const restarted=createConnectionService({vault:h.vault,sessions:h.sessions,manifest:{...manifest,organizationId:'999'},execution:true,fetchImpl:()=>{throw Error('must not fetch');},now:()=>1000});await rejected(restarted.service.status('owner'),'binding');});
test('verification is single attempt and error bodies never leak provider credentials',async()=>{const h=harness();await h.consent();await h.service.verify('owner');await rejected(h.service.verify('owner'),'credentials');assert.equal(h.calls.length,3);assert.doesNotMatch(JSON.stringify(await h.service.status('owner')),/dummy-access|dummy-refresh|dummy-client-secret/);});
test('disable during in-flight profile prevents invoice and late verification evidence',async()=>{
 let release,started;const startedPromise=new Promise(r=>started=r);const h=harness({fetchOverride:async(url)=>{if(new URL(url).pathname==='/oauth/v2/token')return Response.json({access_token:'dummy-access',refresh_token:'dummy-refresh',api_domain:'https://www.zohoapis.com',expires_in:3600,token_type:'Bearer'});started();return new Promise(r=>release=()=>r(Response.json({code:0,organization:{organization_id:'111',currency_code:'ZAR',is_org_active:true}})));}});
 await h.consent();const running=h.service.verify('owner');const check=rejected(running,'stale');await startedPromise;await h.service.disable('owner');release();await check;assert.equal(h.calls.length,2);assert.equal(h.db.connections[businessId].evidence,undefined);assert.equal(h.db.connections[businessId].status,'disabled');
});
test('HTTP host/origin/CSRF/method/body and foreign route restrictions',async t=>{const h=harness();const {send,cookie,csrf}=await httpHarness(t,h);
 const action={path:`/connections/${businessId}/authorise`,method:'POST',data:{},headers:{Cookie:cookie,'x-csrf-token':csrf}};
 assert.equal((await send({...action,headers:{...action.headers,Host:'evil.invalid'}})).status,403);
 assert.equal((await send({...action,headers:{...action.headers,Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await send({...action,headers:{Cookie:cookie}})).status,403);
 assert.equal((await send({...action,data:{organization_id:'999'}})).status,400);
 assert.equal((await send({...action,path:`/connections/${foreignBusiness}/authorise`})).status,404);
 assert.equal((await send({path:action.path,headers:{Cookie:cookie}})).status,405);
 assert.equal((await send({path:`/connections/${businessId}?organization_id=999`,headers:{Cookie:cookie}})).status,400);
 assert.equal(h.calls.length,0);assert.equal(h.reads,0);
});
test('registered callback matches consent and exchange, rejects old route and duplicate state',async t=>{const h=harness();const {send,cookie,csrf}=await httpHarness(t,h);
 const start=await send({path:`/connections/${businessId}/authorise`,method:'POST',data:{},headers:{Cookie:cookie,'x-csrf-token':csrf}});const state=new URL(start.body.authorizationUrl).searchParams.get('state');
 assert.equal(new URL(start.body.authorizationUrl).searchParams.get('redirect_uri'),origin+'/zoho/callback');
 const reads=h.reads;
 const old=await send({path:'/oauth/callback?state='+state+'&code=dummy',headers:{Cookie:cookie}});assert.equal(old.status,400);assert.equal(h.calls.length,0);assert.equal(h.reads,reads);
 const bad=await send({path:'/zoho/callback?state='+state+'&state='+state+'&code=dummy',headers:{Cookie:cookie}});assert.equal(bad.status,303);assert.equal(bad.headers.location,'/');assert.equal(h.calls.length,0);
 const good=await send({path:'/zoho/callback?state='+state+'&code=dummy',headers:{Cookie:cookie}});assert.equal(good.status,303);assert.equal(good.headers.location,'/');assert.equal(good.headers['cache-control'],'no-store');assert.equal(good.headers['referrer-policy'],'no-referrer');assert.doesNotMatch(JSON.stringify(good),/dummy-access|dummy-refresh/);
 assert.equal(h.calls.length,1);assert.equal(new URLSearchParams(h.calls[0].options.body).get('redirect_uri'),origin+'/zoho/callback');
});


test('OAuth state expires independently of the longer approved window',async()=>{const h=harness({manifestOverride:{endsAt:600000}});const {authorizationUrl}=await h.service.authorise('owner');h.setNow(301001);await rejected(h.service.callback('owner',new URL(authorizationUrl).searchParams.get('state'),'dummy-code'),'oauth_state');assert.equal(h.calls.length,0);});
test('late grant after disable is retained only for cleanup and never authenticates',async()=>{
 let release,started;const ready=new Promise(r=>started=r);const h=harness({fetchOverride:async()=>{started();return new Promise(r=>release=()=>r(Response.json({access_token:'dummy-access',refresh_token:'dummy-refresh',api_domain:'https://www.zohoapis.com',expires_in:3600,token_type:'Bearer'})));}});
 const {authorizationUrl}=await h.service.authorise('owner');const pending=h.service.callback('owner',new URL(authorizationUrl).searchParams.get('state'),'dummy-code');const check=rejected(pending,'stale');await ready;await h.service.disable('owner');release();await check;const c=h.db.connections[businessId];assert.equal(c.status,'disabled');assert.equal(c.credentials,undefined);assert.equal(c.cleanup.refreshToken,'dummy-refresh');assert.equal(c.cleanup.accessToken,undefined);
});
test('HTTP write/sync/list/refresh routes are unavailable',async t=>{const h=harness();const {send,cookie,csrf}=await httpHarness(t,h);for(const action of ['sync','create','refresh','list']){const result=await send({path:`/connections/${businessId}/${action}`,method:'POST',data:{},headers:{Cookie:cookie,'x-csrf-token':csrf}});assert.equal(result.status,404);}assert.equal(h.calls.length,0);assert.equal(h.reads,0);});


test('disable while invoice is in flight discards late success',async()=>{
 let release,started;const ready=new Promise(r=>started=r);const h=harness({fetchOverride:async url=>{const path=new URL(url).pathname;
 if(path==='/oauth/v2/token')return Response.json({access_token:'dummy-access',refresh_token:'dummy-refresh',api_domain:'https://www.zohoapis.com',expires_in:3600,token_type:'Bearer'});
 if(path==='/books/v3/organizations/111')return Response.json({code:0,organization:{organization_id:'111',currency_code:'ZAR',is_org_active:true}});
 started();return new Promise(r=>release=()=>r(Response.json({code:0,invoice:{invoice_id:'9001',customer_id:'222',invoice_number:'TEST-1',reference_number:'SYNTHETIC-1',status:'draft',total:'1.00',currency_code:'ZAR'}})));}});
 await h.consent();const running=h.service.verify('owner');const check=rejected(running,'stale');await ready;await h.service.disable('owner');release();await check;assert.equal(h.calls.length,3);assert.equal(h.db.connections[businessId].evidence,undefined);assert.equal(h.db.connections[businessId].status,'disabled');
});
test('real auth-session adapter uses verified Auth identity and current membership rows',async()=>{
 const {createAuthSessions}=await import('../src/auth-session.js');const userId='10000000-0000-4000-8000-000000000001';let role='owner',active=true,authChecks=0,reads=0;
 const client={auth:{signInWithPassword:async()=>({data:{session:{expires_at:600,user:{id:'forged',user_metadata:{role:'owner'}}}}}),getUser:async()=>{authChecks++;return {data:{user:{id:userId}}};}},from(table){const query={select(){return query;},eq(){return query;},then(resolve,reject){return Promise.resolve({data:table==='businesses'?[{id:businessId,name:'Synthetic TEST'}]:active?[{business_id:businessId,user_id:userId,role,status:'active'}]:[]}).then(resolve,reject);}};return query;}};
 const sessions=createAuthSessions({createClient:()=>client,now:()=>1000});const login=await sessions.login('synthetic@example.invalid','dummy-password');assert.equal(login.identity.userId,userId);
 const vault={read:async()=>{reads++;return {connections:{}};},write:async()=>{throw Error('unexpected write');}};
 const {service}=createConnectionService({vault,sessions,manifest,execution:false,now:()=>1000});assert.equal((await service.status(login.id)).status,'unconfigured');assert.equal(reads,1);
 role='manager';await rejected(service.status(login.id),'forbidden');assert.equal(reads,1);role='owner';active=false;await rejected(service.status(login.id),'forbidden');assert.equal(reads,1);assert.ok(authChecks>=4);
});


test('stored client metadata cannot cross business or organisation boundary',async()=>{for(const change of [{businessId:foreignBusiness},{organizationId:'999'}]){const h=harness();const db=h.db;Object.assign(db.clients['dummy-client'],change);await h.vault.write(db);await rejected(h.service.authorise('owner'),'credentials');assert.equal(h.calls.length,0);assert.deepEqual(h.db.connections,{});}});

test('restart cannot relabel a stored grant under changed client, window or fixture approval',async()=>{
 for(const change of [{clientId:'different-client'},{endsAt:120000},{fixture:{...manifest.fixture,invoiceId:'9002'}}]){
  const h=harness();await h.consent();let outbound=0;
  const changed=createConnectionService({vault:h.vault,sessions:h.sessions,manifest:{...manifest,...change},execution:true,now:()=>1000,fetchImpl:async()=>{outbound++;throw Error('must not fetch');}});
  await rejected(changed.service.status('owner'),'binding');await rejected(changed.service.verify('owner'),'binding');assert.equal(outbound,0);
 }
});

test('unverified secret source or client registration blocks before vault and provider access',async()=>{
 for(const patch of [{custodyVerification:undefined},{custodyVerification:{secretSourceVerified:false}},{clientVerification:undefined},{clientVerification:{clientType:'ORG',clientOwner:'synthetic-owner'}},{clientVerification:{clientType:'Server-based',clientOwner:'Unknown'}}]){
  const h=harness({manifestOverride:patch});await rejected(h.service.authorise('owner'),'approval_required');assert.equal(h.reads,0);assert.equal(h.writes,0);assert.equal(h.calls.length,0);
 }
});

test('consent rejects changed or missing imported manifest digest before connection creation',async()=>{
 for(const digest of [undefined,'other-reviewed-manifest']){
  const h=harness(),db=h.db;db.clients['dummy-client'].approvalDigest=digest;await h.vault.write(db);
  const writes=h.writes;await rejected(h.service.authorise('owner'),'credentials');assert.equal(h.calls.length,0);assert.equal(h.writes,writes);assert.deepEqual(h.db.connections,{});
 }
 const h=harness();const changed=createConnectionService({vault:h.vault,sessions:h.sessions,manifest:{...manifest,identity:'changed@example.invalid',approvalReference:'different-approval'},execution:true,fetchImpl:()=>{throw Error('must not fetch');},now:()=>1000});
 await rejected(changed.service.authorise('owner'),'credentials');assert.deepEqual(h.db.connections,{});assert.equal(h.calls.length,0);
});

test('disabled connection rejects a previously issued callback without token exchange',async()=>{
 const h=harness();
 const {authorizationUrl}=await h.service.authorise('owner');
 const state=new URL(authorizationUrl).searchParams.get('state');
 const disabled=await h.service.disable('owner');
 assert.equal(disabled.status,'disabled');
 await rejected(h.service.callback('owner',state,'dummy-code'),'oauth_state');
 assert.equal(h.calls.length,0);
 assert.equal(h.db.connections[businessId].credentials,undefined);
 assert.equal(h.db.connections[businessId].status,'disabled');
});
