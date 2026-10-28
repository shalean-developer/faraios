import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {createManagedWakeup,validateManagedTransport} from '../src/t19-managed-wakeup.js';
import {runAccountingPass,startAccountingCustody} from '../src/t19-deployment.js';
import {createAccountingProxy} from '../src/t19-accounting-proxy.js';
let dir,tls;
test.before(async()=>{
 dir=await mkdtemp(join(tmpdir(),'t19-wakeup-test-'));
 await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1']);
 tls={key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))};
});
test.after(async()=>{if(dir)await rm(dir,{recursive:true,force:true});});
async function fixture(t,handler){
 const seen=[];const server=https.createServer({...tls,requestCert:true,rejectUnauthorized:false},(req,res)=>{
  seen.push({url:req.url,method:req.method,headers:req.headers,peer:req.socket.getPeerCertificate()});handler(req,res,seen.length);
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const requestImpl=(url,options,callback)=>{
  assert.equal(url.href,'https://www.custody-staging.faraios.com/');assert.equal(options.rejectUnauthorized,true);
  assert.equal(options.agent,false);assert.equal(options.cert,undefined);assert.equal(options.key,undefined);
  return https.request(new URL('https://127.0.0.1:'+server.address().port+'/'),{...options,ca:tls.cert},callback);
 };
 return {requestImpl,seen,server};
}
test('real TLS wakeup retries only fixed unavailable startup responses and coalesces concurrent triggers',async t=>{
 const x=await fixture(t,(req,res,n)=>{res.writeHead(n===1?503:403);res.end('Unavailable');});
 const wake=createManagedWakeup({requestImpl:x.requestImpl,pause:async()=>{},budgetMs:1000});
 const a=wake(),b=wake();assert.equal(a,b);await a;
 assert.equal(x.seen.length,2);
 for(const request of x.seen){
  assert.equal(request.method,'GET');assert.equal(request.url,'/');assert.equal(request.headers.authorization,undefined);
  assert.equal(request.headers.cookie,undefined);assert.equal(request.headers['x-faraios-session'],undefined);
  assert.equal(Object.keys(request.peer).length,0);
 }
 await wake();assert.equal(x.seen.length,3);
});
test('unexpected body/status is denied and a failed wakeup does not poison later attempts',async t=>{
 let status=200;const x=await fixture(t,(req,res)=>{res.writeHead(status);res.end('Unavailable');});
 const wake=createManagedWakeup({requestImpl:x.requestImpl,budgetMs:1000});
 await assert.rejects(wake(),{message:'managed_custody_unavailable'});assert.equal(x.seen.length,1);
 status=403;await wake();assert.equal(x.seen.length,2);
});
test('oversized public response and invalid TLS are refused without leaking transport errors',async t=>{
 const x=await fixture(t,(req,res)=>{res.writeHead(403);res.end('x'.repeat(100));});
 await assert.rejects(createManagedWakeup({requestImpl:x.requestImpl,budgetMs:1000})(),{message:'managed_custody_unavailable'});
 const untrusted=(url,options,callback)=>https.request(new URL('https://127.0.0.1:'+x.server.address().port+'/'),options,callback);
 await assert.rejects(createManagedWakeup({requestImpl:untrusted,budgetMs:1000})(),{message:'managed_custody_unavailable'});
});
test('stalled startup is bounded and never dispatches an accounting operation',async t=>{
 const x=await fixture(t,()=>{});
 await assert.rejects(createManagedWakeup({requestImpl:x.requestImpl,budgetMs:40})(),{message:'managed_custody_unavailable'});
 assert.equal(x.seen.every(r=>r.method==='GET'&&r.url==='/'),true);
});
test('managed transport permits only the fixed local custody target profile',()=>{
 assert.doesNotThrow(()=>validateManagedTransport(undefined,'https://old.invalid/'));
 assert.doesNotThrow(()=>validateManagedTransport('managed-custody-staging','https://127.0.0.1:9443/'));
 for(const endpoint of ['https://other.invalid:9443/','https://localhost:9443/','http://127.0.0.1:9443/',
  'https://127.0.0.1/','https://127.0.0.1:443/','https://127.0.0.1:9443/path'])assert.throws(()=>validateManagedTransport('managed-custody-staging',endpoint));
 assert.throws(()=>validateManagedTransport('caller-approved','https://127.0.0.1:9443/'));
});
test('scheduler wakeup failure cannot send its private accounting POST',async t=>{
 let posts=0;const x=await fixture(t,(req,res)=>{posts++;res.end('[]');});
 const config={mode:'scheduler',enabled:true,transport:'managed-custody-staging',endpoint:'https://127.0.0.1:'+x.server.address().port+'/',tls:{...tls,ca:tls.cert}};
 await assert.rejects(runAccountingPass(config,{wake:async()=>{throw Error('PRIVATE');}}),{message:'accounting_pass_unconfirmed'});
 assert.equal(posts,0);
});
test('web proxy authenticates before wakeup and cannot forward private requests after a failed wakeup',async()=>{
 let wakes=0,sessionReads=0;
 const proxy=createAccountingProxy({endpoint:'https://127.0.0.1:9443/',transport:'managed-custody-staging',tls:{ca:'synthetic',key:'synthetic',cert:'synthetic'}},
  {wake:async()=>{wakes++;throw Error('PRIVATE');}});
 const makeResponse=()=>({writeHead(status){this.status=status;},end(body){this.body=body;}});
 const auth={withAccountingSession:async(sid,fn)=>{sessionReads++;return fn({auth:{getSession:async()=>({data:{session:{access_token:'PRIVATE_TOKEN'}}})}});}};
 let res=makeResponse();await proxy({req:{url:'/accounting/status',method:'GET',headers:{}},res,auth,origin:'https://staging.faraios.com',cookieName:'session'});
 assert.equal(wakes,0);assert.equal(sessionReads,0);assert.equal(res.status,403);
 const req={url:'/accounting/status',method:'GET',headers:{cookie:'session=synthetic-session'},async *[Symbol.asyncIterator](){}};
 res=makeResponse();await proxy({req,res,auth,origin:'https://staging.faraios.com',cookieName:'session'});
 assert.equal(wakes,1);assert.equal(sessionReads,1);assert.equal(res.status,403);assert.doesNotMatch(res.body,/PRIVATE/);
});

test('actual private TLS binds loopback despite a managed HTTP interception and closes its database',async()=>{
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 let closed=0,service;
 const config={mode:'custody',enabled:true,port,database:{},tls,createUserClient:()=>{}};
 const deps={connect:async()=>({database:{},query:()=>{},close:async()=>{closed++;}}),createService:()=>https.createServer(tls)};
 const previous=http.Server.prototype.listen;
 http.Server.prototype.listen=function(){throw Error('HTTP listener intercepted');};
 try{
  service=await startAccountingCustody(config,deps);
  assert.deepEqual(service.server.address(),{address:'127.0.0.1',family:'IPv4',port});
 }finally{http.Server.prototype.listen=previous;if(service)await service.close();}
 assert.equal(closed,1);
 await assert.rejects(startAccountingCustody(config,{...deps,inspectListener:()=>null}),{message:'accounting_deployment_rejected'});
 assert.equal(closed,2);
});
