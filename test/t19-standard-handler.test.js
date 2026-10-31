import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {createStandardHandler} from '../src/t19-standard-handler.js';
const business='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
test('actual HTTP handler denies foreign ownership, forged origin and ambiguous fields before consent',async()=>{
 let begins=0,role='owner';
 const config={origin:'https://staging.example.test',environment:'staging'};
 const auth={async read(sid){return sid==='valid'?{userId:'actor',businessIds:[business],memberships:[{businessId:business,role}]}:null;}};
 const handler=createStandardHandler({config,store:{async connection(){return null;},async begin(){begins++;}},cipher:{},provider:{consent:s=>'https://accounts.zoho.com/?state='+s}});
 const server=createServer((req,res)=>handler({req,res,auth,cookieName:'app_session'}));server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const url='http://127.0.0.1:'+server.address().port;
  const fetch=async(url,{headers,body,method='GET'})=>new Promise((resolve,reject)=>{
   const req=httpRequest(url,{headers,method},res=>{let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:{get:k=>Array.isArray(res.headers[k])?res.headers[k].join(';'):res.headers[k]},json:async()=>JSON.parse(raw)}));});
   req.on('error',reject);req.end(body);
  });
  const headers={Host:'staging.example.test',Cookie:'app_session=valid',Origin:config.origin,'Content-Type':'application/x-www-form-urlencoded'};
  const request=(b,body,override={})=>fetch(url+'/accounting/'+b+'/connect',{method:'POST',headers:{...headers,...override},body,redirect:'manual'});
  assert.equal((await request(foreign,'organizationId=123')).status,403);
  assert.equal((await request(business,'organizationId=123',{Origin:'https://evil.example'})).status,403);
  assert.equal((await request(business,'organizationId=123&organizationId=456')).status,403);
  role='manager';assert.equal((await request(business,'organizationId=123')).status,403);assert.equal(begins,0);
  role='owner';const r=await request(business,'organizationId=123');assert.equal(r.status,303);assert.equal(begins,1);
  assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.ok(!r.headers.get('location').includes('valid'));
  const denied=await fetch(url+'/accounting/'+foreign+'/status',{headers});assert.equal(denied.status,403);
  const status=await fetch(url+'/accounting/'+business+'/status',{headers});assert.equal(status.status,200);assert.deepEqual(await status.json(),{status:'disconnected',environment:'staging'});
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('private setup HTTP mode has no callback or token-import route and keeps status truthful',async()=>{
 const config={origin:'https://staging.example.test',environment:'staging'};
 const auth={async read(){return {userId:'owner',businessIds:[business],businesses:[{id:business,name:'Synthetic business'}],memberships:[{userId:'owner',businessId:business,role:'owner',status:'active'}]};}};
 const handler=createStandardHandler({config,onboardingMode:'private',store:{async connection(){return null;}},cipher:{},provider:{}});
 const server=createServer((req,res)=>handler({req,res,auth,cookieName:'app_session'}));server.listen(0,'127.0.0.1');await once(server,'listening');
 const get=(path,method='GET')=>new Promise((resolve,reject)=>{const req=httpRequest({host:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'staging.example.test',Cookie:'app_session=valid'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body,location:res.headers.location}));});req.on('error',reject);req.end();});
 try{
  assert.equal((await get('/accounting/zoho/callback?code=synthetic&state=synthetic')).status,404);
  const connect=await get('/accounting/'+business+'/connect','POST');assert.equal(connect.status,409);assert.equal(connect.location,undefined);
  assert.equal((await get('/accounting/'+business+'/provision','POST')).status,404);
  const page=await get('/accounting/'+business+'/connection');assert.equal(page.status,200);assert.match(page.body,/private setup is required/);assert.match(page.body,/workspace-layout/);assert.match(page.body,/Not activated on staging/);assert.match(page.body,/href="\/style.css"/);assert.doesNotMatch(page.body,/Connect Zoho Books|name="organizationId"/);
  assert.equal((await get('/accounting/'+foreign+'/status')).status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
