import assert from 'node:assert/strict';
import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {hostedSourceFingerprint} from './hosted-source-fingerprint.mjs';
import {assertStagingConfig,stagingOrigin,stagingDatabase} from '../src/hosted-staging.js';

// Fixed targets, no production request, login credential or real recipient.
const config=JSON.parse(await readFile(new URL('../config/staging.json',import.meta.url),'utf8'));
assertStagingConfig(config);
const request=(url,init={})=>fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});
// Managed TLS is enforced by Plesk before the private backend. Prove that
// boundary on the actual host, rather than trusting any forwarding header.
async function verifyManagedHttpBoundary(fingerprint){
  const anchor=async()=>{
    const r=await request(stagingOrigin+'/environment-health');assert.equal(r.status,200);
    const j=await r.json();assert.equal(j.sourceFingerprint,fingerprint);assert.equal(j.transportSecurity,'managed-tls-edge');
  };
  await anchor();
  const on={'X-FaraiOS-Staging-HTTPS':'on'},xf={...on,'X-Forwarded-Proto':'https'},both={...xf,Forwarded:'proto=https;host=staging.faraios.com'};
  const cases=[
    ['GET','/environment-health',{},true],['GET','/environment-health',on,true],
    ['GET','/environment-health',xf,false],['GET','/environment-health',{...on,Forwarded:'proto=https'},false],
    ['GET','/environment-health',{...both,Host:'staging.faraios.com:443'},false],
    ['GET','http://staging.faraios.com/environment-health',both,false],
    ['POST','/login',{...both,Origin:'https://example.invalid'},false],
    ['POST','/login',{...both,Host:'staging.faraios.com:443',Origin:'https://example.invalid'},false],
  ];
  for(const [method,path,headers,mustRedirect] of cases){
    const result=await new Promise((resolve,reject)=>{
      const q=httpRequest({hostname:'staging.faraios.com',port:80,path,method,headers:{Host:'staging.faraios.com',...headers},timeout:15000},r=>{
        let body='';r.on('data',c=>{body+=c.toString();if(body.length>65536)q.destroy(new Error('HTTP probe response too large'));});
        r.on('error',reject);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body}));
      });q.on('error',reject);q.on('timeout',()=>q.destroy(new Error('HTTP probe timeout')));q.end();
    });
    assert.equal(result.headers['set-cookie'],undefined);
    assert.ok(!result.body.includes(fingerprint));
    assert.doesNotMatch(result.body,/HTTPS staging access required|Origin rejected|FaraiOS STAGING/);
    if([301,302,307,308].includes(result.status)){
      assert.equal(new URL(result.headers.location,'http://staging.faraios.com').origin,stagingOrigin);
    }else{
      assert.equal(mustRedirect,false);assert.ok([403,404].includes(result.status));
      assert.match(result.headers['content-type']??'',/text\/html/i);
      assert.match(result.body,/<(?:!doctype|html)/i);assert.match(result.body,/403 Forbidden|404 Not Found/);
    }
  }
  await anchor();
  console.log('T07_HOSTED_MANAGED_EDGE_HTTP_ISOLATION_PASS');
}
try{
  const health=await request(stagingOrigin+'/environment-health');assert.equal(health.status,200);
  const state=await health.json();assert.equal(state.environment,'staging');assert.ok(['passenger','litespeed'].includes(state.transport));assert.equal(state.projectRef,config.projectRef);assert.equal(state.sourceFingerprint,await hostedSourceFingerprint());assert.equal(state.transportSecurity,state.transport==='litespeed'?'managed-tls-edge':'passenger-protected-https');
  assert.equal(state.appPaymentDispatch,'disabled');assert.equal(state.appNotificationDispatch,'disabled');assert.equal(state.accountingWorker,'disabled');
  console.log('T07_HOSTED_SOURCE_AND_ENVIRONMENT_PASS');
  const login=await request(stagingOrigin+'/login');assert.equal(login.status,200);assert.equal(login.headers.get('strict-transport-security'),'max-age=31536000');assert.equal(login.headers.get('cache-control'),'no-store');assert.match(login.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(login.headers.get('x-robots-tag'),/noindex/);
  const csrf=await request(stagingOrigin+'/login',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/x-www-form-urlencoded'},body:'email=t07%40example.invalid&password=synthetic'});assert.equal(csrf.status,403);
  const forwarded=await request(stagingOrigin+'/login',{headers:{'X-Forwarded-Proto':'http'}});assert.equal(forwarded.status,200);
  if(state.transport==='passenger'){
    const spoof=await request(stagingOrigin+'/login',{headers:{'!~Passenger-Proto':'https'}});assert.ok([400,403].includes(spoof.status));
  }else{
    for(const headers of [
      {'X-FaraiOS-Staging-HTTPS':'off'},
      [['X-FaraiOS-Staging-HTTPS','off'],['x-faraios-staging-https','wrong']],
      {'X-FaraiOS-Staging-HTTPS':'off','X-Forwarded-Proto':'http','!~Passenger-Proto':'http'},
    ])assert.equal((await request(stagingOrigin+'/login',{headers})).status,200);
    await verifyManagedHttpBoundary(state.sourceFingerprint);
    const aliasStatus=await new Promise((resolve,reject)=>{const req=httpsRequest(stagingOrigin+'/login',{headers:{Host:'staging.faraios.com:443'},timeout:15000},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('timeout')));req.end();});
    assert.equal(aliasStatus,403);
  }
  console.log('T07_HOSTED_HTTPS_ORIGIN_PASS');
  for(const path of ['/config/staging.json','/config/hosting-staging.json','/package.json','/.git/config'])assert.ok([403,404].includes((await request(stagingOrigin+path)).status));
  const redirect=await request('http://staging.faraios.com/login');assert.ok([301,302,307,308].includes(redirect.status));assert.equal(new URL(redirect.headers.get('location'),'http://staging.faraios.com').origin,stagingOrigin);
  console.log('T07_HOSTED_DOCUMENT_ROOT_AND_REDIRECT_PASS');
  const settings=await request(stagingDatabase+'/auth/v1/settings',{headers:{apikey:config.publishableKey}});assert.equal(settings.status,200);const auth=await settings.json();assert.equal(auth.disable_signup,true);assert.equal(auth.external?.phone,false);
  const signup=await request(stagingDatabase+'/auth/v1/signup',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:'t07-denied@example.invalid',password:randomUUID()})});assert.ok([400,403,422].includes(signup.status));const denied=await signup.json();assert.match(denied.error_code??denied.code??'',/signup_disabled/);
  const hook=await request(stagingDatabase+'/functions/v1/t07-deny-auth-email',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(hook.status,401);
  console.log('T07_HOSTED_AUTH_SIGNUP_AND_DENY_ENDPOINT_PASS');
  console.log('T07_HOSTED_NONLOGIN_PROBES_PASS');
}catch{
  // Do not print request/response bodies, tokens or potentially sensitive errors.
  console.error('T07_HOSTED_VERIFICATION_FAILED');process.exitCode=1;
}
