import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {once} from 'node:events';
import {createAccountingProxy} from '../src/t19-accounting-proxy.js';
import {createRestrictedAccountingService} from '../src/t19-accounting-service.js';
import {createStagingServer} from '../src/staging-server.js';
import {runAccountingPass} from '../src/t19-deployment.js';
const uid='00000000-0000-4000-8000-000000000001',business='10000000-0000-4000-8000-000000000001';
test('web session crosses actual mTLS boundary with verified token and current memberships only',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'faraios-t19-bridge-'));let web,custody,active=true,verifications=0;
 const client={
  auth:{signInWithPassword:async()=>({data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}),
   getUser:async token=>{if(token!==undefined){assert.equal(token,'test-verified-user-token');verifications++;}return {data:{user:{id:uid,user_metadata:{role:'owner',business_id:'forged'}}}};},
   getSession:async()=>({data:{session:{access_token:'test-verified-user-token'}}})},
  from:table=>({select(){return this;},eq(key){
   if(table==='businesses')return Promise.resolve({data:[{id:business,name:'Fixture'}]});
   return key==='status'?Promise.resolve({data:active?[{business_id:business,user_id:uid,role:'manager',status:'active'}]:[]}):this;
  }}),
  rpc:async(name,p)=>{assert.equal(name,'t19_accounting_status');assert.equal(p.business,business);return {data:{business_id:business,connections:[],jobs:[]}};}
 };
 try{
  const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
  await promisify(execFile)(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','extendedKeyUsage=serverAuth,clientAuth']);
  const tls={key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))};tls.ca=tls.cert;
  // Origin is determined after the web listener exists; the service itself remains
  // unmounted until the explicitly injected proxy is selected by the test host.
  let proxy;
  web=createStagingServer({createClient:()=>client,accountingProxy:args=>proxy(args)});web.listen(0,'127.0.0.1');await once(web,'listening');
  const origin='http://127.0.0.1:'+web.address().port;
  custody=createRestrictedAccountingService({database:{pending:async()=>[],findMachineByFingerprint:async fingerprint=>({id:'fixture-web-machine',fingerprint256:fingerprint,active:true})},
   query:async()=>{throw Error('not_expected');},createUserClient:token=>{assert.equal(token,'test-verified-user-token');return client;},
   fetchImpl:async()=>{throw Error('provider_must_not_run');},origin,tls,sessionCookie:'faraios_staging'});
  custody.listen(0,'127.0.0.1');await once(custody,'listening');
  const scheduler={mode:'scheduler',enabled:true,endpoint:'https://127.0.0.1:'+custody.address().port+'/',tls};
  assert.deepEqual(await runAccountingPass(scheduler),{processed:0,held:0});
  await assert.rejects(runAccountingPass({...scheduler,tls:{ca:tls.cert}}),{message:'accounting_pass_unconfirmed'});
  let wakes=0;const wake=async()=>{wakes++;};
  assert.deepEqual(await runAccountingPass({...scheduler,transport:'managed-custody-staging'},{wake}),{processed:0,held:0});
  proxy=createAccountingProxy({endpoint:'https://127.0.0.1:'+custody.address().port+'/',tls,transport:'managed-custody-staging'},{wake});
  const login=await fetch(origin+'/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'email=fixture%40test.invalid&password=test-only'});
  assert.equal(login.status,303);const cookie=login.headers.get('set-cookie').split(';')[0];
  const headers={Cookie:cookie,Authorization:'Bearer attacker-token','X-Faraios-Session':'forged'};
  const result=await fetch(origin+'/accounting/'+business+'/status',{headers});assert.equal(result.status,200);
  assert.equal((await result.json()).business_id,business);assert.ok(verifications>0);assert.equal(wakes,2);
  assert.equal((await fetch(origin+'/accounting/'+business+'/disconnect',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({connection:uid,generation:1})})).status,403);
  active=false;
  assert.equal((await fetch(origin+'/accounting/'+business+'/status',{headers})).status,403);
  assert.throws(()=>createStagingServer({createClient:()=>client,restoreTest:true,accountingProxy:proxy}),/restore/);
  assert.throws(()=>createStagingServer({createClient:()=>client,accountingWorker:{},accountingProxy:proxy}),/one accounting/);
 }finally{
  for(const server of [web,custody])if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  const path=relative(resolve(tmpdir()),resolve(dir));if(!path.startsWith('faraios-t19-bridge-')||path.startsWith('..')||isAbsolute(path))throw Error('cleanup_boundary');
  await rm(dir,{recursive:true,force:true});
 }
});
