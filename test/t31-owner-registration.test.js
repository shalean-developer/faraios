import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOwnerRegistration,registerOwner} from '../src/t31-owner-registration.js';

const input={email:'owner@example.invalid',password:'synthetic strong passphrase 2026'};
test('T31 owner signup is disabled by default and requires validation',async()=>{
 let calls=0;
 const createClient=()=>{calls++;return {auth:{signUp:async()=>({data:{user:{id:'synthetic'},session:null}})}};};
 await assert.rejects(registerOwner(createClient,input),/not yet available/);
 assert.equal(calls,0);
 assert.deepEqual(parseOwnerRegistration(input),input);
 for(const patch of [{email:' bad@example.invalid'},{email:'not-email'},{email:'bad\n@example.invalid'},{password:'short'},{password:'x'.repeat(1025)}]){
   assert.throws(()=>parseOwnerRegistration({...input,...patch}));
 }
});
test('T31 signup receives no owner/business/role claims and does not create a session',async()=>{
 let captured;
 const result=await registerOwner(()=>({auth:{signUp:async payload=>{
   captured=payload;return {data:{user:{id:'synthetic',email_confirmed_at:null},session:null},error:null};
 }}}),input,{enabled:true});
 assert.deepEqual(captured,input);
 assert.match(result.message,/check your email/i);
 assert.equal(Object.keys(result).join(','),'message');
});
test('T31 blocks unexpected immediate session when email verification is disabled',async()=>{
 let signOuts=0;
 await assert.rejects(registerOwner(()=>({auth:{
   signUp:async()=>({data:{session:{access_token:'do-not-expose'}}}),
   signOut:async({scope})=>{assert.equal(scope,'local');signOuts++;}
 }}),input,{enabled:true}),/requires email confirmation/);
 assert.equal(signOuts,1);
});
test('T31 provider errors never disclose user existence or provider details',async()=>{
 for(const provider of [
  ()=>({data:{user:null,session:null},error:{message:'existing owner@example.invalid'}}),
  ()=>{throw Error('private stack trace');}
 ])await assert.rejects(registerOwner(()=>({auth:{signUp:provider}}),input,{enabled:true}),e=>e.message==='Registration temporarily unavailable');
});
