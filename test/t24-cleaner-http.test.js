import test from 'node:test';import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const uid='24000000-0000-4000-8000-000000000001',biz='24000000-0000-4000-8000-000000000002';
test('T24 HTTP uses current staff identity, rejects injected business and writes, and renders four portal views',async t=>{
 let role='staff',active=true,calls=0;
 const client=()=>({auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),getUser:async()=>({data:{user:{id:uid}}})},from(table){const q={select(){return q},eq(){return q},then(resolve){resolve({data:table==='business_memberships'?(active?[{business_id:biz,user_id:uid,role,status:'active'}]:[]):[{id:biz,name:'SYNTHETIC business'}]})}};return q;},rpc:async(name,input)=>{calls++;assert.equal(name,'t24_cleaner_portal');assert.equal(input.business,biz);return {data:{userId:uid,section:input.section,page:input.page,data:input.section==='profile'?{userId:uid,displayName:'SYNTHETIC cleaner'}:[]}};}});
 const server=createStagingServer({createClient:client});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/cleaner',{redirect:'manual'})).status,303);
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=synthetic%40example.invalid&password=synthetic',redirect:'manual'});assert.equal(login.status,303);const Cookie=login.headers.get('set-cookie').split(';')[0];
 for(const view of ['jobs','schedule','earnings','profile']){const r=await fetch(base+'/cleaner?business='+biz+'&view='+view,{headers:{Cookie}});assert.equal(r.status,200);assert.match(await r.text(),/Cleaner portal|My Jobs/);}
 assert.equal(calls,4);
 for(const suffix of ['&page=-1','&view=other','&page=1000001'])assert.equal((await fetch(base+'/cleaner?business='+biz+suffix,{headers:{Cookie}})).status,400);
 assert.equal((await fetch(base+'/cleaner?business='+uid,{headers:{Cookie}})).status,403);
 assert.equal((await fetch(base+'/cleaner?business='+biz,{method:'POST',headers:{Cookie,Origin:base}})).status,405);
 role='manager';assert.equal((await fetch(base+'/cleaner?business='+biz,{headers:{Cookie}})).status,403);
 role='staff';active=false;assert.equal((await fetch(base+'/cleaner?business='+biz,{headers:{Cookie}})).status,403);assert.equal(calls,4);
});
test('T24 hosted dispatch permits only the named public RPC and retains HTTPS/schema restrictions',async()=>{
 const {createStagingFetch,stagingDatabase}=await import('../src/hosted-staging.js');let calls=0;
 const dispatch=createStagingFetch(async request=>{calls++;assert.equal(request.url,stagingDatabase+'/rest/v1/rpc/t24_cleaner_portal');return new Response('{}');});
 await dispatch(stagingDatabase+'/rest/v1/rpc/t24_cleaner_portal',{method:'POST',body:'{}'});assert.equal(calls,1);
 for(const [url,init]of [[stagingDatabase+'/rest/v1/rpc/t24_cleaner_portal',{method:'GET'}],[stagingDatabase+'/rest/v1/rpc/t24_cleaner_portal',{method:'POST',headers:{'Content-Profile':'private_t24'}}],['http://xdmfyrsauvqznkloroxg.supabase.co/rest/v1/rpc/t24_cleaner_portal',{method:'POST'}]])await assert.rejects(dispatch(url,init),/blocked/);
 assert.equal(calls,1);
});
