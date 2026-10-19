import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIdentity} from '../src/identity.js';
const userId='00000000-0000-4000-8000-000000000001';
const businessId='10000000-0000-4000-8000-000000000001';
function client({authError=null,user={id:userId,user_metadata:{role:'owner'}},data=[{business_id:businessId,user_id:userId,role:'manager',status:'active'}],error=null}={}){
  const query={select(columns){assert.equal(columns,'business_id,user_id,role,status');return this;},eq(key,value){if(key==='user_id')assert.equal(value,userId);if(key==='status'){assert.equal(value,'active');return Promise.resolve({data,error});}return this;}};
  return {auth:{getUser:async()=>({data:{user},error:authError})},from:table=>{assert.equal(table,'business_memberships');return query;}};
}
test('verified identity uses database role, ignoring editable metadata',async()=>{
  const identity=await resolveIdentity(client());assert.equal(identity.memberships[0].role,'manager');assert.deepEqual(identity.businessIds,[businessId]);
});
test('invalid and revoked auth fails before membership reads',async()=>{
  for(const options of [{authError:new Error('revoked')},{user:null},{user:{id:'bad'}}])await assert.rejects(resolveIdentity(client(options)),/Unauthenticated/);
});
test('membership failures never fall back to owner or demo role',async()=>{
  await assert.rejects(resolveIdentity(client({error:new Error('offline')})),/unavailable/);
  assert.deepEqual((await resolveIdentity(client({data:[]}))).businessIds,[]);
  for(const patch of [{user_id:'other'},{business_id:'bad'},{role:'owner_from_metadata'},{status:'suspended'}])await assert.rejects(resolveIdentity(client({data:[{business_id:businessId,user_id:userId,role:'manager',status:'active',...patch}]})),/Invalid membership/);
});
