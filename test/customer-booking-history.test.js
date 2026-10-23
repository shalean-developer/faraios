import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {readCustomerBookingHistory,renderCustomerBookingHistory} from '../src/customer-booking-history.js';
import {createStagingServer} from '../src/staging-server.js';

const id=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),managerA=id(2),managerB=id(3),staff=id(4),outsider=id(5),a=id(10),b=id(20);

test('history fails closed on errors and mismatched rows; rendering escapes snapshots and labels limits',async()=>{
 const client=result=>({from:()=>({select(){return this;},eq(){return this;},order(){return this;},limit:async()=>result})});
 for(const result of [{error:{message:'private database detail'}},{data:null},{data:[{business_id:b,customer_id:id(11)}]},{data:[{business_id:a,customer_id:id(21)}]}])await assert.rejects(readCustomerBookingHistory(client(result),a,id(11)),/Booking history unavailable/);
 await assert.rejects(readCustomerBookingHistory(client({data:[]}),a,'bad'),/unavailable/);
 const html=renderCustomerBookingHistory({id:a},{hasMore:true,bookings:[{id:id(30),price_lines:[{name:'<script>unsafe</script>'}],status:'completed',local_start:'2026-10-23T09:00',time_zone:'<bad>'}]});
 assert.doesNotMatch(html,/<script>|<bad>/);assert.match(html,/latest 200 scheduled visits/);assert.match(html,/Completed/);assert.match(html,/business=.*&amp;booking=/);
 assert.match(renderCustomerBookingHistory({id:a},{bookings:[],hasMore:false}),/No bookings for this customer/);
});

test('synthetic Shalean/Bokkie lifecycle and customer history enforce real PostgreSQL RLS through local HTTP',async()=>{
 const db=new PGlite();let server;
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
  for(const name of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));
  for(const user of [owner,managerA,managerB,staff,outsider])await db.query('insert into auth.users values($1,$2)',[user,user+'@example.test']);
  await db.query("insert into public.businesses(id,name,industry) values($1,'Synthetic Shalean','cleaning'),($2,'Synthetic Bokkie','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($1,$4,'manager'),($2,$5,'manager'),($1,$6,'staff'),($2,$6,'staff')",[a,b,owner,managerA,managerB,staff]);
  const asUser=async(user,fn)=>{
   await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
   try{return await fn();}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}
  };
  const create=async(business,n)=>(await db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,gen_random_uuid(),$2,$3,'2026-10-23 09:00',120,$4) returning *",[business,id(n+1),id(n+2),JSON.stringify([{catalogue_id:id(n+3),quantity:1}])])).rows[0];
  const bookings=[];
  for(const [business,n,user] of [[a,10,managerA],[b,20,managerB]])await asUser(owner,async()=>{
   await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business]);
   await db.query("insert into public.business_customers(id,business_id,name) values($1,$2,'Same customer name')",[id(n+1),business]);
   await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Synthetic street')",[id(n+2),business,id(n+1)]);
   await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service',$3,'fixed','visit',10000,'ZAR',1,true)",[id(n+3),business,'Synthetic service '+n]);
  });
  for(const [business,n,user] of [[a,10,managerA],[b,20,managerB]])await asUser(user,async()=>{
   const booking=await create(business,n);bookings.push(booking);
   for(const status of ['confirmed','assigned','en_route','arrived','in_progress','completed'])await db.query("update public.one_off_bookings set status=$2,assigned_staff=case when $2='assigned' then $3::uuid[] else assigned_staff end,change_reason='Synthetic acceptance' where id=$1",[booking.id,status,[staff]]);
   assert.equal((await db.query('select status from public.one_off_bookings where id=$1',[booking.id])).rows[0].status,'completed');
   assert.equal((await db.query('select id from public.one_off_bookings where business_id<>$1',[business])).rows.length,0);
   await assert.rejects(create(business===a?b:a,business===a?20:10),/Booking access denied/);
  });
  // A second same-name customer in A owns 201 visits: these must not consume the first customer's limit.
  await asUser(owner,async()=>{
   await db.query("insert into public.business_customers(id,business_id,name) values($1,$2,'Same customer name'),($3,$2,'Empty customer')",[id(31),a,id(41)]);
   await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Other synthetic street')",[id(32),a,id(31)]);
   await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Other customer service','fixed','visit',10000,'ZAR',1,true)",[id(33),a]);
   for(let i=0;i<201;i++)await create(a,30);
   await db.query('update public.business_customers set is_active=false where id=$1',[id(11)]);
  });

  // A small test-only query adapter runs the application's read queries against actual RLS.
  // Auth is synthetic; this is not hosted Supabase Auth or PostgREST acceptance.
  let failHistory=false;
  const clientFor=user=>({auth:{
   signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),
   getUser:async()=>({data:{user:{id:user}}}),signOut:async()=>({})
  },from(table){
   assert.ok(['business_memberships','businesses','business_customers','customer_addresses','one_off_bookings'].includes(table));
   let columns='*',filters=[],orders=[],limit;
   const execute=async single=>{
    if(failHistory&&table==='one_off_bookings')return {error:{message:'synthetic query failure'}};
    const safe=s=>{assert.match(s,/^[a-z_]+$/);return s;};
    const projection=columns.split(',').map(safe).join(',');
    const sql=`select ${projection} from public.${table}${filters.length?' where '+filters.map(([k],i)=>safe(k)+'=$'+(i+1)).join(' and '):''}${orders.length?' order by '+orders.join(','):''}${limit===undefined?'':' limit '+limit}`;
    const rows=(await asUser(user,()=>db.query(sql,filters.map(([,v])=>v)))).rows.map(r=>({...r,...(r.local_start instanceof Date?{local_start:r.local_start.toISOString().slice(0,16)}:{})}));
    return {data:single?rows[0]??null:rows};
   };
   return {select(v){columns=v;return this;},eq(k,v){filters.push([k,v]);return this;},order(k,{ascending=true}={}){orders.push(k+(ascending?' asc':' desc'));return this;},limit(n){assert.ok(Number.isSafeInteger(n)&&n>0);limit=n;return execute(false);},maybeSingle(){return execute(true);},then(resolve,reject){return execute(false).then(resolve,reject);}};
  }});
  let nextUser=owner;
  server=createStagingServer({createClient:()=>clientFor(nextUser)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const login=async user=>{nextUser=user;const res=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=synthetic%40example.test&password=synthetic',redirect:'manual'});assert.equal(res.status,303);return res.headers.get('set-cookie').split(';')[0];};
  const path=(business,customer)=>'/customers?business='+business+'&customer='+customer;
  const get=(p,Cookie)=>fetch(base+p,{headers:Cookie?{Cookie}:{},redirect:'manual'});
  const before=(await db.query('select count(*)::int as n from audit.events')).rows[0].n;
  const ownerCookie=await login(owner);
  for(const [business,n,booking] of [[a,10,bookings[0]],[b,20,bookings[1]]]){
   const response=await get(path(business,id(n+1)),ownerCookie);assert.equal(response.status,200);const html=await response.text();
   assert.match(html,/Booking history/);assert.match(html,/Completed/);assert.ok(html.includes('booking='+booking.id));assert.ok(!html.includes('booking='+bookings.find(x=>x.id!==booking.id).id));assert.doesNotMatch(html,/Other customer service/);
  }
  const many=await readCustomerBookingHistory(clientFor(owner),a,id(31));assert.equal(many.bookings.length,200);assert.equal(many.hasMore,true);
  assert.deepEqual(many.bookings.map(x=>x.id),[...many.bookings.map(x=>x.id)].sort().reverse());
  assert.match(await (await get(path(a,id(31)),ownerCookie)).text(),/Older visits are not shown/);
  assert.match(await (await get(path(a,id(41)),ownerCookie)).text(),/No bookings for this customer/);
  assert.equal((await get(path(a,id(21)),ownerCookie)).status,404);
  for(const [user,business,other,n] of [[managerA,a,b,10],[managerB,b,a,20]]){
   const cookie=await login(user);assert.equal((await get(path(business,id(n+1)),cookie)).status,200);
   assert.equal((await get(path(other,id(other===a?11:21))+'&role=owner',cookie)).status,403);
  }
  for(const user of [staff,outsider]){
   const cookie=await login(user);assert.equal((await get(path(a,id(11))+'&role=owner',cookie)).status,403);
   assert.equal((await asUser(user,()=>db.query('select id from public.one_off_bookings'))).rows.length,0);
  }
  assert.equal((await get(path(a,id(11)))).status,303);
  await db.exec('set role anon');await assert.rejects(db.query('select id from public.one_off_bookings'),/permission denied/);await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from audit.events')).rows[0].n,before,'history GETs do not write audit records');
  const suspendedCookie=await login(managerA);await db.query("update public.business_memberships set status='suspended' where user_id=$1",[managerA]);
  const afterSuspension=(await db.query('select count(*)::int as n from audit.events')).rows[0].n;
  assert.equal((await get(path(a,id(11)),suspendedCookie)).status,403);
  failHistory=true;assert.equal((await get(path(a,id(11)),ownerCookie)).status,503);
  assert.equal((await db.query('select count(*)::int as n from audit.events')).rows[0].n,afterSuspension,'denied/failed history GETs do not write audit records');
 }finally{if(server)await new Promise(r=>server.close(r));await db.close();}
});
