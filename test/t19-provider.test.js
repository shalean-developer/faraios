import test from 'node:test';
import assert from 'node:assert/strict';
import {T19Error,verifyInvoice,exchangeCode} from '../src/t19-provider.js';
const binding={organizationId:'111',currency:'ZAR',apiDomain:'https://www.zohoapis.com'};
const fixture={invoiceId:'9001',number:'TEST-1',reference:'SYNTHETIC-1',customerId:'222',status:'draft',totalCents:100};
const profile={code:0,organization:{organization_id:'111',currency_code:'ZAR',is_org_active:true}};
const invoice={code:0,invoice:{invoice_id:'9001',invoice_number:'TEST-1',reference_number:'SYNTHETIC-1',customer_id:'222',currency_code:'ZAR',status:'draft',total:'1.00'}};
const response=value=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
function mock({values=[profile,invoice],guard=async()=>{}}={}){
 const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});return typeof values[calls.length-1]==='function'?values[calls.length-1]():response(values[calls.length-1]);};
 return {calls,run:overrides=>verifyInvoice({binding,fixture,accessToken:'dummy-access',guard,fetchImpl,...overrides})};
}
const rejects=(promise,code)=>assert.rejects(promise,e=>e instanceof T19Error&&e.code===code&&e.message===code);
test('only pinned profile then known invoice GET, four generation checks and minimal evidence',async()=>{
 let guards=0;const m=mock({guard:async()=>{guards++;}});const result=await m.run();
 assert.equal(guards,4);assert.equal(result.requestCount,2);assert.equal(result.invoice.totalCents,100);
 assert.deepEqual(m.calls.map(c=>new URL(c.url).pathname),['/books/v3/organizations/111','/books/v3/invoices/9001']);
 for(const {url,options} of m.calls){assert.equal(new URL(url).search,'?organization_id=111');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);assert.equal(options.body,undefined);}
 assert.doesNotMatch(JSON.stringify(result),/dummy-access/);
});
test('invalid binding, fixture and missing guard fail before fetch',async()=>{
 for(const bad of [{apiDomain:'https://evil.test'},{organizationId:'111&organization_id=222'},{currency:'zar'}]){const m=mock();await rejects(m.run({binding:{...binding,...bad}}),'organization');assert.equal(m.calls.length,0);}
 const m=mock();await rejects(m.run({fixture:{...fixture,invoiceId:'../9001'}}),'mismatch');await rejects(m.run({guard:undefined}),'credentials');await rejects(m.run({accessToken:'bad\r\nHeader'}),'credentials');assert.equal(m.calls.length,0);
});
test('fixture cannot override binding or mutate later request expectations',async()=>{
 const mutable={...fixture,organizationId:'999',currency:'USD'};const m=mock({guard:async()=>{mutable.invoiceId='999';binding.organizationId='111';}});
 await m.run({fixture:mutable});assert.match(m.calls[1].url,/invoices\/9001\?organization_id=111$/);
});
for(const change of [{organization_id:'222'},{is_org_active:false},{is_org_active:undefined},{currency_code:'USD'}])test('profile mismatch stops before invoice '+JSON.stringify(change),async()=>{const p=structuredClone(profile);Object.assign(p.organization,change);const m=mock({values:[p]});await rejects(m.run(),'organization');assert.equal(m.calls.length,1);});
for(const change of [{invoice_id:'9002'},{invoice_number:'wrong'},{reference_number:'wrong'},{customer_id:'333'},{currency_code:'USD'},{status:'sent'},{total:'1.001'},{organization_id:'222'}])test('invoice tuple mismatch '+JSON.stringify(change),async()=>{const i=structuredClone(invoice);Object.assign(i.invoice,change);await rejects(mock({values:[profile,i]}).run(),'mismatch');});
test('missing or nonnumeric Books success code rejected',async()=>{for(const code of [undefined,'0',1]){const p={...profile,code};const m=mock({values:[p]});await rejects(m.run(),'provider_unavailable');assert.equal(m.calls.length,1);}});
for(const [status,code] of [[401,'credentials'],[403,'permissions'],[429,'rate_limited'],[500,'provider_unavailable']])test('HTTP '+status+' has no retry or refresh',async()=>{const m=mock({values:[()=>new Response('sensitive-provider-message',{status})]});await rejects(m.run(),code);assert.equal(m.calls.length,1);});
test('streaming cap cancels oversized body without accumulating all data',async()=>{
 let cancelled=false;const m=mock({values:[()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(1_000_001));},cancel(){cancelled=true;}}))]});
 await rejects(m.run(),'provider_unavailable');assert.equal(cancelled,true);assert.equal(m.calls.length,1);
});
test('malformed content, redirects and transport details remain sanitised',async()=>{
 for(const value of [()=>new Response('{sensitive'),()=>({ok:true,redirected:true}),()=>{throw new Error('SECRET transport');}])await rejects(mock({values:[value]}).run(),'provider_unavailable');
});
test('guard denies before dispatch, between reads and during in-flight results',async()=>{
 for(const failAt of [1,2,3,4]){let n=0;const m=mock({guard:async()=>{if(++n===failAt)throw new T19Error('stale_generation');}});await rejects(m.run(),'stale_generation');assert.equal(m.calls.length,failAt===1?0:failAt===4?2:1);}
});
test('one code exchange, fixed endpoint, private body and bounded expiry',async()=>{
 const calls=[];const result=await exchangeCode({clientId:'dummy-client',clientSecret:'dummy-secret',code:'dummy-code',redirectUri:'http://127.0.0.1:3102/zoho/callback',now:()=>1000,fetchImpl:async(url,options)=>{calls.push({url,options});return response({access_token:'dummy-access',refresh_token:'dummy-refresh',api_domain:binding.apiDomain,expires_in:3600,token_type:'Bearer'});}});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://accounts.zoho.com/oauth/v2/token');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.body.get('grant_type'),'authorization_code');assert.doesNotMatch(calls[0].url,/dummy/);assert.deepEqual(result,{accessToken:'dummy-access',refreshToken:'dummy-refresh',expiresAt:3601000});
});
test('token exchange rejects wrong host, missing tokens or invalid expiration',async()=>{
 const args={clientId:'dummy-client',clientSecret:'dummy-secret',code:'dummy-code',redirectUri:'http://127.0.0.1:3102/zoho/callback'};
 for(const change of [{api_domain:'https://evil.test'},{expires_in:0},{expires_in:3601},{refresh_token:undefined},{access_token:undefined},{token_type:'MAC'}])await rejects(exchangeCode({...args,fetchImpl:async()=>response({access_token:'dummy',refresh_token:'dummy',api_domain:binding.apiDomain,expires_in:3600,token_type:'Bearer',...change})}),'credentials');
 let calls=0;await rejects(exchangeCode({...args,redirectUri:'https://evil.test/callback',fetchImpl:async()=>{calls++;}}),'credentials');assert.equal(calls,0);
});

test('12-second deadline fails closed even when injected transport ignores abort',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;
 const pending=verifyInvoice({binding,fixture,accessToken:'dummy-access',guard:async()=>{},fetchImpl:async()=>{calls++;return new Promise(()=>{});}});
 const assertion=rejects(pending,'provider_unavailable');
 await Promise.resolve();await Promise.resolve();t.mock.timers.tick(12000);
 await assertion;assert.equal(calls,1);
});
