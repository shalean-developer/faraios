import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {request as httpRequest} from 'node:http';
import {randomUUID} from 'node:crypto';
import {denyAuthEmail} from '../supabase/functions/t07-deny-auth-email/index.js';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from '../src/staging-server.js';
import {assertHostedEnvironment,assertStagingConfig,createStagingFetch,stagingDatabase,stagingOrigin} from '../src/hosted-staging.js';
const config=JSON.parse(await readFile(new URL('../config/staging.json',import.meta.url),'utf8'));
test('Auth email deny hook never reads a recipient, token or payload',async()=>{
  const input=new Proxy({},{get(){throw new Error('Payload must not be read');}});
  const response=denyAuthEmail(input);assert.equal(response.status,403);assert.equal((await response.json()).error.http_code,403);
});

test('hosted configuration and credential boundary fail closed without exposing values',()=>{
  assertStagingConfig(config);assertHostedEnvironment({NODE_ENV:'production',PATH:'/bin'});
  for(const patch of [{environment:'production'},{projectRef:'zrlojsvkqipuwkkyfrkn'},{url:'https://zrlojsvkqipuwkkyfrkn.supabase.co'},{publishableKey:'sb_publishable_other'}])assert.throws(()=>assertStagingConfig({...config,...patch}),/Invalid hosted staging configuration/);
  for(const name of ['STRIPE_SECRET_KEY','PAYSTACK_SECRET_KEY','SMTP_HOST','RESEND_API_KEY','TWILIO_AUTH_TOKEN','WHATSAPP_TOKEN','FIREBASE_KEY','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','FARAIOS_ACCOUNTING_SERVICE_KEY','FARAIOS_ZOHO_CREDENTIALS_FILE']){
    assert.throws(()=>assertHostedEnvironment({[name]:'sentinel-do-not-print'}),e=>!e.message.includes('sentinel')&&/refuses/.test(e.message));
  }
});

test('outbound SDK boundary denies live providers, other projects, messaging Auth and redirects',async()=>{
  const calls=[];const restricted=createStagingFetch(async request=>{calls.push(request);return new Response('{}');});
  const allowed=[['/auth/v1/token?grant_type=password','POST'],['/auth/v1/user','GET'],['/auth/v1/logout?scope=local','POST'],['/rest/v1/businesses?select=id','GET'],['/rest/v1/business_catalogue?id=eq.test','PATCH'],['/rest/v1/rpc/booking_context','POST']];
  for(const [path,method] of allowed)await restricted(stagingDatabase+path,{method,redirect:'follow'});
  assert.equal(calls.length,allowed.length);assert.ok(calls.every(r=>r.redirect==='error'));
  const forbidden=[
    ['https://api.paystack.co/transaction/initialize','POST'],['https://api.resend.com/emails','POST'],['https://graph.facebook.com/messages','POST'],['https://zrlojsvkqipuwkkyfrkn.supabase.co/rest/v1/businesses','GET'],
    ...['/auth/v1/signup','/auth/v1/recover','/auth/v1/otp','/auth/v1/invite','/auth/v1/admin/users','/auth/v1/token?grant_type=refresh_token','/auth/v1/logout?scope=global','/functions/v1/send-email','/storage/v1/object/test','/rest/v1/rpc/send_notification','/rest/v1/rpc/configure_accounting','/rest/v1/rpc/claim_invoice_sync','/rest/v1/business_accounting_connections','/rest/v1/businesses'].map(p=>[stagingDatabase+p,'POST']),
    [stagingDatabase+'/auth/v1/user?redirect_to=https://example.invalid','GET'],[stagingDatabase+'/auth/v1/user#fragment','GET'],[stagingDatabase+'/rest/v1/rpc/booking_context?extra=1','POST'],
  ];
  for(const [url,method] of forbidden)await assert.rejects(restricted(url,{method}),/blocked/);
  const credentialUrl=new URL(stagingDatabase+'/auth/v1/user');credentialUrl.username='synthetic';credentialUrl.password=randomUUID();
  await assert.rejects(restricted(credentialUrl),e=>e.message==='Hosted staging outbound request blocked');
  await assert.rejects(restricted(stagingDatabase+'/rest/v1/businesses',{headers:{'Accept-Profile':'auth'}}),/blocked/);
  assert.equal(calls.length,allowed.length);
  // A dispatcher obeying fetch semantics must refuse a redirect rather than follow it.
  let redirectPolicy;await createStagingFetch(async r=>{redirectPolicy=r.redirect;throw new TypeError('redirect refused');})(stagingDatabase+'/auth/v1/user').catch(()=>{});assert.equal(redirectPolicy,'error');
});

test('hosted HTTP uses Passenger HTTPS metadata, canonical origin and secure cookies with real SDK',async()=>{
  const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001',calls=[];
  const token=[Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'synthetic'].join('.');
  const restricted=createStagingFetch(async r=>{
    calls.push({path:new URL(r.url).pathname,method:r.method});const path=new URL(r.url).pathname;
    const body=path==='/auth/v1/token'?{access_token:token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user:{id:uid,email:'qa@example.invalid'}}:path==='/auth/v1/user'?{id:uid}:path==='/rest/v1/business_memberships'?[{business_id:bid,user_id:uid,role:'manager',status:'active'}]:path==='/rest/v1/businesses'?[{id:bid,name:'Synthetic staging'}]:{};
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  });
  const factory=()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:restricted}});
  const server=createStagingServer({createClient:factory,hostedStaging:true,hostedFingerprint:'a'.repeat(64)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const secureHeaders={Host:'staging.faraios.com','!~Passenger-Proto':'https'};
  const request=(path,init={})=>new Promise((resolve,reject)=>{
    const req=httpRequest(base+path,{method:init.method??'GET',headers:{...secureHeaders,...init.headers}},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
    });req.on('error',reject);req.end(init.body);
  });
  try{
    assert.equal((await fetch(base+'/login',{headers:{Host:'staging.faraios.com','X-Forwarded-Proto':'https'}})).status,403);
    for(const headers of [{Host:'faraios.com'},{Host:'staging.faraios.com:443'},{'!~Passenger-Proto':'http'}])assert.equal((await request('/login',{headers})).status,403);
    const health=await request('/environment-health');assert.equal(health.status,200);assert.equal((await health.json()).projectRef,config.projectRef);assert.equal(health.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
    const post={method:'POST',headers:{Origin:stagingOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.invalid&password=synthetic'};
    assert.equal((await request('/login',{...post,headers:{...post.headers,Origin:'https://faraios.com'}})).status,403);assert.equal(calls.length,0);
    const login=await request('/login',post);assert.equal(login.status,303);const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/^__Host-faraios_staging=/);assert.match(setCookie,/HttpOnly; SameSite=Strict; Path=\/; Max-Age=1800; Secure$/);assert.doesNotMatch(setCookie,/Domain=/i);
    const Cookie=setCookie.split(';')[0];assert.equal((await request('/dashboard',{headers:{Cookie}})).status,200);
    const logout=await request('/logout',{method:'POST',headers:{Cookie,Origin:stagingOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:''});assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0; Secure$/);
    assert.equal((await request('/dashboard',{headers:{Cookie}})).status,303);
    assert.ok(calls.some(c=>c.path==='/auth/v1/token'));assert.ok(calls.some(c=>c.path==='/auth/v1/logout'));
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('local and restore retain production refusal, hosted rejects integration workers and non-Passenger boot',()=>{
  const env=process.env.NODE_ENV;process.env.NODE_ENV='production';
  try{assert.throws(()=>createStagingServer({}),/cannot run in production/);assert.throws(()=>createStagingServer({restoreTest:true}),/cannot run in production/);}finally{if(env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env;}
  for(const extra of [{restoreTest:true},{accountingWorker:{}},{accountingAdapter:{}}])assert.throws(()=>createStagingServer({hostedStaging:true,hostedFingerprint:'a'.repeat(64),...extra}),/Invalid hosted/);
  const result=spawnSync(process.execPath,['_passenger.cjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/requires Passenger/);
});
