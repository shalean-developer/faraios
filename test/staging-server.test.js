import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001';
function catalogueClient(state){
 let update,deleting=false,filters=[];
 const builder={eq(key,value){filters.push([key,value]);return this;},order(){return this;},limit:async()=>({data:state.catalogue}),select(){
   if(!update&&!deleting)return this;
   const item=state.catalogue.find(row=>filters.every(([key,value])=>row[key]===value));
   if(!item)return Promise.resolve({data:[]});if(deleting){state.catalogue.splice(state.catalogue.indexOf(item),1);state.catalogueWrites++;return Promise.resolve({data:[{id:item.id}]});}Object.assign(item,update,{version:item.version+1});state.catalogueWrites++;return Promise.resolve({data:[{id:item.id}]});
 },insert(row){const item={...row,id:'30000000-0000-4000-8000-'+String(state.catalogue.length+1).padStart(12,'0'),version:1};state.catalogue.push(item);state.catalogueWrites++;return {select:async()=>({data:[{id:item.id}]})};},delete(){deleting=true;return this;},update(row){update=row;return this;}};return builder;
}
function customerClient(state,table){
 const rows=table==='business_customers'?state.customers:state.addresses;let filters=[],payload,updating=false;
 const matches=row=>filters.every(([key,value])=>row[key]===value);
 const query={eq(key,value){filters.push([key,value]);return this;},order(){return this;},limit:async count=>({data:rows.filter(matches).slice(0,count)}),maybeSingle:async()=>({data:rows.find(matches)??null}),select(){
  if(!payload)return this;
  if(updating){const row=rows.find(matches);if(!row)return Promise.resolve({data:[]});Object.assign(row,payload,{version:row.version+1});return Promise.resolve({data:[{id:row.id}]});}
  const row={...payload,id:'40000000-0000-4000-8000-'+String(rows.length+1).padStart(12,'0'),version:1};rows.push(row);return Promise.resolve({data:[{id:row.id}]});
 },insert(row){payload=row;return this;},update(row){payload=row;updating=true;return this;}};return query;
}
async function run(fn, {role="manager"}={}){
  const state={role,active:true,verified:true,time:Date.now(),settings:null,settingsWrites:0,catalogue:[],catalogueWrites:0,customers:[],addresses:[]};
  const factory=()=>({auth:{signInWithPassword:async({password})=>password==='test-password'?{data:{session:{expires_at:Math.floor(state.time/1000)+3600}}}:{error:{message:'bad'}},getUser:async()=>state.verified?({data:{user:{id:uid}}}):({error:{message:'revoked'}}),signOut:async()=>({})},from:table=>['business_customers','customer_addresses'].includes(table)?customerClient(state,table):table==='business_catalogue'?catalogueClient(state):table==='business_settings'?{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:state.settings}),upsert(row){state.settings=row;state.settingsWrites++;return {select:async()=>({data:[{business_id:row.business_id}]})};}}:({select(){return this;},eq(key){if(table==='businesses')return Promise.resolve({data:[{id:bid,name:'Synthetic Co'}]});return key==='status'?Promise.resolve({data:state.active?[{user_id:uid,business_id:bid,role:state.role,status:'active'}]:[]}):this;}})});
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

const catalogueForm='kind=service&name=Synthetic&pricing_model=fixed&unit_label=visit&price=250.01&team_size=2&status=inactive';
test('catalogue HTTP owner create/edit rejects stale versions and foreign scope',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/catalogue?business='+bid;
 const post=(target,body)=>fetch(target,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 assert.equal((await post(url,catalogueForm)).status,303);assert.equal(state.catalogue[0].price_cents,25001);
 const edit=url+'&item='+state.catalogue[0].id;
 assert.equal((await post(edit,catalogueForm+'&version=1')).status,303);
 assert.equal((await post(edit,catalogueForm+'&version=1')).status,409);
 assert.equal((await post(url,catalogueForm.replace('250.01','1.001'))).status,422);
 assert.equal((await post(base+'/catalogue?business=other',catalogueForm)).status,403);
 assert.equal(state.catalogueWrites,2);
 const confirmation=await fetch(edit+'&delete=1',{headers:{Cookie}});assert.equal(confirmation.status,200);assert.match(await confirmation.text(),/Confirm delete/);assert.equal(state.catalogue.length,1);
 assert.equal((await post(edit,'action=delete&version=1')).status,409);assert.equal(state.catalogue.length,1);
 assert.equal((await fetch(edit,{method:'POST',headers:{Cookie,Origin:'https://foreign.invalid','Content-Type':'application/x-www-form-urlencoded'},body:'action=delete&version=2'})).status,403);
 assert.equal((await post(edit,'action=delete&version=2')).status,303);assert.equal(state.catalogue.length,0);
 assert.equal((await post(edit,'action=delete&version=2')).status,404);
},{role:'owner'}));
for(const role of ['manager','staff'])test(`catalogue HTTP ${role} follows read/write restrictions`,async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/catalogue?business='+bid;
 const response=await fetch(url,{headers:{Cookie}});assert.equal(response.status,role==='manager'?200:403);
 if(role==='manager'){const html=await response.text();assert.match(html,/Read-only catalogue/);assert.doesNotMatch(html,/<form/);}
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:catalogueForm})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=delete&version=1'})).status,403);
 assert.equal(state.catalogueWrites,0);
},{role}));

for(const role of ['owner','manager'])test(`customer HTTP ${role} create/edit/address flow and stale/foreign denial`,async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/customers?business='+bid;
 const post=(target,body,Origin=base)=>fetch(target,{method:'POST',headers:{Cookie,Origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 assert.equal((await fetch(url,{headers:{Cookie}})).status,200);
 assert.equal((await post(url,'action=customer&name=Test&email=test%40example.test&private_notes=Private&status=active')).status,303);
 const customer=url+'&customer='+state.customers[0].id;
 assert.match(await (await fetch(customer,{headers:{Cookie}})).text(),/Private/);
 assert.equal((await post(customer,'action=customer&name=Edited&status=active&version=1')).status,303);
 assert.equal((await post(customer,'action=customer&name=Stale&status=active&version=1')).status,409);
 assert.equal((await post(customer,'action=address&label=Home&address_line=Test+street&status=active')).status,303);
 const address=customer+'&address='+state.addresses[0].id;
 assert.equal((await post(address,'action=address&label=Office&address_line=Edited+street&status=inactive&version=1')).status,303);
 assert.equal(state.addresses[0].address_line,'Edited street');assert.equal(state.addresses[0].is_active,false);
 assert.equal((await post(address,'action=address&label=Stale&address_line=X&status=active&version=1')).status,409);
 const longNote=new URLSearchParams({action:'customer',name:'Edited',status:'active',version:'2',private_notes:'字'.repeat(4000)}).toString();
 assert.ok(Buffer.byteLength(longNote)>32768);assert.equal((await post(customer,longNote)).status,303);assert.equal(state.customers[0].private_notes.length,4000);
 for(let n=0;n<101;n++)state.addresses.push({id:'50000000-0000-4000-8000-'+String(n).padStart(12,'0'),business_id:bid,customer_id:state.customers[0].id,label:'Extra '+n,address_line:'Synthetic',version:1,is_active:true});
 const beyond=customer+'&address='+state.addresses.at(-1).id;
 assert.equal((await fetch(beyond,{headers:{Cookie}})).status,200);
 assert.equal((await post(beyond,'action=address&label=Last&address_line=Edited&status=inactive&version=1')).status,303);assert.equal(state.addresses.at(-1).is_active,false);
 assert.equal((await post(url,'action=customer&name=&status=active')).status,422);
 assert.equal((await post(url,'action=customer&name=CSRF&status=active','https://foreign.invalid')).status,403);
 assert.equal((await post(base+'/customers?business=foreign','action=customer&name=Foreign&status=active')).status,403);
 assert.equal((await fetch(url+'&customer=40000000-0000-4000-8000-999999999999',{headers:{Cookie}})).status,404);
 assert.equal((await fetch(base+'/customers?business=foreign',{headers:{Cookie}})).status,403);
 state.active=false;assert.equal((await post(customer,'action=customer&name=Revoked&status=active&version=2')).status,403);
},{role}));
test('customer HTTP denies staff and anonymous reads/writes',async()=>run(async(base)=>{
 const url=base+'/customers?business='+bid;
 assert.equal((await fetch(url,{redirect:'manual'})).status,303);
 const Cookie=await signIn(base);assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=customer&name=No&status=active'})).status,403);
},{role:'staff'}));
