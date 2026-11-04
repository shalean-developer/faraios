// T31 full application-flow rehearsal with a disconnected, stateful Supabase/Auth adapter.
// No provider network, staged DB, real email, privileged support action or payment execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createStagingServer} from '../src/staging-server.js';

function syntheticBackend(){
 const users=new Map(),businesses=[],members=[],settings=[],brands=[],catalogue=[],invites=new Map(),retries=new Map();
 const calls=[];
 const rows=table=>({businesses,business_memberships:members,business_settings:settings,
  t31_business_branding:brands,business_catalogue:catalogue,business_vat_settings:[]}[table]??[]);
 const active=(user,businessId,role)=>members.some(m=>m.user_id===user?.id&&m.business_id===businessId&&m.status==='active'&&(!role||m.role===role));
 const query=(table,user)=>{
  let filters=[],mode='read',value;
  const filtered=()=>rows(table).filter(row=>filters.every(([k,v])=>row[k]===v)).filter(row=>{
   if(table==='businesses')return active(user,row.id);
   if(table==='business_memberships')return row.user_id===user?.id&&row.status==='active';
   if(table==='business_catalogue'||table==='business_settings'||table==='t31_business_branding')return active(user,row.business_id,'owner');
   return true;
  });
  const result=async()=>{
   if(mode==='read')return {data:filtered(),error:null};
   const id=value.business_id;
   if(!active(user,id,'owner'))return {data:null,error:{code:'42501'}};
   if(mode==='insert'){
    if(table!=='business_catalogue')return {data:null,error:{code:'42501'}};
    const row={...value,id:randomUUID(),version:1};catalogue.push(row);
    return {data:[{id:row.id}],error:null};
   }
   if(mode==='upsert'){
    const old=rows(table).find(x=>x.business_id===id);
    if(old)Object.assign(old,value);else rows(table).push({...value,version:1});
    return {data:[{business_id:id}],error:null};
   }
   return {data:null,error:{code:'42501'}};
  };
  const q={select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},
   range:async(start,end)=>{const r=await result();return {...r,data:r.data?.slice(start,end+1)};},
   maybeSingle:async()=>{const r=await result();return {...r,data:r.data?.[0]??null};},
   upsert(v){mode='upsert';value=v;return this;},
   insert(v){mode='insert';value=v;return this;},
   then(resolve,reject){return result().then(resolve,reject)}
  };
  return q;
 };
 const createClient=()=>{
  let user=null;
  return {
   auth:{
    signUp:async({email,password})=>{
     calls.push('synthetic.signup');
     if(users.has(email))return {data:{user:null,session:null},error:{message:'existing'}};
     users.set(email,{id:randomUUID(),email,password,verified:false});
     return {data:{user:{email},session:null},error:null};
    },
    signInWithPassword:async({email,password})=>{
     calls.push('synthetic.login');
     const account=users.get(email);
     if(!account||!account.verified||account.password!==password)return {error:{message:'email confirmation required'}};
     user=account;
     return {data:{session:{expires_at:Math.floor(Date.now()/1000)+1800}},error:null};
    },
    getUser:async()=>user?.verified?{data:{user:{id:user.id,email:user.email}}}:{error:{message:'unauthenticated'}},
    signOut:async()=>{user=null;return {error:null};}
   },
   from:table=>query(table,user),
   rpc:async(name,p)=>{
    calls.push(name);
    if(!user||!user.verified)return {error:{code:'28000'}};
    if(name==='t31_provision_business'){
     if(typeof p.p_name!=='string'||!p.p_name.trim()||!p.p_request_id)return {error:{code:'22023'}};
     const key=user.id+':'+p.p_request_id;
     const old=retries.get(key);
     if(old)return old.name===p.p_name?{data:old.id,error:null}:{error:{code:'23505'}};
     const id=randomUUID();businesses.push({id,name:p.p_name,status:'active',industry:'cleaning'});
     members.push({business_id:id,user_id:user.id,role:'owner',status:'active'});
     retries.set(key,{id,name:p.p_name});return {data:id,error:null};
    }
    if(name==='t31_invite_staff'){
     if(!active(user,p.p_business,'owner')||!['manager','staff'].includes(p.p_role))return {error:{code:'42501'}};
     const token=randomUUID();
     invites.set(token,{businessId:p.p_business,email:p.p_email,role:p.p_role,acceptedBy:null});
     return {data:token,error:null};
    }
    if(name==='t31_accept_invite'){
     const record=invites.get(p.p_token);
     if(!record||record.email!==user.email||!user.verified)return {error:{code:'42501'}};
     if(record.acceptedBy===user.id){
      return active(user,record.businessId,record.role)?{data:record.businessId}:{error:{code:'42501'}};
     }
     if(record.acceptedBy||members.some(m=>m.user_id===user.id&&m.business_id===record.businessId))return {error:{code:'42501'}};
     members.push({business_id:record.businessId,user_id:user.id,status:'active',role:record.role});
     record.acceptedBy=user.id;return {data:record.businessId,error:null};
    }
    if(name==='t31_staff_members'){
     if(!active(user,p.p_business,'owner'))return {error:{code:'42501'}};
     return {data:members.filter(m=>m.business_id===p.p_business).map(({user_id,role,status})=>({user_id,role,status})),error:null};
    }
    if(name==='t31_suspend_member'){
     if(!active(user,p.p_business,'owner'))return {error:{code:'42501'}};
     const m=members.find(m=>m.business_id===p.p_business&&m.user_id===p.p_user&&m.status==='active'&&m.role!=='owner');
     if(!m)return {error:{code:'42501'}};
     m.status='suspended';return {data:true,error:null};
    }
    return {error:{code:'42501'}};
   }
  };
 };
 return {createClient,users,businesses,members,settings,brands,catalogue,invites,calls};
}
async function serve(factory,work){
 const server=createStagingServer({createClient:factory,ownerRegistrationEnabled:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const request=async(path,{cookie='',data=null,method=data?'POST':'GET'}={})=>{
  const headers={};if(cookie)headers.Cookie=cookie;
  if(data){headers.Origin=url;headers['Content-Type']='application/x-www-form-urlencoded';}
  return fetch(url+path,{method,headers,body:data?new URLSearchParams(data):undefined,redirect:'manual'});
 };
 try{await work({request,url});}finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
test('T31 disconnected full third-cleaning-company journey and forbidden tenant access',{timeout:45000},async()=>{
 const b=syntheticBackend(),pwd='a-very-long-synthetic-password-2026';
 await serve(b.createClient,async({request})=>{
  const register=async email=>{
   const r=await request('/register',{data:{email,password:pwd}});
   assert.equal(r.status,200);
   assert.match(await r.text(),/check your email/);
  };
  const login=async email=>{
   const r=await request('/login',{data:{email,password:pwd}});
   assert.equal(r.status,303);
   const cookie=r.headers.get('set-cookie')?.split(';')[0];
   assert.match(cookie??'',/faraios_staging=/);
   return cookie;
  };
  await register('third-owner@example.invalid');
  assert.equal((await request('/login',{data:{email:'third-owner@example.invalid',password:pwd}})).status,401,'unconfirmed email cannot sign in');
  b.users.get('third-owner@example.invalid').verified=true; // synthetic confirmation event, not an email send
  const owner=await login('third-owner@example.invalid');
  assert.equal((await request('/business/new')).status,303,'business creation requires sign-in');
  const form=await request('/business/new',{cookie:owner});
  assert.equal(form.status,200);
  const key=(await form.text()).match(/name="request_id" value="([^"]+)"/)?.[1];
  assert.match(key??'',/^[a-f0-9-]{36}$/);
  const payload={name:'Third Independent Cleaning',request_id:key};
  const created=await request('/business/new',{cookie:owner,data:payload});
  assert.equal(created.status,303);
  const id=new URL(created.headers.get('location'),'http://localhost').searchParams.get('business');
  assert.match(id??'',/^[a-f0-9-]{36}$/);
  assert.equal((await request('/business/new',{cookie:owner,data:payload})).status,303);
  assert.equal(b.businesses.length,1,'duplicate POST must not create a second tenant');
  assert.equal(b.members.length,1,'owner membership is created exactly once');
  const ownDashboard=await request('/dashboard?business='+id,{cookie:owner});
  assert.equal(ownDashboard.status,200);
  assert.match(await ownDashboard.text(),/Third Independent Cleaning/);
  const foreign=randomUUID();
  assert.equal((await request('/dashboard?business='+foreign,{cookie:owner})).status,403);
  assert.equal((await request('/onboarding?business='+foreign,{cookie:owner})).status,403);
  const progress=await request('/onboarding?business='+id,{cookie:owner});
  assert.equal(progress.status,200);
  assert.match(await progress.text(),/0 of 5/);
  const settings={display_name:'Third Independent Cleaning',contact_email:'office@example.invalid',contact_phone:'0215551234',
   service_areas:'Cape Town\nStellenbosch',working_days:'1',opens_at:'08:00',closes_at:'17:00',time_zone:'Africa/Johannesburg'};
  const settingsSave=await request('/settings?business='+id,{cookie:owner,data:settings});
  assert.equal(settingsSave.status,303,'owner may configure operating profile');
  assert.equal(b.settings[0].business_id,id);
  const brand=await request('/branding?business='+id,{cookie:owner,data:{accent_color:'#146C94',logo_url:''}});
  assert.equal(brand.status,303);
  assert.equal(b.brands[0].business_id,id);
  const service={kind:'service',name:'Standard cleaning',description:'Synthetic service',pricing_model:'fixed',price:'500.00',
   unit_label:'visit',team_size:'1',status:'active'};
  const serviceSave=await request('/catalogue?business='+id,{cookie:owner,data:service});
  assert.equal(serviceSave.status,303);
  assert.equal(b.catalogue[0].price_cents,50000);
  const extraSave=await request('/catalogue?business='+id,{cookie:owner,data:{
   kind:'extra',name:'Inside oven',description:'Synthetic extra',pricing_model:'fixed',price:'75.00',unit_label:'extra',status:'active'
  }});
  assert.equal(extraSave.status,303);
  assert.equal(b.catalogue.length,2);
  assert.equal(b.catalogue.find(x=>x.kind==='extra')?.price_cents,7500);
  const configured=await request('/onboarding?business='+id,{cookie:owner});
  assert.equal(configured.status,200);
  assert.match(await configured.text(),/5 of 5/);
  assert.equal((await request('/branding?business='+foreign,{cookie:owner})).status,403);
  assert.equal((await request('/team-members?business='+foreign,{cookie:owner})).status,403);
  // A separate company starts empty and cannot inherit another tenant's catalogue or profile.
  await register('fourth-owner@example.invalid');
  b.users.get('fourth-owner@example.invalid').verified=true;
  const fourth=await login('fourth-owner@example.invalid');
  const fourthForm=await request('/business/new',{cookie:fourth});
  const fourthKey=(await fourthForm.text()).match(/name="request_id" value="([^"]+)"/)?.[1];
  assert.match(fourthKey??'',/^[a-f0-9-]{36}$/);
  const fourthCreated=await request('/business/new',{cookie:fourth,data:{name:'Fourth Independent Cleaning',request_id:fourthKey}});
  assert.equal(fourthCreated.status,303);
  const fourthId=new URL(fourthCreated.headers.get('location'),'http://localhost').searchParams.get('business');
  assert.notEqual(fourthId,id);
  assert.equal((await request('/dashboard?business='+fourthId,{cookie:owner})).status,403);
  assert.equal((await request('/dashboard?business='+id,{cookie:fourth})).status,403);
  assert.equal((await request('/settings?business='+id,{cookie:fourth})).status,403);
  assert.equal((await request('/branding?business='+id,{cookie:fourth})).status,403);
  assert.equal((await request('/catalogue?business='+id,{cookie:fourth})).status,403);
  assert.equal((await request('/onboarding?business='+fourthId,{cookie:fourth})).status,200);
  assert.equal(b.settings.some(x=>x.business_id===fourthId),false);
  assert.equal(b.brands.some(x=>x.business_id===fourthId),false);
  assert.equal(b.catalogue.some(x=>x.business_id===fourthId),false);
  await register('third-cleaner@example.invalid');
  b.users.get('third-cleaner@example.invalid').verified=true;
  const cleaner=await login('third-cleaner@example.invalid');
  assert.equal((await request('/dashboard?business='+id,{cookie:cleaner})).status,403);
  assert.equal((await request('/team-invite?business='+id,{cookie:cleaner})).status,403);
  const invite=await request('/team-invite?business='+id,{cookie:owner,data:{email:'third-cleaner@example.invalid',role:'staff'}});
  assert.equal(invite.status,200);
  const token=(await invite.text()).match(/<code>([a-f0-9-]{36})<\/code>/)?.[1];
  assert.match(token??'',/^[a-f0-9-]{36}$/);
  assert.equal((await request('/accept-invite',{cookie:owner,data:{token}})).status,422,'wrong recipient denied');
  const accepted=await request('/accept-invite',{cookie:cleaner,data:{token}});
  assert.equal(accepted.status,303);
  assert.equal((await request('/dashboard?business='+id,{cookie:cleaner})).status,200);
  assert.equal((await request('/branding?business='+id,{cookie:cleaner})).status,403);
  assert.equal((await request('/team-members?business='+id,{cookie:cleaner})).status,403);
  assert.equal((await request('/team-invite?business='+id,{cookie:cleaner,data:{email:'other@example.invalid',role:'owner'}})).status,403);
  // Manager invitation uses an independent verified identity, never an owner grant.
  await register('third-manager@example.invalid');
  b.users.get('third-manager@example.invalid').verified=true;
  const manager=await login('third-manager@example.invalid');
  const managerInvite=await request('/team-invite?business='+id,{cookie:owner,data:{email:'third-manager@example.invalid',role:'manager'}});
  assert.equal(managerInvite.status,200);
  const managerToken=(await managerInvite.text()).match(/<code>([a-f0-9-]{36})<\/code>/)?.[1];
  assert.match(managerToken??'',/^[a-f0-9-]{36}$/);
  assert.equal((await request('/accept-invite',{cookie:manager,data:{token:managerToken}})).status,303);
  assert.equal((await request('/dashboard?business='+id,{cookie:manager})).status,200);
  assert.equal((await request('/branding?business='+id,{cookie:manager})).status,403);
  assert.equal((await request('/team-invite?business='+id,{cookie:manager})).status,403);
  assert.equal((await request('/team-members?business='+id,{cookie:manager})).status,403);
  assert.equal(b.members.find(m=>m.user_id===b.users.get('third-manager@example.invalid').id)?.role,'manager');
  const member=b.members.find(m=>m.user_id===b.users.get('third-cleaner@example.invalid').id);
  assert.equal(member.role,'staff');
  const suspension=await request('/team-members?business='+id,{cookie:owner,data:{user:member.user_id}});
  assert.equal(suspension.status,303);
  assert.equal((await request('/dashboard?business='+id,{cookie:cleaner})).status,403);
  assert.equal((await request('/accept-invite',{cookie:cleaner,data:{token}})).status,422,'suspended token must not restore access');
  assert.equal(b.businesses.length,2);
  assert.equal(b.calls.filter(x=>x==='t31_provision_business').length,3);
  assert.equal(b.calls.every(x=>!/(email|send|payment|zoho|external)/i.test(x)),true,'no outbound provider actions');
 });
 console.log('T31_SYNTHETIC_HTTP_FULL_ONBOARDING_PASS');
});
