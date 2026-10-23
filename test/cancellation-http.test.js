import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const id=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),staff=id(2),business=id(10),booking=id(20);
async function run(fn,{role='owner',restoreTest=false}={}){
 const state={role,calls:[],active:true};
 const source={id:booking,business_id:business,starts_at:'2026-10-24T07:00:00Z',time_zone:'Africa/Johannesburg',assigned_staff:[staff],customer_snapshot:{name:'Synthetic customer'},total_cents:100000};
 const client=()=>({auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),getUser:async()=>({data:{user:{id:user}}}),signOut:async()=>({})},from(table){return {select(){return this;},eq(k){if(table==='businesses')return Promise.resolve({data:[{id:business,name:'Synthetic business'}]});if(table==='business_memberships'&&k==='status')return Promise.resolve({data:state.active?[{user_id:user,business_id:business,role:state.role,status:'active'}]:[]});return this;},order(){return this;},limit:async()=>({data:[]}),maybeSingle:async()=>({data:source})};},rpc:async(name,p)=>{state.calls.push({name,p});return {data:id(40)};}});
 const server=createStagingServer({createClient:client,restoreTest});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.test&password=synthetic',redirect:'manual'});
 const Cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(path,{method='GET',body='',origin=base,type='application/x-www-form-urlencoded',cookie=Cookie}={})=>fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin,'Content-Type':type}:{})},...(method==='POST'?{body}:{}),redirect:'manual'});
 try{await fn({state,request});}finally{await new Promise(r=>server.close(r));}
}
const path='/cancellations?business='+business+'&booking='+booking;
const form=()=>new URLSearchParams({action:'prepare',version:'0',event_key:id(100),cause:'customer',case_action:'cancel',stage:'accepted',requested_at:'2026-10-22T08:00',accepted_at:'2026-10-21T08:00',new_terms:'yes',acceptance_evidence:'TEST accepted prospective terms',['pay_'+staff]:'300',['expense_'+staff]:'0',eligible:'1000',loss:'0',receipts:'1000',performed:'0',refunded:'0',pending:'0',fee:'0',pool:'0',rights:'yes',waive:'no',calendar_reviewed:'yes'});
test('cancellation HTTP prepares without changing booking, validates inputs, and enforces origin and scope',()=>run(async({state,request})=>{
 assert.equal((await request(path,{cookie:null})).status,303);
 const page=await request(path);assert.equal(page.status,200);assert.match(await page.text(),/Prepare assessment/);
 const f=form();f.set('business_id',id(999));f.set('actor_id',staff);
 assert.equal((await request(path,{method:'POST',body:f.toString()})).status,303);
 assert.equal(state.calls.length,1);assert.equal(state.calls[0].name,'append_cancellation_review');assert.equal(state.calls[0].p.p_business_id,business);assert.equal(state.calls[0].p.p_payload.originalStart,'2026-10-24T07:00:00Z');
 const bad=form();bad.delete('receipts');assert.equal((await request(path,{method:'POST',body:bad.toString()})).status,422);assert.equal(state.calls.length,1);
 const preserved=form();for(const [k,v] of [['cause','business'],['case_action','reschedule'],['stage','started'],['waive','yes'],['replacement_accepted','yes']])preserved.set(k,v);
 const invalid=await request(path,{method:'POST',body:preserved.toString()});assert.equal(invalid.status,422);const invalidHtml=await invalid.text();
 for(const v of ['business','reschedule','started'])assert.match(invalidHtml,new RegExp('<option value="'+v+'" selected>'));
 assert.match(invalidHtml,/<select id="cancel-waive" name="waive">[\s\S]*?<option value="yes" selected>/);
 assert.match(invalidHtml,/<select id="cancel-replacement_accepted" name="replacement_accepted">[\s\S]*?<option value="yes" selected>/);
 assert.equal((await request(path,{method:'POST',body:f.toString(),origin:'https://foreign.invalid'})).status,403);
 assert.equal((await request(path,{method:'POST',body:f.toString(),type:'application/json'})).status,415);
 assert.equal((await request(path,{method:'POST',body:'x'.repeat(32769)})).status,413);
 assert.equal((await request(path.replace(business,id(99)))).status,403);
 state.role='manager';assert.equal((await request(path,{method:'POST',body:'action=approve&version=1'})).status,403);
 state.active=false;assert.equal((await request(path)).status,403);
}));
for(const role of ['manager','staff'])test('cancellation HTTP '+role+' role boundary',()=>run(async({state,request})=>{
 assert.equal((await request(path)).status,role==='manager'?200:403);
 assert.equal((await request(path,{method:'POST',body:form().toString()})).status,role==='manager'?303:403);
 assert.equal(state.calls.length,role==='manager'?1:0);
},{role}));
test('restore workspace denies cancellation writes',()=>run(async({state,request})=>{
 assert.equal((await request(path,{method:'POST',body:form().toString()})).status,405);assert.equal(state.calls.length,0);
},{restoreTest:true}));
