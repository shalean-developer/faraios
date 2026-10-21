import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001';
function catalogueClient(state){
 let update,deleting=false,filters=[];
 const builder={eq(key,value){filters.push([key,value]);return this;},order(){return this;},range:async(start,end)=>({data:state.catalogue.filter(row=>filters.every(([key,value])=>row[key]===value)).slice(start,end+1)}),select(){
   if(!update&&!deleting)return this;
   const item=state.catalogue.find(row=>filters.every(([key,value])=>row[key]===value));
   if(!item)return Promise.resolve({data:[]});if(deleting){state.catalogue.splice(state.catalogue.indexOf(item),1);state.catalogueWrites++;return Promise.resolve({data:[{id:item.id}]});}Object.assign(item,update,{version:item.version+1});state.catalogueWrites++;return Promise.resolve({data:[{id:item.id}]});
 },insert(row){const item={...row,id:'30000000-0000-4000-8000-'+String(state.catalogue.length+1).padStart(12,'0'),version:1};state.catalogue.push(item);state.catalogueWrites++;return {select:async()=>({data:[{id:item.id}]})};},delete(){deleting=true;return this;},update(row){update=row;return this;}};return builder;
}
function customerClient(state,table){
 const rows=table==='business_earnings_rules'?state.earnings:table==='business_invoices'?state.invoices:table==='business_accounting_connections'?state.connections:table==='business_quotes'?state.quotes:table==='quote_invoice_handoffs'?state.handoffs:table==='recurring_schedules'?state.recurring:table==='staff_profiles'?state.profiles:table==='staff_teams'?state.teams:table==='business_customers'?state.customers:state.addresses;let filters=[],payload,updating=false;
 const matches=row=>filters.every(([key,value])=>row[key]===value);
 const query={eq(key,value){filters.push([key,value]);return this;},order(){return this;},range:async(start,end)=>({data:rows.filter(matches).slice(start,end+1)}),limit:async count=>({data:rows.filter(matches).slice(0,count)}),maybeSingle:async()=>({data:rows.find(matches)??null}),select(){
  if(!payload)return this;
  if(updating){const row=rows.find(matches);if(!row)return Promise.resolve({data:[]});Object.assign(row,payload,{version:row.version+1});return Promise.resolve({data:[table==='business_earnings_rules'?{business_id:row.business_id,service_id:row.service_id}:{id:row.id}]});}
  const row={...payload,id:'40000000-0000-4000-8000-'+String(rows.length+1).padStart(12,'0'),version:1};rows.push(row);return Promise.resolve({data:[table==='business_earnings_rules'?{business_id:row.business_id,service_id:row.service_id}:{id:row.id}]});
 },insert(row){payload=row;return this;},update(row){payload=row;updating=true;return this;}};return query;
}
function bookingClient(state){
 let filters=[],payload,updating=false;const matches=r=>filters.every(([k,v])=>r[k]===v);
 const query={eq(k,v){filters.push([k,v]);return this;},order(){return this;},limit:async count=>({data:state.bookings.filter(matches).slice(0,count)}),maybeSingle:async()=>({data:state.bookings.find(matches)??null}),select(){
  if(!payload)return this;
  if(updating){const row=state.bookings.find(matches);if(!row)return Promise.resolve({data:[]});Object.assign(row,payload,{version:row.version+1});return Promise.resolve({data:[{id:row.id}]});}
  if(state.bookings.some(r=>r.business_id===payload.business_id&&r.request_key===payload.request_key))return Promise.resolve({error:{code:'23505'}});
  const row={...payload,id:'60000000-0000-4000-8000-'+String(state.bookings.length+1).padStart(12,'0'),version:1,status:'draft',time_zone:'UTC',required_team_size:1,assigned_staff:[],customer_snapshot:{name:'Synthetic customer'},address_snapshot:{address_line:'Synthetic street'},price_lines:[{name:'Synthetic',quantity:1,rate_cents:100,total_cents:100,unit_label:'visit'}],total_cents:100,request_payload:{...payload}};state.bookings.push(row);return Promise.resolve({data:[{id:row.id}]});
 },insert(r){payload=r;return this;},update(r){payload=r;updating=true;return this;}};return query;
}
async function run(fn, {role="manager",restoreTest=false,earningsTemplates={}}={}){
  const state={role,active:true,verified:true,time:Date.now(),settings:null,settingsWrites:0,catalogue:[],catalogueWrites:0,customers:[],addresses:[],bookings:[],profiles:[],teams:[],recurring:[],quotes:[],handoffs:[],quoteRPC:null,invoices:[],connections:[],invoiceRPC:null,rpcCalls:[],earnings:[]};
  const factory=()=>({rpc:async (name,params)=>['invoice_totals','prepare_invoice','configure_accounting'].includes(name)?(state.rpcCalls.push({name,params}),state.invoiceRPC?state.invoiceRPC(name,params):{data:name==='invoice_totals'?{business_id:bid,count:0,total_cents:0,matched_count:0,matched_cents:0,review_count:0,pending_count:0}:'90000000-0000-4000-8000-000000000010'}):name==='quote_acceptance_actor'?(state.actorRPC?state.actorRPC(params):{data:{business_id:params.p_business_id,quote_id:params.p_quote_id,actor_id:uid,label:'Synthetic office account'}}):name.endsWith('_quote')?(state.rpcCalls.push({name,params}),state.quoteRPC?state.quoteRPC(name,params):{data:'90000000-0000-4000-8000-000000000001'}):name.endsWith('_recurring')?(state.rpcCalls.push({name,params}),{data:name==='generate_recurring'?3:'80000000-0000-4000-8000-000000000001'}):name==='calendar_window'?({data:{time_zone:'UTC',starts_at:'2026-10-20T00:00:00Z',ends_at:'2026-10-27T00:00:00Z',bookings:state.bookings.map(b=>({...b,name:b.customer_snapshot.name})),busy:[]}}):name==='staff_availability'?({data:{time_zone:'UTC',starts_at:'2026-10-20T09:00:00Z',ends_at:'2026-10-20T11:00:00Z',staff:[{user_id:uid,busy:true}]}}):name==='staff_context'?({data:[{user_id:uid,label:'Synthetic staff'}]}):({data:{time_zone:'UTC',working_days:[1,2,3,4,5],opens_at:'08:00',closes_at:'18:00',staff:[{user_id:uid,label:'Synthetic staff'}]}}),auth:{signInWithPassword:async({password})=>password==='test-password'?{data:{session:{expires_at:Math.floor(state.time/1000)+3600}}}:{error:{message:'bad'}},getUser:async()=>state.verified?({data:{user:{id:uid}}}):({error:{message:'revoked'}}),signOut:async()=>({})},from:table=>table==='one_off_bookings'?bookingClient(state):['business_earnings_rules','business_invoices','business_accounting_connections','business_customers','customer_addresses','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs'].includes(table)?customerClient(state,table):table==='business_catalogue'?catalogueClient(state):table==='business_settings'?{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:state.settings}),upsert(row){state.settings=row;state.settingsWrites++;return {select:async()=>({data:[{business_id:row.business_id}]})};}}:({select(){return this;},eq(key){if(table==='businesses')return Promise.resolve({data:[{id:bid,name:'Synthetic Co'}]});return key==='status'?Promise.resolve({data:state.active?[{user_id:uid,business_id:bid,role:state.role,status:'active'}]:[]}):this;}})});
  const server=createStagingServer({restoreTest,earningsTemplates,createClient:factory,now:()=>state.time});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
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
test('restore HTTP labels authenticated all-business and selected dashboards and keeps source default unchanged',async()=>run(async base=>{
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=manager.qa%40faraios.test&password=test-password',redirect:'manual'});
 assert.equal(login.status,303);const Cookie=login.headers.get('set-cookie').split(';')[0];assert.match(Cookie,/^faraios_restore_test=/);
 for(const path of ['/dashboard?business=all','/dashboard?business='+bid]){
  const response=await fetch(base+path,{headers:{Cookie}});assert.equal(response.status,200);const html=await response.text();
  assert.match(html,/<title>[^<]+FaraiOS restore test<\/title>/);assert.match(html,/FaraiOS RESTORE TEST · Read-only recovery workspace · Integrations disabled/);assert.doesNotMatch(html,/FARAiOS STAGING/);
 }
},{restoreTest:true}));
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
 if(role==='manager'){const html=await response.text();assert.match(html,/Read-only catalogue/);assert.deepEqual([...html.matchAll(/<form[^>]*method="post"[^>]*action="([^"]+)"/g)].map(m=>m[1]),['/logout']);assert.match(html,/<a href="\/dashboard">Home<\/a>/);assert.doesNotMatch(html,/catalogue-editor/);}
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

for(const role of ['owner','manager'])test(`booking HTTP ${role} lifecycle, duplicate submission, reschedule and cancel`,async()=>run(async(base,state)=>{
 const customer='70000000-0000-4000-8000-000000000001',address='70000000-0000-4000-8000-000000000002',service='70000000-0000-4000-8000-000000000003';
 state.customers.push({id:customer,business_id:bid,name:'Synthetic',is_active:true});state.addresses.push({id:address,business_id:bid,customer_id:customer,label:'Home',address_line:'Street',is_active:true});state.catalogue.push({id:service,business_id:bid,kind:'service',name:'Synthetic',price_cents:100,pricing_model:'fixed',unit_label:'visit',is_active:true});
 const Cookie=await signIn(base),url=base+'/bookings?business='+bid;
 const post=(target,body)=>fetch(target,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 const create=new URLSearchParams({action:'create',customer_id:customer,address_id:address,service_id:service,request_key:'70000000-0000-4000-8000-000000000004',service_quantity:'1',local_start:'2026-10-20T09:00',duration_minutes:'120'}).toString();
 assert.equal((await fetch(url+'&customer='+customer,{headers:{Cookie}})).status,200);
 assert.equal((await post(url,create)).status,303);assert.equal((await post(url,create)).status,303);assert.equal(state.bookings.length,1);
 const detail=url+'&booking='+state.bookings[0].id;
 assert.equal((await post(detail,'action=transition&status=completed&version=1')).status,422);
 assert.equal((await post(detail,'action=transition&status=confirmed&version=1')).status,303);
 assert.equal((await post(detail,'action=transition&status=assigned&assigned_staff='+uid+'&version=1')).status,409);
 assert.equal((await post(detail,'action=transition&status=assigned&assigned_staff='+uid+'&version=2')).status,303);
 assert.equal((await post(detail,'action=reschedule&local_start=2026-10-21T10%3A00&duration_minutes=120&change_reason=Customer+request&version=3')).status,303);
 let version=4;for(const status of ['en_route','arrived','in_progress','completed'])assert.equal((await post(detail,'action=transition&status='+status+'&version='+version++)).status,303);
 assert.match(await (await fetch(detail,{headers:{Cookie}})).text(),/Completed/);
 const cancel=create.replace('000000000004','000000000005');assert.equal((await post(url,cancel)).status,303);const other=url+'&booking='+state.bookings[1].id;
 assert.equal((await post(other,'action=transition&status=cancelled&version=1')).status,422);
 assert.equal((await post(other,'action=transition&status=cancelled&change_reason=Cancelled+by+customer&version=1')).status,303);
 assert.equal((await fetch(base+'/bookings?business=foreign',{headers:{Cookie}})).status,403);
 assert.equal((await post(base+'/bookings?business=foreign',create)).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:'https://foreign.invalid','Content-Type':'application/x-www-form-urlencoded'},body:create})).status,403);
},{role}));
test('booking HTTP denies staff and anonymous access',async()=>run(async(base)=>{
 const url=base+'/bookings?business='+bid;assert.equal((await fetch(url,{redirect:'manual'})).status,303);const Cookie=await signIn(base);assert.equal((await fetch(url,{headers:{Cookie}})).status,403);assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=create'})).status,403);
},{role:'staff'}));

test('catalogue HTTP profile changes reset the old configuration before rendering new rules',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/catalogue?business='+bid;
 const post=(target,body)=>fetch(target,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 assert.equal((await post(url,catalogueForm+'&cleaning_profile=office')).status,303);
 const item=state.catalogue[0],edit=url+'&item='+item.id;
 const configure=catalogueForm+'&version=1&cleaning_profile=office&base_minutes=60&service_fee_cents=0&equipment_policy=included&rule_bathrooms_unit_cents=0&rule_bathrooms_unit_minutes=0'+[0,1,2,3].map(i=>'&rule_office_size_'+i+'_cents=0&rule_office_size_'+i+'_minutes=0').join('');
 assert.equal((await post(edit,configure)).status,303);assert.equal(state.catalogue[0].cleaning_config.base_minutes,60);
 assert.equal((await post(edit,configure.replace('version=1','version=2').replace('cleaning_profile=office','cleaning_profile=regular'))).status,303);
 assert.equal(state.catalogue[0].cleaning_profile,'regular');assert.equal(state.catalogue[0].cleaning_config,null);
 const markup=await (await fetch(edit,{headers:{Cookie}})).text();assert.match(markup,/pet_label_0/);assert.match(markup,/rule_bedrooms_unit_rand/);assert.doesNotMatch(markup,/rule_office_size_0_cents/);
 assert.equal((await fetch(base+'/catalogue-setup.js')).status,200);
 const invalid=configure.replace('version=1','version=3').replace('cleaning_profile=office','cleaning_profile=regular')+'&rule_bedrooms_unit_rand=12.345&pet_label_5=Cats%20%26%20dogs&pet_5_rand=25.50&pet_5_minutes=15';
 const failed=await post(edit,invalid);assert.equal(failed.status,422);const body=await failed.text();assert.match(body,/value="12.345"/);assert.match(body,/value="Cats &amp; dogs"/);assert.equal(state.catalogue[0].version,3);
},{role:'owner'}));

test('catalogue focused creation, profile preview, single save, filters and deactivate keep owner guards',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/catalogue?business='+bid;
 const get=path=>fetch(path,{headers:{Cookie}}),post=(path,body)=>fetch(path,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 let html=await(await get(url)).text();assert.doesNotMatch(html,/id="catalogue-editor"/);assert.match(html,/create=service/);
 html=await(await get(url+'&view=extra&create=extra')).text();assert.match(html,/<h1>Add extra/);assert.match(html,/name="kind" value="extra"/);assert.doesNotMatch(html,/Cleaners required|Booking questions|catalogue-list/);assert.match(html,/>Cancel</);
 let response=await post(url,catalogueForm+'&action=configure&cleaning_profile=office');assert.equal(response.status,200);html=await response.text();assert.equal(state.catalogueWrites,0);assert.match(html,/name="base_minutes"/);assert.match(html,/name="configuration_profile" value="office"/);assert.match(html,/value="Synthetic"/);assert.doesNotMatch(html,/save, then reopen/);
 const complete=catalogueForm+'&configuration_profile=office&cleaning_profile=office&base_minutes=60&service_fee_rand=0&equipment_policy=included&rule_bathrooms_unit_rand=0&rule_bathrooms_unit_minutes=0'+[0,1,2,3].map(i=>'&rule_office_size_'+i+'_rand=0&rule_office_size_'+i+'_minutes=0').join('');
 assert.equal((await post(url,complete)).status,303);assert.equal(state.catalogueWrites,1);assert.equal(state.catalogue[0].cleaning_config.base_minutes,60);
 const id=state.catalogue[0].id,edit=url+'&item='+id;
 assert.equal((await post(edit,'action=deactivate&version=1')).status,303);assert.equal(state.catalogue[0].is_active,false);assert.equal((await post(edit,'action=deactivate&version=1')).status,409);
 html=await(await get(url+'&q=not-found')).text();assert.match(html,/No matching items/);assert.doesNotMatch(html,/<h3>Synthetic/);
 html=await(await get(url+'&status=active')).text();assert.doesNotMatch(html,/<h3>Synthetic/);
 html=await(await get(url+'&status=inactive')).text();assert.match(html,/<h3>Synthetic/);
 assert.equal((await post(url+'&item=30000000-0000-4000-8000-999999999999','action=deactivate&version=1')).status,404);
},{role:'owner'}));
for(const role of ['manager','staff'])test(`catalogue ${role} cannot preview or deactivate`,async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/catalogue?business='+bid;
 for(const action of ['configure','deactivate'])assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:catalogueForm+'&action='+action,redirect:'manual'})).status,403);
 assert.equal(state.catalogueWrites,0);
},{role}));

test('staff HTTP owner profile/team save, stale/tenant/CSRF guards and team assignment',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/staff?business='+bid;
 const post=(target,body,Origin=base)=>fetch(target,{method:'POST',headers:{Cookie,Origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 assert.equal((await fetch(url,{headers:{Cookie}})).status,200);
 assert.equal((await post(url,'kind=profile&user_id='+uid+'&display_name=Cleaner+One&phone=000')).status,303);
 const profile=url+'&item='+state.profiles[0].id;
 assert.equal((await post(profile,'kind=profile&user_id='+uid+'&display_name=Updated&version=1')).status,303);
 assert.equal((await post(profile,'kind=profile&user_id='+uid+'&display_name=Stale&version=1')).status,409);
 assert.equal((await post(url,'kind=profile&user_id=00000000-0000-4000-8000-999999999999&display_name=Foreign')).status,422);
 assert.equal((await post(url,'kind=profile&user_id='+uid+'&display_name=CSRF','https://foreign.invalid')).status,403);
 assert.equal((await post(base+'/staff?business=foreign','kind=profile&user_id='+uid+'&display_name=Foreign')).status,403);
 assert.equal((await post(url+'&view=team','kind=team&name=Team+One&members='+uid+'&status=active')).status,303);
 const tid=state.teams[0].id;
 assert.equal((await post(url+'&view=team&item='+tid,'kind=team&name=Team+Two&members='+uid+'&status=active&version=1')).status,303);
 assert.equal((await post(url+'&view=team&item='+tid,'kind=team&name=Stale&members='+uid+'&status=active&version=1')).status,409);
 const booking='60000000-0000-4000-8000-000000000001';state.bookings.push({id:booking,business_id:bid,status:'confirmed',required_team_size:1,version:1,assigned_staff:[],customer_snapshot:{name:'Test'},address_snapshot:{},price_lines:[],total_cents:0});
 const assign=base+'/bookings?business='+bid+'&booking='+booking;
 assert.equal((await post(assign,'action=transition&status=assigned&version=1&team_id='+tid)).status,303);
 assert.deepEqual(state.bookings[0].assigned_staff,[uid]);
 assert.equal((await post(url+'&view=team&item='+tid,'kind=team&action=deactivate&version=2')).status,303);assert.equal(state.teams[0].is_active,false);assert.deepEqual(state.bookings[0].assigned_staff,[uid]);
},{role:'owner'}));
for(const role of ['manager','staff'])test(`staff HTTP ${role} read/write restrictions`,async()=>run(async(base)=>{
 const Cookie=await signIn(base),url=base+'/staff?business='+bid;
 assert.equal((await fetch(url,{headers:{Cookie}})).status,role==='manager'?200:403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'kind=team&name=No&members='+uid+'&status=active'})).status,403);
 assert.equal((await fetch(base+'/staff?business=foreign',{headers:{Cookie}})).status,403);
},{role}));
test('staff HTTP anonymous redirects to login',async()=>run(async base=>{
 assert.equal((await fetch(base+'/staff?business='+bid,{redirect:'manual'})).status,303);
}));
test('staff list keeps creation collapsed and editors focused for both categories',async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/staff?business='+bid,get=target=>fetch(target,{headers:{Cookie}});
 let html=await(await get(url)).text();assert.doesNotMatch(html,/id="staff-editor"/);assert.match(html,/create=profile/);
 html=await(await get(url+'&create=profile')).text();assert.match(html,/<h1>Add staff profile/);assert.match(html,/id="staff-editor"/);assert.doesNotMatch(html,/catalogue-list/);
 html=await(await get(url+'&view=team')).text();assert.doesNotMatch(html,/id="staff-editor"/);assert.match(html,/create=team/);
 html=await(await get(url+'&view=team&create=team')).text();assert.match(html,/<h1>Add team/);assert.match(html,/Team members/);assert.doesNotMatch(html,/catalogue-list/);
 state.profiles.push({id:'40000000-0000-4000-8000-000000000001',business_id:bid,user_id:uid,display_name:'Existing',version:1});
 html=await(await get(url+'&create=profile')).text();assert.match(html,/already have profiles/);assert.doesNotMatch(html,/name="user_id"/);
 assert.equal(state.teams.length,0);
},{role:'owner'}));


for(const role of ['owner','manager'])test(`calendar HTTP permits ${role}, validates dates and checks availability without writes`,async()=>run(async(base,state)=>{
 const Cookie=await signIn(base),url=base+'/calendar?business='+bid+'&day=2026-10-20';
 const dashboard=await(await fetch(base+'/dashboard?business='+bid,{headers:{Cookie}})).text();assert.match(dashboard,/Availability &amp; calendar/);
 let response=await fetch(url,{headers:{Cookie}});assert.equal(response.status,200);let html=await response.text();assert.match(html,/Check cleaner availability/);assert.equal((html.match(/class="panel calendar-day(?: is-today)?"/g)||[]).length,7);
 response=await fetch(url+'&view=day&local_start=2026-10-20T09:00&duration_minutes=120',{headers:{Cookie}});assert.equal(response.status,200);html=await response.text();assert.match(html,/>Busy</);assert.equal((html.match(/class="panel calendar-day(?: is-today)?"/g)||[]).length,1);
 for(const suffix of ['&view=month','&local_start=bad&duration_minutes=120','&local_start=2026-10-20T09:00&duration_minutes=0'])assert.equal((await fetch(url+suffix,{headers:{Cookie}})).status,422);
 assert.equal((await fetch(base+'/calendar?business='+bid+'&day=2026-02-30',{headers:{Cookie}})).status,422);
 assert.equal((await fetch(base+'/calendar?business=foreign&day=2026-10-20',{headers:{Cookie}})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:''})).status,405);
 assert.equal(state.bookings.length,0);assert.equal(state.settingsWrites,0);
 state.active=false;assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
},{role}));
test('calendar HTTP denies staff and redirects anonymous users',async()=>run(async base=>{
 const url=base+'/calendar?business='+bid;
 assert.equal((await fetch(url,{redirect:'manual'})).status,303);const Cookie=await signIn(base);
 assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
},{role:'staff'}));
test('shared picker modules are served and owner calendar/settings render custom controls',async()=>run(async base=>{
 for(const path of ['/date-time-picker.js','/date-time-values.js','/quote-detail.js']){const response=await fetch(base+path);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);}
 const Cookie=await signIn(base);const settings=await(await fetch(base+'/settings?business='+bid,{headers:{Cookie}})).text();assert.match(settings,/data-picker="time"/);assert.match(settings,/src="\/date-time-picker.js"/);
 const url=base+'/calendar?business='+bid+'&day=2026-10-19';const calendar=await(await fetch(url,{headers:{Cookie}})).text();assert.match(calendar,/data-picker="date"/);assert.match(calendar,/data-picker="datetime"/);
 assert.equal((await fetch(url+'&local_start=2026-10-19T24:00&duration_minutes=120',{headers:{Cookie}})).status,422);
},{role:'owner'}));

for(const role of ['owner','manager'])test(`recurring HTTP ${role} create, change and generation keep trusted business scope`,async()=>run(async(base,state)=>{
 const source='60000000-0000-4000-8000-000000000001',schedule='80000000-0000-4000-8000-000000000001';
 state.bookings.push({id:source,business_id:bid,local_start:'2026-10-20T09:00:00',status:'draft',customer_snapshot:{name:'Synthetic'},address_snapshot:{address_line:'Synthetic'},price_lines:[],total_cents:100,time_zone:'UTC',duration_minutes:120});
 const Cookie=await signIn(base),url=base+'/recurring?business='+bid;
 const post=(target,body,origin=base)=>fetch(target,{method:'POST',headers:{Cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 let response=await fetch(url+'&source='+source,{headers:{Cookie}});assert.equal(response.status,200);assert.match(await response.text(),/original booking is the first visit/);
 const create=new URLSearchParams({action:'create',request_key:'90000000-0000-4000-8000-000000000001',frequency:'weekly',short_month:'last_day',weekdays:'2'});
 assert.equal((await post(url+'&source='+source,create)).status,303);assert.equal(state.rpcCalls[0].params.p_business_id,bid);assert.equal(state.rpcCalls[0].params.p_source_id,source);
 assert.equal((await post(url+'&source='+source,create,'https://foreign.invalid')).status,403);assert.equal(state.rpcCalls.length,1);
 assert.equal((await post(url+'&source='+source,'action=create')).status,422);
 state.recurring.push({id:schedule,business_id:bid,source_booking_id:source,agreement:state.bookings[0],frequency:'weekly',weekdays:[2],start_date:'2026-10-20',local_time:'09:00:00',short_month:'last_day',end_date:null,status:'active',generated_through:'2026-10-20',version:1});
 const target=url+'&schedule='+schedule;
 response=await fetch(target,{headers:{Cookie}});assert.equal(response.status,200);let html=await response.text();assert.match(html,/Created visits keep their existing time and price/);assert.match(html,/Create draft visits/);
 const change=new URLSearchParams({action:'change',version:'1',frequency:'monthly',short_month:'skip',local_time:'09:37',status:'paused',change_reason:'Owner request'});
 assert.equal((await post(target,change)).status,303);assert.equal(state.rpcCalls.at(-1).params.p_local_time,'09:37');
 response=await post(target,'action=generate&version=1&through=2026-11-15');assert.equal(response.status,303);assert.match(response.headers.get('location'),/created=3/);
 assert.equal((await fetch(url+'&schedule=80000000-0000-4000-8000-999999999999',{headers:{Cookie}})).status,404);
 assert.equal((await fetch(base+'/recurring?business=foreign',{headers:{Cookie}})).status,403);
 assert.equal((await post(target,'x'.repeat(8193))).status,413);
 assert.equal(state.bookings.length,1);state.active=false;assert.equal((await fetch(target,{headers:{Cookie}})).status,403);
},{role}));
test('recurring HTTP denies staff and anonymous access',async()=>run(async base=>{
 const url=base+'/recurring?business='+bid;assert.equal((await fetch(url,{redirect:'manual'})).status,303);const Cookie=await signIn(base);assert.equal((await fetch(url,{headers:{Cookie}})).status,403);assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=generate'})).status,403);
},{role:'staff'}));

for(const role of ['owner','manager'])test(`quote HTTP ${role} forms and RPCs keep scope and distinguish the invoice handoff`,async()=>run(async(base,state)=>{
 const customer='40000000-0000-4000-8000-000000000001',address='40000000-0000-4000-8000-000000000002',service='30000000-0000-4000-8000-000000000001',quote='90000000-0000-4000-8000-000000000001',booking='60000000-0000-4000-8000-000000000009',handoff='90000000-0000-4000-8000-000000000002';
 state.customers.push({id:customer,business_id:bid,name:'Synthetic customer',is_active:true});state.addresses.push({id:address,business_id:bid,customer_id:customer,label:'Home',address_line:'Synthetic street',is_active:true});state.catalogue.push({id:service,business_id:bid,kind:'service',name:'Synthetic service',is_active:true,pricing_model:'fixed',price_cents:10000,unit_label:'visit',team_size:1,version:1});
 const q={id:quote,business_id:bid,customer_id:customer,address_id:address,status:'draft',version:1,created_at:'2026-10-19T09:00:00Z',agreement:{customer_snapshot:{name:'Synthetic <customer>',email:'test@example.invalid',phone:'0000000000'},address_snapshot:{address_line:'Synthetic street'},price_lines:[{name:'Synthetic service',quantity:1,rate_cents:10000,total_cents:10000,unit_label:'visit'}],total_cents:10000,duration_minutes:120,required_team_size:1,currency:'ZAR',time_zone:'UTC'}};
 state.quotes.push(q);
 state.quoteRPC=(name)=>({data:name==='convert_quote'?{booking_id:booking,handoff_id:handoff}:quote});
 const url=base+'/quotes?business='+bid;
 assert.equal((await fetch(url,{redirect:'manual'})).status,303);
 const Cookie=await signIn(base),post=(target,body,origin=base,type='application/x-www-form-urlencoded')=>fetch(target,{method:'POST',headers:{Cookie,Origin:origin,'Content-Type':type},body,redirect:'manual'});
 let result=await fetch(url,{headers:{Cookie}}),html=await result.text();assert.equal(result.status,200);assert.match(html,/aria-current="page"[^>]*>Quotes/);assert.match(html,/Synthetic &lt;customer&gt;/);assert.doesNotMatch(html,/<customer>/);
 html=await(await fetch(url+'&create=1&customer='+customer+'&service='+service,{headers:{Cookie}})).text();assert.match(html,/Save draft quote/);assert.doesNotMatch(html,/name="local_start"/);assert.equal(state.rpcCalls.length,0);
 const create=new URLSearchParams({action:'create',customer_id:customer,address_id:address,service_id:service,service_quantity:'1',request_key:'70000000-0000-4000-8000-000000000001',duration_minutes:'120',business_id:'forged'});
 result=await post(url,create);assert.equal(result.status,303);assert.match(result.headers.get('location'),/quote=/);assert.equal(state.rpcCalls.at(-1).name,'create_quote');assert.equal(state.rpcCalls.at(-1).params.p_business_id,bid);assert.equal(state.rpcCalls.at(-1).params.p_duration_minutes,120);assert.equal(Object.hasOwn(state.rpcCalls.at(-1).params,'p_local_start'),false);
 const detail=url+'&quote='+quote;
 assert.equal((await post(detail,'action=change&status=issued&version=1&reference=Shared')).status,303);assert.equal(state.rpcCalls.at(-1).params.p_status,'issued');
 q.status='issued';q.version=2;
 const calls=state.rpcCalls.length;
 assert.equal((await post(detail,'action=change&status=accepted&version=2&reference=')).status,422);assert.equal(state.rpcCalls.length,calls);
 assert.equal((await post(detail,'action=change&status=accepted&version=2&reference=Customer+approval')).status,303);assert.equal(state.rpcCalls.at(-1).params.p_reference,'Customer approval');
 q.status='accepted';q.version=3;q.accepted_at='2026-10-19T09:10:00Z';q.accepted_by=uid;q.acceptance_reference='<script>evidence</script>';
 html=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(html,/Acceptance recorded by the office/);assert.match(html,/Synthetic office account/);assert.match(html,/09:10:00/);assert.match(html,/src="\/quote-detail.js"/);
 state.actorRPC=()=>({error:{code:'PGRST202'}});const fallback=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(fallback,/Account label unavailable/);assert.match(fallback,new RegExp(uid));state.actorRPC=()=>({data:{business_id:'foreign',quote_id:quote,actor_id:uid,label:'Foreign'}});const foreign=await fetch(detail,{headers:{Cookie}});assert.ok(foreign.status>=500);assert.doesNotMatch(await foreign.text(),/Foreign/);state.actorRPC=null;assert.match(html,/Acceptance recorded by the office/);assert.match(html,/&lt;script&gt;evidence&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>evidence/);assert.match(html,/data-picker="datetime"/);
 assert.equal((await post(detail,'action=convert&version=3&local_start=2026-02-30T09%3A00')).status,422);
 assert.equal((await post(detail,'action=convert&version=3&local_start=2026-10-20T09%3A00')).status,303);assert.equal(state.rpcCalls.at(-1).name,'convert_quote');assert.equal(state.rpcCalls.at(-1).params.p_quote_id,quote);assert.equal(state.rpcCalls.at(-1).params.p_business_id,bid);
 q.status='converted';q.version=4;q.converted_booking_id=booking;state.handoffs.push({id:handoff,business_id:bid,quote_id:quote,booking_id:booking});state.bookings.push({id:booking,business_id:bid,source_quote_id:quote,status:'draft'});
 html=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(html,/Awaiting invoicing/);assert.match(html,/Open booking/);assert.match(html,/No invoice number or payment/);assert.doesNotMatch(html,/name="action" value="convert"/);
 state.bookings.at(-1).status='cancelled';html=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(html,/Invoicing needs review/);assert.doesNotMatch(html,/Awaiting invoicing/);
 state.quoteRPC=()=>({error:{code:'40001',message:'Sensitive SQL detail'}});
 result=await post(detail,'action=convert&version=3&local_start=2026-10-20T10%3A00');assert.equal(result.status,409);assert.doesNotMatch(await result.text(),/Sensitive SQL detail/);
 const before=state.rpcCalls.length;
 assert.equal((await post(url,create,'https://foreign.invalid')).status,403);assert.equal((await post(url,create,base,'application/json')).status,415);assert.equal((await post(url,'x='.padEnd(65540,'x'))).status,413);
 assert.equal((await fetch(base+'/quotes?business=foreign&role=owner',{headers:{Cookie}})).status,403);assert.equal((await fetch(url+'&quote=bad',{headers:{Cookie}})).status,404);assert.equal(state.rpcCalls.length,before);
 state.handoffs.length=0;result=await fetch(detail,{headers:{Cookie}});assert.ok(result.status>=500);assert.doesNotMatch(await result.text(),/Awaiting invoicing/);
 state.active=false;assert.equal((await post(detail,'action=convert&version=3&local_start=2026-10-20T09%3A00')).status,403);
},{role}));

test('quote HTTP denies staff and anonymous reads and writes',async()=>run(async(base,state)=>{
 const url=base+'/quotes?business='+bid;
 assert.equal((await fetch(url,{redirect:'manual'})).status,303);
 const Cookie=await signIn(base);
 assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=create',redirect:'manual'})).status,403);
 assert.equal(state.rpcCalls.length,0);
 const html=await(await fetch(base+'/dashboard?business='+bid,{headers:{Cookie}})).text();assert.doesNotMatch(html,/href="\/quotes/);
},{role:'staff'}));

for(const role of ['owner','manager'])test(`module UI ${role} keeps business navigation, filtered lists and creation steps scoped`,async()=>run(async(base,state)=>{
 const customer='70000000-0000-4000-8000-000000000001',service='70000000-0000-4000-8000-000000000003';
 state.customers.push({id:customer,business_id:bid,name:'Ada Example',email:'ada@example.invalid',phone:'000',is_active:true,version:1});
 state.customers.push({id:'70000000-0000-4000-8000-000000000002',business_id:bid,name:'Other Customer',is_active:false,version:1});
 state.catalogue.push({id:service,business_id:bid,kind:'service',name:'Regular clean',price_cents:25000,pricing_model:'fixed',unit_label:'visit',is_active:true});
 state.bookings.push({id:'60000000-0000-4000-8000-000000000001',business_id:bid,local_start:'2026-10-21T09:00:00',time_zone:'UTC',status:'completed',assigned_staff:[],required_team_size:1,customer_snapshot:{name:'Ada Example'},address_snapshot:{address_line:'Example street'},price_lines:[{name:'Regular clean'}],total_cents:25000,version:1});
 state.bookings.push({...state.bookings[0],id:'60000000-0000-4000-8000-000000000002',status:'cancelled',customer_snapshot:{name:'Other Customer'}});
 const Cookie=await signIn(base),get=async path=>{const response=await fetch(base+path,{headers:{Cookie}});assert.equal(response.status,200);return response.text();};
 const bookings='/bookings?business='+bid,customers='/customers?business='+bid;
 let html=await get(bookings);assert.match(html,/href="\/bookings\?business=[^"]+" class="active" aria-current="page"/);assert.match(html,/href="\/catalogue\?business=/);assert.match(html,/Skip to content/);assert.doesNotMatch(html,/name="customer"/);assert.match(html,/create=1/);
 if(role==='manager')assert.doesNotMatch(html,/Business settings|Team access/);else assert.match(html,/Business settings/);
 html=await get(bookings+'&q=Ada&status=completed');assert.match(html,/<h2>Ada Example<\/h2>/);assert.doesNotMatch(html,/<h2>Other Customer<\/h2>/);assert.match(html,/1 of 2 bookings/);
 html=await get(bookings+'&q=%3Cscript%3E');assert.match(html,/value="&lt;script&gt;"/);assert.doesNotMatch(html,/<script>/);assert.match(html,/No matching bookings/);
 html=await get(bookings+'&create=1');assert.match(html,/<h1>New booking/);assert.match(html,/name="create" value="1"/);assert.match(html,/name="customer"/);assert.doesNotMatch(html,/record-list/);
 html=await get(bookings+'&create=1&customer='+customer+'&service_id='+service);assert.match(html,/Save draft booking/);assert.match(html,/name="customer_id" value="70000000-0000-4000-8000-000000000001"/);assert.match(html,/name="service_id" value="70000000-0000-4000-8000-000000000003"/);
 html=await get(customers);assert.doesNotMatch(html,/id="customer-editor"/);assert.match(html,/create=1/);
 html=await get(customers+'&q=ada&status=active');assert.match(html,/<h2>Ada Example<\/h2>/);assert.doesNotMatch(html,/<h2>Other Customer<\/h2>/);
 html=await get(customers+'&create=1');assert.match(html,/id="customer-editor"/);assert.doesNotMatch(html,/record-list/);assert.match(html,/action="\/customers\?business=/);
 assert.equal(state.bookings.length,2);assert.equal(state.bookings[0].version,1);assert.equal(state.customers.length,2);assert.equal(state.catalogueWrites,0);assert.equal(state.settingsWrites,0);
},{role}));

for(const role of ['owner','manager'])test(`invoice HTTP ${role} preserves source scope and exposes truthful configuration/holds`,async()=>run(async(base,state)=>{
 const booking='60000000-0000-4000-8000-000000000088',invoice='90000000-0000-4000-8000-000000000010';
 state.bookings.push({id:booking,business_id:bid,local_start:'2026-11-02T09:00:00',time_zone:'UTC',status:'draft',assigned_staff:[],required_team_size:1,customer_snapshot:{name:'Synthetic customer'},address_snapshot:{address_line:'Synthetic'},price_lines:[{name:'Service',quantity:1,rate_cents:100,total_cents:100,unit_label:'visit'}],total_cents:100});
 const Cookie=await signIn(base),url=base+'/invoices?business='+bid,post=(target,body,origin=base)=>fetch(target,{method:'POST',headers:{Cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});
 let response=await fetch(url,{headers:{Cookie}}),html=await response.text();assert.equal(response.status,200);assert.match(html,/Internal draft total/);assert.match(html,/Verified Zoho draft total/);assert.match(html,/No invoices yet/);
 html=await(await fetch(url+'&booking='+booking,{headers:{Cookie}})).text();assert.match(html,/Prepare draft invoice/);assert.match(html,/does not send an invoice/);
 response=await post(url+'&booking='+booking,'action=prepare&business_id=forged');assert.equal(response.status,303);assert.match(response.headers.get('location'),new RegExp(invoice));assert.equal(state.rpcCalls.at(-1).params.p_business_id,bid);assert.equal(state.rpcCalls.at(-1).params.p_booking_id,booking);
 const snapshot={customer_snapshot:{name:'Synthetic <customer>'},address_snapshot:{address_line:'Synthetic'},price_lines:state.bookings[0].price_lines,local_start:'2026-11-02T09:00:00',time_zone:'UTC'};
 const i={id:invoice,business_id:bid,booking_id:booking,total_cents:100,currency:'ZAR',snapshot,document_status:'draft',sync_status:'not_synced',booking:{status:'draft'}};state.invoices.push(i);
 response=await fetch(url+'&booking='+booking,{headers:{Cookie},redirect:'manual'});assert.equal(response.status,303);assert.match(response.headers.get('location'),new RegExp(invoice));
 const detail=url+'&invoice='+invoice;html=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(html,/Synthetic &lt;customer&gt;/);assert.match(html,/server accounting worker is not configured/);assert.doesNotMatch(html,/name="action" value="sync"/);
 response=await post(detail,'action=sync&external_customer_id=123');assert.equal(response.status,503);assert.match(await response.text(),/internal draft/);
 state.bookings[0].status='cancelled';html=await(await fetch(detail,{headers:{Cookie}})).text();assert.match(html,/Accounting needs review/);assert.match(html,/linked booking is cancelled/);assert.equal((await post(detail,'action=sync&external_customer_id=123')).status,422);
 html=await(await fetch(url+'&settings=1',{headers:{Cookie}})).text();const config='action=configure&version=0&organization_id=123&api_domain=https%3A%2F%2Fwww.zohoapis.com&credential_key=SYNTHETIC_TEST&enabled=yes&staging_confirmed=yes';
 if(role==='owner'){assert.match(html,/name="credential_key"/);assert.equal((await post(url+'&settings=1',config)).status,303);assert.equal(state.rpcCalls.at(-1).name,'configure_accounting');assert.equal((await post(url+'&settings=1',config.replace('&staging_confirmed=yes',''))).status,422);}else{assert.doesNotMatch(html,/name="credential_key"/);assert.equal((await post(url+'&settings=1',config)).status,403);}
 assert.equal((await post(detail,'action=sync&external_customer_id=123','https://foreign.invalid')).status,403);assert.equal((await post(detail,'x='.padEnd(8200,'x'))).status,413);
 assert.equal((await fetch(base+'/invoices?business=foreign',{headers:{Cookie}})).status,403);assert.equal((await fetch(url+'&invoice=bad',{headers:{Cookie}})).status,404);assert.equal((await fetch(detail+'&booking='+booking,{headers:{Cookie}})).status,400);
 state.active=false;assert.equal((await fetch(detail,{headers:{Cookie}})).status,403);
},{role}));
test('invoice HTTP rejects staff and anonymous access without leaking financial drafts',async()=>run(async(base,state)=>{
 const url=base+'/invoices?business='+bid;assert.equal((await fetch(url,{redirect:'manual'})).status,303);const Cookie=await signIn(base);assert.equal((await fetch(url,{headers:{Cookie}})).status,403);assert.equal((await fetch(url,{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=prepare'})).status,403);assert.equal(state.rpcCalls.length,0);
},{role:'staff'}));

test('earnings owner setup and read-only preview enforce membership, origin, scope and saved version',async()=>run(async(base,state)=>{
 const svc='20000000-0000-4000-8000-000000000001';state.catalogue.push({id:svc,business_id:bid,kind:'service',name:'Standard',cleaning_profile:'regular',version:1,is_active:true});
 const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=qa%40example.test&password=test-password',redirect:'manual'}),Cookie=login.headers.get('set-cookie').split(';')[0];
 const url=base+'/earnings-rules?business='+bid+'&service='+svc,headers={Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'};
 const post=(data,extra={})=>fetch(url,{method:'POST',headers:{...headers,...extra},body:new URLSearchParams(data).toString(),redirect:'manual'});
 assert.equal((await fetch(url,{headers:{Cookie}})).status,200);
 const setup={action:'save',model:'percentage_pool',percentage:'70',cap:'300',max_minutes:'480',basis_definition:'Synthetic labour only',allocation:'equal',rounding:'half_up',business_id:'foreign'};
 assert.equal((await post(setup)).status,303);assert.equal(state.earnings.length,1);assert.equal(state.earnings[0].business_id,bid);assert.equal(state.earnings[0].cap_cents,30000);
 const p=await post({action:'preview',eligible:'1000',cleaners:'2',duration:'180',cap:'999999',percentage:'100'});assert.equal(p.status,200);const html=await p.text();assert.equal((html.match(/R\s?300,00/g)??[]).length>=2,true);assert.equal(state.earnings.length,1);
 assert.equal((await post({action:'preview',eligible:'1000',cleaners:'2',duration:'481'})).status,422);
 assert.equal((await post({...setup,version:'99'})).status,409);assert.equal(state.earnings[0].version,1);
 assert.equal((await post(setup,{Origin:'https://foreign.invalid'})).status,403);
 state.role='manager';const read=await fetch(url,{headers:{Cookie}});assert.equal(read.status,200);assert.doesNotMatch(await read.text(),/name="action" value="save"/);
 assert.equal((await post({...setup,version:'1'})).status,403);assert.equal((await post({action:'preview',eligible:'400',cleaners:'1',duration:'180'})).status,200);
 assert.equal((await fetch(base+'/earnings-rules?business=foreign',{headers:{Cookie}})).status,403);
 state.role='staff';assert.equal((await fetch(url,{headers:{Cookie}})).status,403);assert.equal((await post({action:'preview',eligible:'400',cleaners:'1',duration:'180'})).status,403);
 state.role='owner';state.active=false;assert.equal((await fetch(url,{headers:{Cookie}})).status,403);
 assert.equal((await fetch(url,{redirect:'manual'})).status,303);
},{role:'owner'}));

test('restore workspace rejects earnings setup writes before business access',async()=>run(async(base)=>{
 const response=await fetch(base+'/earnings-rules?business='+bid,{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'action=save',redirect:'manual'});assert.equal(response.status,405);
},{role:'owner',restoreTest:true}));

test('approved suggestions are limited to the explicitly mapped business and do not save on GET',async()=>{
 const template={services:{regular:{model:'percentage_pool',cap_cents:30000}}};
 for(const [mapped,expected] of [[bid,true],['10000000-0000-4000-8000-000000000002',false]])await run(async(base,state)=>{
  const svc='20000000-0000-4000-8000-000000000001';state.catalogue.push({id:svc,business_id:bid,kind:'service',name:'Regular',cleaning_profile:'regular',version:1,is_active:true});
  const Cookie=await signIn(base),html=await(await fetch(base+'/earnings-rules?business='+bid+'&service='+svc,{headers:{Cookie}})).text();
  assert.equal(html.includes('name="cap" type="text" value="300.00"'),expected);assert.equal(state.earnings.length,0);assert.doesNotMatch(html,/value="70"/);
 },{role:'owner',earningsTemplates:{[mapped]:template}});
});
