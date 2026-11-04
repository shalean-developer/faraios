import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionBusiness,validateBusinessProvisioning} from '../src/t31-provisioning.js';
const uid='00000000-0000-4000-8000-000000000001';
const bid='10000000-0000-4000-8000-000000000001';
const requestId='20000000-0000-4000-8000-000000000001';
const ok={name:'Independent Cleaning Company',requestId};
test('T31 validates business name and retry identifier before any RPC',()=>{
 assert.deepEqual(validateBusinessProvisioning(ok),ok);
 for(const name of ['', ' bad','bad ','x'.repeat(161),'bad\nname'])assert.throws(()=>validateBusinessProvisioning({...ok,name}));
 assert.throws(()=>validateBusinessProvisioning({...ok,requestId:'forged'}));
});
test('T31 requires authenticated non-anonymous owner identity',async()=>{
 let touched=false;
 const client={auth:{getUser:async()=>({data:{user:null}})},rpc:async()=>{touched=true;}};
 await assert.rejects(provisionBusiness(client,ok),/Sign in/);assert.equal(touched,false);
});
test('T31 uses only validated inputs and verifies exact server owner membership',async()=>{
 let args,where=[];
 const query={select(){return this;},eq(k,v){where.push([k,v]);return this;},then(resolve){return Promise.resolve({data:[{business_id:bid,user_id:uid,role:'owner',status:'active'}],error:null}).then(resolve)}};
 const client={auth:{getUser:async()=>({data:{user:{id:uid}}})},rpc:async(name,input)=>{args=[name,input];return {data:bid,error:null}},from:table=>{assert.equal(table,'business_memberships');return query}};
 assert.deepEqual(await provisionBusiness(client,ok),{businessId:bid});
 assert.deepEqual(args,['t31_provision_business',{p_name:ok.name,p_request_id:requestId}]);
 assert.deepEqual(where,[['business_id',bid],['user_id',uid],['status','active']]);
});
test('T31 denies forged RPC ownership and errors without leaking database details',async()=>{
 const query={select(){return this;},eq(){return this;},then(resolve){return Promise.resolve({data:[{business_id:bid,user_id:uid,role:'staff'}],error:null}).then(resolve)}};
 const client={auth:{getUser:async()=>({data:{user:{id:uid}}})},rpc:async()=>({data:bid}),from:()=>query};
 await assert.rejects(provisionBusiness(client,ok),/ownership verification unavailable/);
 client.rpc=async()=>({data:null,error:{message:'sensitive SQL error'}});
 await assert.rejects(provisionBusiness(client,ok),e=>e.message.includes('retry with the same')&&!e.message.includes('sensitive'));
});
