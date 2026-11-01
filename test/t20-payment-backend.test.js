import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentBackendFetch,createPaymentBackend} from '../src/t20-payment-backend.js';
const base='https://xdmfyrsauvqznkloroxg.supabase.co',principalId='00000000-0000-4000-8000-000000000005';
const json=v=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
test('T20 backend transport allows only pinned Auth and payment RPC; rejects other origins/profiles/routes',async()=>{
 let calls=0;const f=paymentBackendFetch(async()=>{calls++;return json({ok:true});});
 await f(base+'/rest/v1/rpc/t20_payment_backend',{method:'POST'});assert.equal(calls,1);
 for(const [url,init]of [[base+'/rest/v1/rpc/t19_standard_store',{method:'POST'}],[base+'/rest/v1/rpc/t20_payment_owner',{method:'POST'}],[base+'/rest/v1/business_invoices',{}],['https://api.paystack.co/transaction/initialize',{method:'POST'}],[base+'/rest/v1/rpc/t20_payment_backend?x=y',{method:'POST'}],[base+'/rest/v1/rpc/t20_payment_backend',{method:'POST',headers:{'content-profile':'private_t20'}}]])await assert.rejects(f(url,init),/payment_backend_denied/);
 assert.equal(calls,1);
});
test('T20 transport bounds responses and rejects redirected/error details without leaking them',async()=>{
 await assert.rejects(paymentBackendFetch(async()=>new Response('x'.repeat(262145)))(base+'/auth/v1/user'),/payment_backend_denied/);
 await assert.rejects(paymentBackendFetch(async()=>{throw Error('SYNTHETIC_SECRET');})(base+'/auth/v1/user'),e=>e.message==='payment_backend_denied');
 const r=json({});Object.defineProperty(r,'redirected',{value:true});await assert.rejects(paymentBackendFetch(async()=>r)(base+'/auth/v1/user'));
});
function mock({wrongIdentity=false,expired=false}={}){
 const observed=[];let refreshes=0;
 const user={id:wrongIdentity?'00000000-0000-4000-8000-000000000099':principalId};
 const jwtHeader=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const session=()=>({access_token:jwtHeader+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.SYNTHETIC',refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:expired&&refreshes===0?1:3600,user});
 const fetchImpl=async request=>{const u=new URL(request.url);observed.push(u.pathname+u.search);
  if(u.pathname==='/auth/v1/token'){if(u.search.includes('refresh_token'))refreshes++;return json(session());}
  if(u.pathname==='/auth/v1/user')return json(user);
  if(u.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  if(u.pathname==='/rest/v1/rpc/t20_payment_backend')return json({ready:true});
  throw Error('unexpected synthetic request');
 };
 return {fetchImpl,observed,refreshes:()=>refreshes};
}
test('T20 actual SDK composition verifies principal, scopes RPC and closes its own session',async()=>{
 const m=mock(),api=await createPaymentBackend({email:'backend@test.invalid',password:'SYNTHETIC_NOT_REAL',principalId,fetchImpl:m.fetchImpl});
 assert.equal((await api.rpc('health',{businessId:'synthetic',accountId:'123'})).ready,true);
 await assert.rejects(api.rpc('configure',{}),/payment_backend_denied/);await api.close();await api.close();await assert.rejects(api.rpc('health',{}));
 assert.ok(m.observed.includes('/auth/v1/user'));assert.ok(m.observed.includes('/auth/v1/logout?scope=local'));
});
test('T20 wrong authenticated identity fails before a payment RPC',async()=>{
 const m=mock({wrongIdentity:true});await assert.rejects(createPaymentBackend({email:'backend@test.invalid',password:'SYNTHETIC_NOT_REAL',principalId,fetchImpl:m.fetchImpl}),/payment_backend_denied/);
 assert.ok(!m.observed.some(x=>x.startsWith('/rest/')));
});
test('T20 concurrent expired-session requests refresh once using the pinned identity',async()=>{
 const m=mock({expired:true}),api=await createPaymentBackend({email:'backend@test.invalid',password:'SYNTHETIC_NOT_REAL',principalId,fetchImpl:m.fetchImpl});
 await Promise.all([api.rpc('health',{}),api.rpc('health',{}),api.rpc('health',{})]);assert.equal(m.refreshes(),1);await api.close();
});
