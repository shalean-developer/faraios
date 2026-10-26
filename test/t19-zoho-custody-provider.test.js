import test from 'node:test';
import assert from 'node:assert/strict';
import {createZohoCustodyProvider} from '../src/t19-zoho-custody-provider.js';
const b={business_id:'11111111-1111-4111-8111-111111111111',environment:'staging',provider:'zoho',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'123',credential_version:1};
const material=()=>({binding:{...b},api_domain:'https://www.zohoapis.com',client_id:'fake-client',client_secret:'fake-secret',refresh_token:'fake-refresh'});
const good={access_token:'fake-access',api_domain:'https://www.zohoapis.com',token_type:'Bearer',expires_in:3600};
const response=(v=good,status=200)=>new Response(JSON.stringify(v),{status});
function setup(value=()=>response(),now=()=>1000){const calls=[];return {calls,provider:createZohoCustodyProvider({now,fetchImpl:async(url,options)=>{calls.push({url,options});return value();}})};}
const denied=p=>assert.rejects(p,e=>e.code==='provider_unavailable'&&e.message===e.code&&e.cause===undefined&&!e.stack.includes('fake-private'));
test('one pinned refresh POST, secrets only in body, no implicit rotation',async()=>{
 const x=setup();assert.deepEqual(await x.provider.refresh(b,material()),{kind:'success',access_token:'fake-access',expires_at:3601000});
 assert.equal(x.calls.length,1);const {url,options}=x.calls[0];assert.equal(url,'https://accounts.zoho.com/oauth/v2/token');
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(options.signal instanceof AbortSignal);
 assert.equal(options.body.get('refresh_token'),'fake-refresh');assert.equal(options.body.get('grant_type'),'refresh_token');assert.equal(url.includes('fake-'),false);
});
test('rotated successor is internal result only',async()=>{assert.equal((await setup(()=>response({...good,refresh_token:'fake-next'})).provider.refresh(b,material())).refresh_token,'fake-next');});
for(const [field,value] of Object.entries({business_id:'99999999-9999-4999-8999-999999999999',environment:'production',provider:'synthetic',connection_id:'99999999-9999-4999-8999-999999999999',generation:2,organization_id:'456',credential_version:2}))test('rejects protected material '+field+' substitution before egress',async()=>{
 const x=setup(),m=material();m.binding[field]=value;await denied(x.provider.refresh(b,m));assert.equal(x.calls.length,0);
});
test('rejects unapproved domain or malformed credentials before egress',async()=>{
 for(const change of [{api_domain:'https://evil.test'},{client_id:''},{client_secret:'bad\nsecret'},{refresh_token:null}]){
  const x=setup();await denied(x.provider.refresh(b,{...material(),...change}));assert.equal(x.calls.length,0);
 }
});
test('independent business material selects independent credentials',async()=>{
 const x=setup(),foreign={...b,business_id:'99999999-9999-4999-8999-999999999999',connection_id:'88888888-8888-4888-8888-888888888888',organization_id:'456'};
 await x.provider.refresh(b,material());await x.provider.refresh(foreign,{...material(),binding:foreign,client_id:'fake-b-client',refresh_token:'fake-b-refresh'});
 assert.deepEqual(x.calls.map(c=>c.options.body.get('refresh_token')),['fake-refresh','fake-b-refresh']);
});
test('only explicit token-endpoint rejection can classify invalid grant',async()=>{
 for(const error of ['invalid_grant','invalid_code'])for(const status of [200,400])assert.deepEqual(await setup(()=>response({error},status)).provider.refresh(b,material()),{kind:'invalid_grant'});
 for(const status of [401,403,429,500]){const x=setup(()=>response({error:'invalid_grant'},status));await denied(x.provider.refresh(b,material()));assert.equal(x.calls.length,1);}
});
test('malformed, contradictory, wrong-region and expired responses fail closed',async()=>{
 for(const change of [{api_domain:'https://www.zohoapis.eu'},{access_token:''},{token_type:'MAC'},{expires_in:0},{expires_in:3601},{expires_in:1.1},{refresh_token:null},{error:'invalid_grant'}]){
  const x=setup(()=>response({...good,...change}));await denied(x.provider.refresh(b,material()));assert.equal(x.calls.length,1);
 }
 let n=0;await denied(setup(()=>response({...good,expires_in:1}),()=>n++?2000:1000).provider.refresh(b,material()));
});
test('oversized stream, malformed JSON, redirect and transport errors are bounded and redacted',async()=>{
 for(const value of [()=>new Response('fake-private'),()=>({redirected:true}),()=>{throw Error('fake-private');},()=>new Response('x'.repeat(32769))]){
  const x=setup(value);await denied(x.provider.refresh(b,material()));assert.equal(x.calls.length,1);
 }
});
test('deadline completes even when transport ignores abort',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const x=setup(()=>new Promise(()=>{}));
 const result=denied(x.provider.refresh(b,material()));t.mock.timers.tick(12000);await result;assert.equal(x.calls.length,1);
});
