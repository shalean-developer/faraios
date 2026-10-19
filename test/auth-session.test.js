import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthSessions} from '../src/auth-session.js';
const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001';
test('real-auth session contract revalidates memberships and logout',async()=>{
  let clock=1000,active=true,loggedOut=false;
  const query={select(){return this;},eq(key){return key==='status'?Promise.resolve({data:active?[{user_id:uid,business_id:bid,role:'manager',status:'active'}]:[],error:null}):this;}};
  const client={auth:{signInWithPassword:async()=>({data:{session:{expires_at:4000}},error:null}),getUser:async()=>({data:{user:{id:uid}},error:null}),signOut:async options=>{assert.equal(options.scope,'local');loggedOut=true;return {}; }},from:table=>table==='businesses'?{select(){return this;},eq:async()=>({data:[{id:bid,name:'Synthetic business'}]})}:query};
  const auth=createAuthSessions({createClient:()=>client,now:()=>clock});
  const {id}=await auth.login('test@example.invalid','synthetic-password');assert.equal((await auth.read(id)).memberships.length,1);
  active=false;assert.equal((await auth.read(id)).memberships.length,0);
  await auth.logout(id);assert.equal(loggedOut,true);assert.equal(await auth.read(id),null);
  const second=await auth.login('test@example.invalid','synthetic-password');clock+=1800001;assert.equal(await auth.read(second.id),null);
});
test('failed sign-in never creates a usable session',async()=>{
  const auth=createAuthSessions({createClient:()=>({auth:{signInWithPassword:async()=>({error:new Error('bad credentials')})}})});
  await assert.rejects(auth.login('test@example.invalid','bad'),/Unable/);
  assert.equal(await auth.read('fabricated-token'),null);
});
