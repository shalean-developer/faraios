// DEPLOY-153: loopback-only simulated hosted server acceptance in a network-none container.
// This does NOT boot Passenger/LiteSpeed or connect to any real Supabase service.
import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {once} from 'node:events';
import {createStagingServer} from '../src/staging-server.js';

const fingerprint='a'.repeat(64);
function makeServer({ready=true}={}){
  return createStagingServer({
    createClient:()=>{throw new Error('External client creation forbidden in rehearsal');},
    hostedStaging:true,hostedTransport:'litespeed',
    hostedReady:()=>ready,hostedFingerprint:fingerprint
  });
}
async function localRequest(server,{path='/environment-health',method='GET',headers={}}={}){
  const port=server.address().port;
  return new Promise((resolve,reject)=>{
    const req=request({hostname:'127.0.0.1',port,path,method,headers:{host:'staging.faraios.com',...headers}},res=>{
      const chunks=[];res.on('data',part=>chunks.push(part));
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
    });
    req.on('error',reject);req.end();
  });
}
test('synthetic isolated startup serves health and login while denying unsafe requests',async()=>{
  const server=makeServer();
  try{
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    const health=await localRequest(server);
    assert.equal(health.status,200);
    const report=JSON.parse(health.body);
    assert.equal(report.environment,'staging');
    assert.equal(report.sourceFingerprint,fingerprint);
    assert.equal(report.transport,'litespeed');
    for(const field of ['appPaymentDispatch','appNotificationDispatch','accountingWorker'])assert.equal(report[field],'disabled');
    const login=await localRequest(server,{path:'/login'});
    assert.equal(login.status,200);
    assert.match(login.body,/Welcome back/);
    assert.equal((await localRequest(server,{headers:{host:'unknown.example'}})).status,403);
    assert.equal((await localRequest(server,{method:'POST',path:'/login'})).status,403);
    assert.equal((await localRequest(server,{path:'//evil.example'})).status,403);
  }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
test('synthetic server denies all requests until private listener is ready',async()=>{
  const server=makeServer({ready:false});
  try{
    server.listen(0,'127.0.0.1');await once(server,'listening');
    assert.equal((await localRequest(server)).status,503);
  }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
