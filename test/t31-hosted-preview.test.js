import test from 'node:test';
import {request} from 'node:http';
const requestPreview=(url,options={})=>new Promise((resolve,reject)=>{const req=request(url,options,res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve(new Response(body,{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end();});
import assert from 'node:assert/strict';
import {createPreviewFetch,previewDatabase,previewProject} from '../src/t31-hosted-preview.js';
import {createStagingServer} from '../src/staging-server.js';
import {renderBusinessSettings} from '../src/business-settings.js';

test('T31 dedicated SDK transport permits onboarding and denies legacy/providers/privileged schemas',async()=>{
 const calls=[];const send=createPreviewFetch(async request=>{calls.push(request);return new Response('{}');});
 for(const [path,method] of [['/auth/v1/signup','POST'],['/auth/v1/token?grant_type=password','POST'],['/rest/v1/business_settings?select=display_name','GET'],['/rest/v1/t31_business_branding','POST'],['/rest/v1/rpc/t31_provision_business','POST']])await send(previewDatabase+path,{method});
 assert.ok(calls.every(r=>r.redirect==='error'));
 for(const [url,options] of [
 ['https://xdmfyrsauvqznkloroxg.supabase.co/auth/v1/signup',{method:'POST'}],
 ['https://api.paystack.co/transaction/initialize',{method:'POST'}],
 [previewDatabase+'/auth/v1/recover',{method:'POST'}],
 [previewDatabase+'/auth/v1/user',{method:'PUT'}],
 [previewDatabase+'/rest/v1/business_invoices',{method:'GET'}],
 [previewDatabase+'/rest/v1/rpc/t31_provision_business',{method:'GET'}],
 [previewDatabase+'/rest/v1/business_settings',{headers:{'accept-profile':'private_t31'}}]
 ])await assert.rejects(send(url,options),/blocked/);
 assert.equal(calls.length,5);
});
test('T31 dedicated hosted preview enforces HTTPS edge, noindex, origin and route boundary',async()=>{
 let touched=false;
 const server=createStagingServer({createClient:()=>{touched=true;throw Error('unexpected');},hostedStaging:true,hostedOnboardingPreview:true,ownerRegistrationEnabled:true,hostedFingerprint:'a'.repeat(64)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const headers={Host:'staging.faraios.com','!~passenger-proto':'https'};
 try{
  assert.equal((await requestPreview(url+'/register')).status,403);
  const health=await requestPreview(url+'/environment-health',{headers});assert.equal(health.status,200);
  assert.equal((await health.json()).projectRef,previewProject);assert.match(health.headers.get('x-robots-tag'),/noindex/);
  const signup=await requestPreview(url+'/register',{headers});assert.equal(signup.status,200);assert.match(await signup.text(),/Register account/);
  assert.equal((await requestPreview(url+'/register',{method:'POST',headers:{...headers,Origin:'https://foreign.invalid'}})).status,403);
  for(const path of ['/invoices','/reports','/payments/test','/notifications'])assert.equal((await requestPreview(url+path,{headers})).status,404);
  assert.equal(touched,false);
 }finally{await new Promise(r=>server.close(r));}
 assert.throws(()=>createStagingServer({createClient:()=>({}),hostedOnboardingPreview:true}),/Invalid isolated/);
 assert.throws(()=>createStagingServer({createClient:()=>({}),hostedStaging:true,hostedOnboardingPreview:true,hostedFingerprint:'a'.repeat(64),paymentProxy:()=>{}}),/Invalid isolated/);
});
test('T31 onboarding settings omit uninstalled VAT integration controls',()=>{
 assert.doesNotMatch(renderBusinessSettings({id:'test',name:'Independent'},null,'',false,false),/action="\/vat-settings/);
});
