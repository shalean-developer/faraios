import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';

async function withServer(options,action) {
 const server=createStagingServer(options);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{return await action(origin);}finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
test('T31 signup disabled by default: no registration page or Auth call',async()=>{
 let calls=0;
 await withServer({createClient:()=>{calls++;throw Error('not expected');}},async origin=>{
   const res=await fetch(origin+'/register');
   assert.equal(res.status,404);
   assert.doesNotMatch(await res.text(),/Register account/);
   assert.equal(calls,0);
 });
});
test('T31 isolated signup requires own origin and does not create business membership',async()=>{
 const calls=[];
 const createClient=()=>({auth:{signUp:async payload=>{
   calls.push(payload);return {data:{user:{id:'synthetic'},session:null},error:null};
 }}});
 await withServer({createClient,ownerRegistrationEnabled:true},async origin=>{
   const page=await fetch(origin+'/register');
   assert.equal(page.status,200);assert.match(await page.text(),/Confirm your email/);
   const body=new URLSearchParams({email:'owner@example.invalid',password:'synthetic strong passphrase 2026'});
   const forbidden=await fetch(origin+'/register',{method:'POST',headers:{Origin:'https://foreign.invalid','content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(forbidden.status,403);assert.equal(calls.length,0);
   const accepted=await fetch(origin+'/register',{method:'POST',headers:{Origin:origin,'content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(accepted.status,200);
   assert.match(await accepted.text(),/check your email/i);
   assert.deepEqual(calls,[{email:'owner@example.invalid',password:'synthetic strong passphrase 2026'}]);
   for(let i=0;i<4;i++)await fetch(origin+'/register',{method:'POST',headers:{Origin:origin,'content-type':'application/x-www-form-urlencoded'},body});
   const limited=await fetch(origin+'/register',{method:'POST',headers:{Origin:origin,'content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(limited.status,429);assert.equal(calls.length,5);
 });
});
test('T31 refuses enabling owner signup on hosted staging before outbound safeguards qualify',()=>{
 assert.throws(()=>createStagingServer({createClient:()=>({}),ownerRegistrationEnabled:true,hostedStaging:true,hostedFingerprint:'a'.repeat(64)}),/Hosted owner registration/);
});
