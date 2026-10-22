import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const owner='00000000-0000-4000-8000-000000000001',staff='00000000-0000-4000-8000-000000000003',business='10000000-0000-4000-8000-000000000001',foreign='20000000-0000-4000-8000-000000000001';
const savedForm=new URLSearchParams({action:'save',allowance_enabled:'yes',allowance_amount:'500',allowance_version:'0',effective_month:'2026-11',allowance_reason:'Agreed supervisor allowance'}).toString();
async function run(fn,{role='owner',restoreTest=false}={}){
 const state={role,active:true,changes:[],calls:[]};
 const client=()=>({
  auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),getUser:async()=>({data:{user:{id:owner}}}),signOut:async()=>({})},
  from(table){let filters=[];return {select(){return this;},eq(k,v){filters.push([k,v]);if(table==='businesses')return Promise.resolve({data:[{id:business,name:'Synthetic business'}]});if(table==='business_memberships'&&k==='status')return Promise.resolve({data:state.active?[{user_id:owner,business_id:business,role:state.role,status:'active'}]:[]});return this;},order(){return this;},range:async(start,end)=>({data:(table==='supervisor_allowance_changes'?state.changes:[]).filter(row=>filters.every(([k,v])=>row[k]===v)).slice(start,end+1)})};},
  async rpc(name,p){
   state.calls.push({name,p});
   if(name==='supervisor_allowance_context')return {data:{business_id:p.p_business_id,time_zone:'Africa/Johannesburg',current_month:'2026-10-01',next_month:'2026-11-01'}};
   if(name==='staff_context')return {data:[{user_id:staff,label:'Synthetic supervisor'}]};
   if(name==='configure_supervisor_allowance'){
    if(p.p_version!==state.changes.length)return {error:{code:'40001'}};
    state.changes.push({business_id:p.p_business_id,user_id:p.p_user_id,version:p.p_version+1,effective_month:p.p_effective_month,enabled:p.p_enabled,amount_cents:p.p_amount_cents,change_reason:p.p_reason,actor_user_id:owner,created_at:'2026-10-22T07:00:00Z'});return {data:state.changes.length};
   }
   throw new Error('Unexpected RPC '+name);
  }
 });
 const server=createStagingServer({createClient:client,restoreTest});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.test&password=synthetic',redirect:'manual'});
 assert.equal(login.status,303);const Cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(path,{method='GET',body='',origin=base,type='application/x-www-form-urlencoded',cookie=Cookie}={})=>fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin,'Content-Type':type}:{})},...(method==='POST'?{body}:{}),redirect:'manual'});
 try{await fn({state,request,base});}finally{await new Promise(r=>server.close(r));}
}
const path='/supervisor-allowances?business='+business+'&staff='+staff;

test('allowance HTTP owner saves, previews separate totals and rejects stale, cross-origin and foreign-scope writes',async()=>run(async({state,request})=>{
 assert.equal((await request(path,{cookie:null})).status,303);
 const first=await request(path);assert.equal(first.status,200);assert.match(await first.text(),/Off — booking earnings only/);assert.equal(state.changes.length,0);
 const post=body=>request(path,{method:'POST',body});
 assert.equal((await post(savedForm+'&business_id='+foreign+'&actor_user_id='+staff)).status,303);
 assert.equal(state.changes[0].business_id,business);assert.equal(state.changes[0].actor_user_id,owner);assert.equal(state.changes[0].amount_cents,50000);
 const preview=await post('action=preview&preview_month=2026-11&booking_earnings=300');assert.equal(preview.status,200);const html=await preview.text();assert.match(html,/Booking earnings/);assert.match(html,/500[.,]00/);assert.match(html,/800[.,]00/);assert.equal(state.changes.length,1);
 assert.equal((await post(savedForm)).status,409);assert.equal(state.changes.length,1);
 assert.equal((await post(savedForm.replace('500','0'))).status,422);
 assert.equal((await request(path,{method:'POST',body:savedForm,origin:'https://foreign.invalid'})).status,403);
 assert.equal((await request(path,{method:'POST',body:savedForm,type:'application/json'})).status,415);
 assert.equal((await request(path,{method:'POST',body:'x'.repeat(8193)})).status,413);
 assert.equal((await request(path.replace(business,foreign),{method:'POST',body:savedForm})).status,403);
 assert.equal((await request(path.replace(staff,owner),{method:'POST',body:savedForm})).status,404);
 // A form opened by an owner cannot be submitted after demotion or suspension.
 state.role='manager';assert.equal((await post(savedForm)).status,403);state.active=false;assert.equal((await request(path)).status,403);assert.equal(state.changes.length,1);
}));

for(const role of ['manager','staff'])test(`allowance HTTP ${role} follows read/preview/write restrictions`,async()=>run(async({state,request})=>{
 const read=await request(path);assert.equal(read.status,role==='manager'?200:403);
 if(role==='manager')assert.doesNotMatch(await read.text(),/Save allowance change/);
 assert.equal((await request(path,{method:'POST',body:'action=preview&preview_month=2026-11&booking_earnings=300'})).status,role==='manager'?200:403);
 assert.equal((await request(path,{method:'POST',body:savedForm})).status,403);assert.equal(state.changes.length,0);
},{role}));

test('restore workspace blocks allowance changes and monthly preview POSTs',async()=>run(async({state,request})=>{
 assert.equal((await request(path,{method:'POST',body:savedForm})).status,405);assert.equal(state.changes.length,0);
},{restoreTest:true}));
