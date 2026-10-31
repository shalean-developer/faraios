import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createStandardHttpsStore} from '../src/t19-standard-https-store.js';
import {createStandardBackendClient,standardBackendFetch} from '../src/t19-standard-backend-client.js';
import {createStandardConnection} from '../src/t19-standard-connection.js';
import {createTokenCipher,standardConfig} from '../src/t19-standard-secrets.js';
const biz='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',machine='33333333-3333-4333-8333-333333333333',owner='44444444-4444-4444-8444-444444444444',session='55555555-5555-4555-8555-555555555555';
async function setup(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql as $$select (auth.jwt()->>'sub')::uuid$$;
 create table public.businesses(id uuid primary key,status text);alter table public.businesses enable row level security;
 create table public.business_memberships(business_id uuid,user_id uuid,role text,status text);alter table public.business_memberships enable row level security;
 insert into public.businesses values('${biz}','active'),('${other}','active');insert into auth.users values('${machine}'),('${owner}');
 insert into public.business_memberships values('${biz}','${owner}','owner','active');insert into auth.sessions values('${session}','${machine}',null);`);
 for(const name of ['t19-standard-store.sql','t19-standard-backend-role.sql','t19-standard-https.sql','t19-standard-https-org-pins.sql','t19-standard-request-principal.sql','t19-standard-lease-recovery.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));
 await db.exec(`insert into private_t19_standard.backend_businesses values('${machine}','${biz}','staging',true,'123','https://www.zohoapis.com');`);
 const claims=async(sub=machine,sid=session)=>db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub,session_id:sid,role:'authenticated'})]);
 await claims();
 const rpc=async(_name,{action,input})=>{await db.exec('set role authenticated');try{const r=await db.query('select public.t19_standard_store($1,$2::jsonb) as value',[action,JSON.stringify(input)]);return {data:r.rows[0].value,error:null};}finally{await db.exec('reset role');}};
 return {db,rpc,claims,store:createStandardHttpsStore({rpc})};
}
test('HTTPS SQL permits allowlisted live backend only; denies human, revoked session and foreign business',async()=>{
 const f=await setup();try{
  assert.equal(await f.store.connection('staging',biz),null);
  await assert.rejects(()=>f.store.connection('staging',other));await assert.rejects(()=>f.store.connection('production',biz));
  await f.claims(owner);await assert.rejects(()=>f.store.connection('staging',biz));
  await f.claims();await f.db.exec(`insert into public.business_memberships values('${other}','${machine}','staff','active')`);await assert.rejects(()=>f.store.connection('staging',biz));await f.db.exec(`delete from public.business_memberships where user_id='${machine}'`);
  await f.db.exec(`delete from auth.sessions where id='${session}'`);await assert.rejects(()=>f.store.connection('staging',biz));
  await f.db.exec('set role anon');await assert.rejects(()=>f.db.query("select public.t19_standard_store('connection','{}')"),e=>e.code==='42501');await f.db.exec('reset role');
 }finally{await f.db.close();}
});
test('durable leases serialize clients, recover abandoned work after grace and fence old holders',async()=>{
 const f=await setup();try{
  const lease='66666666-6666-4666-8666-666666666666',scope={businessId:biz,environment:'staging',lease};
  await f.rpc('',{action:'acquire',input:scope});
  const independent=createStandardHttpsStore({rpc:f.rpc});await assert.rejects(()=>independent.lock('staging',biz,async()=>assert.fail()));
  await assert.rejects(()=>f.rpc('',{action:'guard',input:{...scope,lease:'77777777-7777-4777-8777-777777777777'}}));
  await f.db.exec(`update private_t19_standard.operation_leases set expires_at=clock_timestamp()-interval '1 second'`);
  await assert.rejects(()=>f.rpc('',{action:'guard',input:scope}));await assert.rejects(()=>f.rpc('',{action:'release',input:scope}));
  await assert.rejects(()=>independent.lock('staging',biz,async()=>assert.fail()));
  await f.db.exec(`update private_t19_standard.operation_leases set expires_at=clock_timestamp()-interval '31 seconds'`);
  await independent.lock('staging',biz,async guard=>{
   await guard();
   for(const action of ['guard','release','refresh','disable','revoked'])await assert.rejects(()=>f.rpc('',{action,input:scope}),e=>e.code==='42501');
  });
 }finally{await f.db.close();}
});
test('private provisioning uses real SQL owner and organisation pins before any provider request',async()=>{
 const f=await setup();let calls=0;
 const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.example.test',ZOHO_CLIENT_ID:'synthetic',ZOHO_CLIENT_SECRET:'synthetic',ZOHO_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),ZOHO_TOKEN_KEY_ID:'test',ZOHO_API_DOMAIN:'https://www.zohoapis.com'});
 const sessions={async read(){return {userId:owner,businessIds:[biz],memberships:[{businessId:biz,role:'owner'}]};}};
 const provider={async refresh(){calls++;return {access_token:'synthetic-access',expires_in:3600};},async organization(_a,id){return {id,name:'Synthetic TEST',currency:'ZAR'};}};
 const api=createStandardConnection({config,store:f.store,cipher:createTokenCipher(config),provider,sessions});
 try{
  await assert.rejects(()=>api.provision('private-session',{businessId:biz,organizationId:'999',refreshToken:'synthetic-private'}));assert.equal(calls,0);
  const result=await api.provision('private-session',{businessId:biz,organizationId:'123',refreshToken:'synthetic-private'});assert.equal(result.status,'connected');
  const c=await f.store.connection('staging',biz);assert.equal(c.status,'connected');assert.ok(!JSON.stringify(c).includes('synthetic-private'));
  await api.access(biz,()=>{});assert.equal(calls,2);
  await assert.rejects(()=>f.store.connection('staging',other));
 }finally{await f.db.close();}
});
test('HTTPS lifecycle commits single-use state, preserves encrypted binding and fences disconnect',async()=>{
 const f=await setup();try{
  const digest='a'.repeat(64),sid='b'.repeat(64);
  await assert.rejects(()=>f.store.begin({digest,sessionDigest:sid,actor:owner,businessId:biz,organizationId:'999',environment:'staging'}));
  await f.store.begin({digest,sessionDigest:sid,actor:owner,businessId:biz,organizationId:'123',environment:'staging'});
  assert.equal((await f.store.state(digest)).actor,owner);await f.store.consume(digest,owner,sid);await assert.rejects(()=>f.store.consume(digest,owner,sid));
  const c={environment:'staging',businessId:biz,connectionId:session,generation:1,organizationId:'123',apiDomain:'https://www.zohoapis.com',clientId:'synthetic',status:'revocation_pending',envelope:{body:'synthetic-ciphertext'}};
  await assert.rejects(()=>f.store.save(c,0));
  await f.store.lock('staging',biz,async guard=>{await guard();await assert.rejects(()=>f.store.save({...c,organizationId:'999'},0));await f.store.save(c,0);await f.store.publish(c,{id:'123',name:'Synthetic',currency:'ZAR'});await f.store.resolve(digest);});
  assert.equal((await f.store.connection('staging',biz)).status,'connected');
  await f.store.lock('staging',biz,async()=>{await f.store.disable(c);await assert.rejects(()=>f.store.refresh(c,{}));await f.store.revoked(c);});
  assert.equal((await f.store.connection('staging',biz)).envelope,null);
 }finally{await f.db.close();}
});
test('backend transport permits only pinned HTTPS Auth/RPC and refuses table/admin/foreign destinations',async()=>{
 let calls=0;const f=standardBackendFetch(async()=>{calls++;return Response.json({ok:true});});const root='https://xdmfyrsauvqznkloroxg.supabase.co';
 await f(root+'/rest/v1/rpc/t19_standard_store',{method:'POST',body:'{}'});assert.equal(calls,1);
 for(const url of [root+'/rest/v1/business_invoices','http://xdmfyrsauvqznkloroxg.supabase.co/rest/v1/rpc/t19_standard_store','https://evil.example/rest/v1/rpc/t19_standard_store',root+'/auth/v1/admin/users'])await assert.rejects(()=>f(url,{method:'POST',body:'{}'}));
 assert.equal(calls,1);
});
test('dedicated backend authenticates with publishable key and rejects wrong principal without service-role access',async()=>{
 const calls=[];const header=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({sub:machine,exp:Math.floor(Date.now()/1000)+3600,session_id:session})).toString('base64url');
 const fake=async request=>{const r=new Request(request),u=new URL(r.url);calls.push(u.pathname);
  if(u.pathname==='/auth/v1/token')return Response.json({access_token:header+'.'+payload+'.synthetic',refresh_token:'synthetic-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:machine}});
  if(u.pathname==='/auth/v1/user')return Response.json({id:machine});
  if(u.pathname==='/rest/v1/rpc/t19_standard_store')return Response.json({status:'synthetic'});
  assert.fail('unexpected destination');
 };
 const input={email:'backend@example.test',password:Buffer.from('test-only').toString('hex'),principalId:machine,fetchImpl:fake};
 const client=await createStandardBackendClient(input);const result=await client.rpc('t19_standard_store',{action:'connection',input:{}});assert.equal(result.error,null);assert.equal(result.status,200);assert.deepEqual(result.data,{status:'synthetic'});
 await assert.rejects(()=>client.rpc('other',{}));await assert.rejects(()=>createStandardBackendClient({...input,principalId:owner}));
 assert.ok(calls.every(p=>['/auth/v1/token','/auth/v1/user','/rest/v1/rpc/t19_standard_store'].includes(p)));
});
