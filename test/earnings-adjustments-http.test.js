import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
import {renderAdjustmentReviews,readAdjustmentSource} from '../src/adjustment-reviews.js';
const id=n=>'ef000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),worker=id(2),business=id(10),booking=id(20),sourceId=id(30);
const original={sourceId,bookingId:booking,workerId:worker,originalVersion:3,originalCents:250000,originalPeriod:'2026-10',agreementEvidence:'SYNTHETIC terms',originalRecordEvidence:'SYNTHETIC original earnings'};
async function run(fn,{role='owner',user=owner,restoreTest=false,saved=false,proposed=false}={}){
 const row={id:sourceId,business_id:business,worker_id:worker,booking_id:booking,original_payload:original,version:1,revision:0,synthetic_only:true};
 const state={role,user,active:true,calls:[],rows:saved?[row]:[],events:saved?[{source_id:sourceId,business_id:business,version:1,event_key:id(100),event_type:'register_source',payload:original,actor_id:owner,actor_role:'owner',created_at:'2026-10-22T10:00:00Z'}]:[]};
 if(proposed){row.version=2;state.events.push({source_id:sourceId,business_id:business,version:2,event_key:id(101),event_type:'propose',payload:{sourceId,kind:'reimbursement',deltaCents:5000,reason:'Missed R50',evidence:'TEST receipt',occurrenceReference:'missed1'},actor_id:owner,actor_role:'owner',created_at:'2026-10-22T10:01:00Z'});}
 const client=()=>({auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),getUser:async()=>({data:{user:{id:state.user}}}),signOut:async()=>({})},from(table){const filters={};const result=()=>{
  if(table==='businesses')return{data:[{id:business,name:'Synthetic'}]};
  if(table==='business_memberships')return{data:state.active?[{user_id:state.user,business_id:business,role:state.role,status:'active'}]:[]};
  if(table==='one_off_bookings')return{data:{id:booking,business_id:business,assigned_staff:[worker],time_zone:'Africa/Johannesburg'}};
  let rows=table==='adjustment_review_sources'?state.rows:table==='adjustment_review_events'?state.events:[];
  return{data:rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v))};
 };return{select(){return this;},eq(k,v){filters[k]=v;return this;},order(){return this;},range:async()=>result(),maybeSingle:async()=>result(),then(resolve){resolve(result());}};},rpc:async(name,p)=>{state.calls.push({name,p});return{data:sourceId};}});
 const server=createStagingServer({createClient:client,restoreTest});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.test&password=test',redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(path,{method='GET',body='',origin=base,type='application/x-www-form-urlencoded',auth=true}={})=>fetch(base+path,{method,headers:{...(auth?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin,'Content-Type':type}:{})},...(method==='POST'?{body:String(body)}:{}),redirect:'manual'});
 try{await fn({state,request});}finally{await new Promise(r=>server.close(r));}
}
const root='/earnings-adjustments?business='+business,bookPath=root+'&booking='+booking,savedPath=root+'&source='+sourceId;
const register=()=>new URLSearchParams({action:'register_source',version:'0',event_key:id(100),source_id:sourceId,worker_id:worker,original_amount:'2500',original_version:'3',original_period:'2026-10',agreement_evidence:'SYNTHETIC terms',original_evidence:'SYNTHETIC source'});
test('HTTP registers only scoped assigned synthetic source; form errors retain explicit blanks and choices',()=>run(async({state,request})=>{
 assert.equal((await request(bookPath,{auth:false})).status,303);
 const html=await(await request(bookPath)).text();assert.match(html,/Register synthetic source/);assert.match(html,/do not create earned pay/);
 const f=register();f.set('business_id',id(999));f.set('actor_id',worker);assert.equal((await request(bookPath,{method:'POST',body:f})).status,303);
 assert.equal(state.calls[0].name,'append_earnings_adjustment');assert.equal(state.calls[0].p.p_business_id,business);assert.equal(state.calls[0].p.p_payload.bookingId,booking);
 const bad=register();bad.delete('original_amount');const response=await request(bookPath,{method:'POST',body:bad});assert.equal(response.status,422);const error=await response.text();assert.match(error,new RegExp('value="'+worker+'" selected'));assert.match(error,/name="original_amount" type="text" value=""/);assert.equal(state.calls.length,1);
 assert.equal((await request(bookPath,{method:'POST',body:f,origin:'https://foreign.invalid'})).status,403);
 assert.equal((await request(bookPath,{method:'POST',body:f,type:'application/json'})).status,415);
 assert.equal((await request(bookPath,{method:'POST',body:'x'.repeat(24001)})).status,413);
 assert.equal((await request(bookPath.replace(business,id(99)))).status,403);
 state.role='manager';assert.equal((await request(bookPath,{method:'POST',body:register()})).status,303);
 assert.equal((await request(savedPath,{method:'POST',body:'action=approve'})).status,404);
 state.active=false;assert.equal((await request(bookPath)).status,403);
}));
test('HTTP fresh manager/staff roles cannot gain owner actions; staff can review own source only',()=>run(async({state,request})=>{
 state.role='manager';assert.equal((await request(savedPath,{method:'POST',body:'action=approve'})).status,403);
 state.role='staff';state.user=worker;
 assert.equal((await request(bookPath)).status,403);
 const html=await(await request(savedPath)).text();assert.match(html,/Original source/);assert.doesNotMatch(html,/Prepare a linked correction|Owner approval/);
 const f=new URLSearchParams({action:'raise_dispute',version:'1',event_key:id(102),adjustment_id:id(999),reason:'Own review',evidence:'TEST'});
 assert.equal((await request(savedPath,{method:'POST',body:f})).status,422);assert.equal(state.calls.length,0);
 assert.equal((await request(savedPath,{method:'POST',body:'action=approve'})).status,403);
 state.user=owner;assert.equal((await request(savedPath)).status,404);
},{saved:true}));
test('restore workspace disables all adjustment writes',()=>run(async({state,request})=>{
 assert.equal((await request(bookPath,{method:'POST',body:register()})).status,405);assert.equal(state.calls.length,0);
},{restoreTest:true}));
test('staff HTTP records own review without granting owner approval or exposing another worker',()=>run(async({state,request})=>{
 const f=new URLSearchParams({action:'raise_dispute',version:'2',event_key:id(102),adjustment_id:id(101),reason:'Please review my expense',evidence:'TEST worker evidence'});
 assert.equal((await request(savedPath,{method:'POST',body:f})).status,303);assert.equal(state.calls.length,1);assert.equal(state.calls[0].p.p_payload.adjustmentId,id(101));
 state.role='manager';assert.equal((await request(savedPath,{method:'POST',body:'action=approve'})).status,403);assert.equal(state.calls.length,1);
},{role:'staff',user:worker,saved:true,proposed:true}));
test('history reader rejects incomplete scope; renderer escapes evidence and creates unique labels',async()=>{
 const client={from(){return{select(){return this;},eq(){return this;},order(){return this;},range:async()=>({data:[]}),then(resolve){resolve({data:[{id:sourceId,business_id:business,version:1,synthetic_only:true}]});}};}};
 await assert.rejects(readAdjustmentSource(client,business,sourceId),/Incomplete/);
 const html=renderAdjustmentReviews({id:business,name:'<script>'},{booking:{id:booking,assigned_staff:[worker]},role:'owner'});
 assert.doesNotMatch(html,/<script>/);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const m of html.matchAll(/<label for="([^"]+)"/g))assert.ok(ids.includes(m[1]));
});
