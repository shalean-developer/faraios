import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001';
async function run(fn, {role="manager"}={}){
  const state={role,active:true,verified:true,time:Date.now(),settings:null,settingsWrites:0};
  const factory=()=>({auth:{signInWithPassword:async({password})=>password==='test-password'?{data:{session:{expires_at:Math.floor(state.time/1000)+3600}}}:{error:{message:'bad'}},getUser:async()=>state.verified?({data:{user:{id:uid}}}):({error:{message:'revoked'}}),signOut:async()=>({})},from:table=>table==='business_settings'?{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:state.settings}),upsert(row){state.settings=row;state.settingsWrites++;return {select:async()=>({data:[{business_id:row.business_id}]})};}}:({select(){return this;},eq(key){if(table==='businesses')return Promise.resolve({data:[{id:bid,name:'Synthetic Co'}]});return key==='status'?Promise.resolve({data:state.active?[{user_id:uid,business_id:bid,role:state.role,status:'active'}]:[]}):this;}})});
  const server=createStagingServer({createClient:factory,now:()=>state.time});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  try{await fn(base,state);}finally{await new Promise(r=>server.close(r));}
}
test('staging login posts to provider contract and scopes authenticated dashboard',async()=>run(async base=>{
  const page=await fetch(base+'/login');assert.match(await page.text(),/type="password"/);assert.equal(page.headers.get('referrer-policy'),'same-origin');
  const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=test-password',redirect:'manual'});
  assert.equal(login.status,303);const Cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const dashboard=await fetch(base+'/dashboard',{headers:{Cookie}});assert.match(await dashboard.text(),/Synthetic Co/);
  assert.equal((await fetch(base+'/dashboard?business=other',{headers:{Cookie}})).status,403);
  await fetch(base+'/logout',{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'',redirect:'manual'});
  assert.equal((await fetch(base+'/dashboard',{headers:{Cookie},redirect:'manual'})).status,303);
}));
test('staging login rejects foreign origins and throttles repeated failures',async()=>run(async base=>{
  assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/x-www-form-urlencoded'},body:'email=x&password=x'})).status,403);
  for(let i=0;i<5;i++)assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=wrong'})).status,401);
  assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=wrong'})).status,429);
}));

async function signIn(base){
 const result=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=test-password',redirect:'manual'});
 assert.equal(result.status,303);return result.headers.get('set-cookie').split(';')[0];
}
for(const role of ['manager','staff'])test(`staging HTTP enforces ${role} workspace and cross-business denial`,async()=>run(async(base)=>{
 const Cookie=await signIn(base);
 const response=await fetch(base+'/dashboard?business='+bid,{headers:{Cookie}});assert.equal(response.status,200);
 const html=await response.text();
 if(role==='manager'){assert.match(html,/>Finance</);assert.match(html,/manage invoices and record payments/);}
 else{assert.match(html,/My assignments/);assert.match(html,/My earnings/);assert.doesNotMatch(html,/Business finances|>Finance</);}
 assert.doesNotMatch(html,/Business settings|Team access|payout approval/);
 assert.equal((await fetch(base+'/dashboard?business=20000000-0000-4000-8000-000000000002&role=owner',{headers:{Cookie}})).status,403);
},{role}));
test('staging HTTP rechecks membership suspension without requiring logout',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base);state.active=false;
 assert.equal((await fetch(base+'/dashboard?business='+bid,{headers:{Cookie}})).status,403);
 const html=await(await fetch(base+'/dashboard',{headers:{Cookie}})).text();assert.match(html,/No business access assigned/);assert.doesNotMatch(html,/Synthetic Co|>Finance</);
}));
test('staging HTTP rejects expired sessions and revoked identities',async()=>run(async(base,state)=>{
 let Cookie=await signIn(base);state.time+=1800001;
 assert.equal((await fetch(base+'/dashboard',{headers:{Cookie},redirect:'manual'})).status,303);
 Cookie=await signIn(base);state.verified=false;
 assert.equal((await fetch(base+'/dashboard',{headers:{Cookie},redirect:'manual'})).status,303);
}));

const settingsForm='display_name=Test+brand&working_days=1&opens_at=08%3A00&closes_at=17%3A00&time_zone=UTC';
test('settings HTTP permits owner save and denies foreign business, CSRF and anonymous access',async()=>run(async(base,state)=>{
 assert.equal((await fetch(base+'/settings?business='+bid,{redirect:'manual'})).status,303);
 const Cookie=await signIn(base);const url=base+'/settings?business='+bid;
 assert.equal((await fetch(url,{headers:{Cookie}})).status,200);
 const post=async(origin,body=settingsForm,target=url)=>fetch(target,{method:'POST',headers:{Cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 assert.equal((await post(base)).status,303);assert.equal(state.settings.business_id,bid);assert.equal(state.settingsWrites,1);
 assert.equal((await post(base,'display_name=Bad')).status,422);assert.equal(state.settingsWrites,1);
 assert.equal((await post('https://foreign.invalid')).status,403);
 assert.equal((await post(base,settingsForm,base+'/settings?business=other')).status,403);assert.equal(state.settingsWrites,1);
},{role:'owner'}));
for(const role of ['manager','staff'])test(`settings HTTP denies ${role} reads and writes`,async()=>run(async(base,state)=>{
 const Cookie=await signIn(base);const url=base+'/settings?business='+bid;
 assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:settingsForm})).status,403);
 assert.equal(state.settingsWrites,0);
},{role}));
