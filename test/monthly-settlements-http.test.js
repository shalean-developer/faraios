import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
import {renderMonthlyStatements,monthlyPayload,settlementSummary} from '../src/monthly-settlements.js';
const id=n=>'ef000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),worker=id(2),business=id(10),booking=id(20),sourceId=id(30);
const original={};
async function run(fn,{role='owner',user=owner,restoreTest=false,saved=false,proposed=false}={}){
 const row={id:sourceId,business_id:business,worker_id:worker,booking_id:booking,state:{workerId:worker,period:'2026-09',targetDate:'2026-10-05',dueDate:'2026-10-05',lines:[],transfers:[],freeze:null,approval:null,execution:'disabled'},period:'2026-09',version:1,synthetic_only:true};
 const state={role,user,active:true,calls:[],rows:saved?[row]:[],events:saved?[{statement_id:sourceId,business_id:business,version:1,event_key:id(100),event_type:'create',payload:original,actor_id:owner,actor_role:'owner',created_at:'2026-10-22T10:00:00Z'}]:[]};
 const client=()=>({auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),getUser:async()=>({data:{user:{id:state.user}}}),signOut:async()=>({})},from(table){const filters={};const result=()=>{
  if(table==='businesses')return{data:[{id:business,name:'Synthetic'}]};
  if(table==='business_memberships')return{data:state.active?[{user_id:state.user,business_id:business,role:state.role,status:'active'}]:[]};
  if(table==='one_off_bookings')return{data:{id:booking,business_id:business,assigned_staff:[worker],time_zone:'Africa/Johannesburg'}};
  let rows=table==='settlement_review_statements'?state.rows:table==='settlement_review_events'?state.events:[];
  return{data:rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v))};
 };return{select(){return this;},eq(k,v){filters[k]=v;return this;},order(){return this;},range:async()=>result(),maybeSingle:async()=>result(),then(resolve){resolve(result());}};},rpc:async(name,p)=>{if(name==='staff_context')return{data:[{user_id:worker,label:'Synthetic cleaner'}]};state.calls.push({name,p});return{data:sourceId};}});
 const server=createStagingServer({createClient:client,restoreTest});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.test&password=test',redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(path,{method='GET',body='',origin=base,type='application/x-www-form-urlencoded',auth=true}={})=>fetch(base+path,{method,headers:{...(auth?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin,'Content-Type':type}:{})},...(method==='POST'?{body:String(body)}:{}),redirect:'manual'});
 try{await fn({state,request});}finally{await new Promise(r=>server.close(r));}
}

const root='/monthly-settlements?business='+business,savedPath=root+'&statement='+sourceId;
const create=()=>new URLSearchParams({action:'create',version:'0',event_key:id(100),statement_id:sourceId,worker_id:worker,period:'2026-09',calendar_evidence:'SYNTHETIC calendar',closed_dates:'2026-10-05'});
test('monthly HTTP scoped preparer, CSRF/body guards, fresh role and restore denial',()=>run(async({state,request})=>{
 assert.equal((await request(root,{auth:false})).status,303);
 const createHtml=await(await request(root)).text();assert.match(createHtml,/Prepare a closed-month statement/);assert.match(createHtml,new RegExp('value="'+worker+'"[^>]*>Synthetic cleaner'));
 const f=create();f.set('business_id',id(999));f.set('actor_id',worker);
 assert.equal((await request(root,{method:'POST',body:f})).status,303);
 assert.equal(state.calls[0].name,'append_monthly_settlement');assert.equal(state.calls[0].p.p_business_id,business);
 assert.deepEqual(state.calls[0].p.p_payload.closedDates,['2026-10-05']);
 assert.equal((await request(root,{method:'POST',body:f,origin:'https://foreign.invalid'})).status,403);
 assert.equal((await request(root,{method:'POST',body:f,type:'application/json'})).status,415);
 assert.equal((await request(root,{method:'POST',body:'x'.repeat(24001)})).status,413);
 assert.equal((await request(root.replace(business,id(99)))).status,403);
 state.role='manager';assert.equal((await request(root,{method:'POST',body:'action=approve'})).status,403);
 state.role='staff';assert.equal((await request(root,{method:'POST',body:f})).status,403);
}));
test('monthly own-worker read/dispute has no owner controls and foreign worker is hidden',()=>run(async({state,request})=>{
 const html=await(await request(savedPath)).text();assert.match(html,/2026-09 statement/);assert.doesNotMatch(html,/Freeze statement|Approve statement|Add synthetic line/);
 assert.equal((await request(savedPath,{method:'POST',body:'action=approve'})).status,403);
 const f=new URLSearchParams({action:'dispute',version:'1',event_key:id(102),line_id:id(101),reason:'TEST',evidence:'TEST'});
 assert.equal((await request(savedPath,{method:'POST',body:f})).status,303);
 state.user=owner;assert.equal((await request(savedPath)).status,404);
},{role:'staff',user:worker,saved:true}));
test('monthly errors preserve blanks; restore writes rejected',()=>run(async({state,request})=>{
 const f=create();f.set('action','add_line');assert.equal((await request(root,{method:'POST',body:f})).status,400);
 assert.equal(state.calls.length,0);
},{saved:false}));
test('monthly restore is read-only',()=>run(async({state,request})=>{
 assert.equal((await request(root,{method:'POST',body:create()})).status,405);assert.equal(state.calls.length,0);
},{restoreTest:true}));
test('monthly summary never calls partial or unknown fully cleared and renderer escapes evidence',()=>{
 const st={workerId:worker,period:'2026-09',targetDate:'2026-10-05',dueDate:'2026-10-05',lines:[{id:id(101),kind:'visit',outstandingCents:250000,amountCents:250000,priorClearedCents:0,sourceReference:'<script>',originalPeriod:'2026-09',evidence:'<script>',disputed:false},{kind:'customer_pool',collected:false,outstandingCents:5000,disputed:false}],transfers:[{amountCents:250000,clearedCents:200000,uncertain:true,outcome:'partial',reference:'<script>'}],freeze:{},approval:{}};
 const summary=settlementSummary(st);assert.equal(summary.status,'Partial — remainder uncertain');assert.equal(summary.total,250000);assert.equal(summary.pending,5000);assert.equal(summary.outstanding,50000);
 const html=renderMonthlyStatements({id:business,name:'<script>'},{record:{id:sourceId,version:5,state:st,events:[]},role:'owner'});
 assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/Record submitted simulation/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const m of html.matchAll(/<label for="([^"]+)"/g))assert.ok(ids.includes(m[1]));
 assert.throws(()=>monthlyPayload(new URLSearchParams({action:'add_line',amount:'',prior_cleared:'0'})),/amount/);
});
