import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,symlink,rm,lstat,realpath} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {readPaymentPrivateJson,createPaymentRuntime} from '../src/t20-payment-runtime.js';
import {createStagingFetch} from '../src/hosted-staging.js';
import {createStagingServer} from '../src/staging-server.js';
import {request as httpRequest} from 'node:http';
const b='11111111-1111-4111-8111-111111111111';
const settings={environment:'staging',enabled:false,accounts:[],backend:{email:'synthetic@example.test',password:'SYNTHETIC_ONLY',principalId:b}};
const account={businessId:b,accountId:'123',environment:'staging',domain:'test',enabled:true,secretKey:'sk_test_'+'synthetic'.repeat(5)};
test('disabled runtime performs no backend authentication and rejects ambiguous settings',async()=>{
 let calls=0;const r=await createPaymentRuntime(settings,[],{backendFactory:async()=>{calls++;throw Error();}});assert.equal(r.handler,null);assert.equal(calls,0);
 await assert.rejects(createPaymentRuntime({...settings,enabled:'false'},[]));await assert.rejects(createPaymentRuntime({...settings,environment:'production'},[]));
});
test('enabled TEST runtime checks each exact enrollment and closes failed startup session',async()=>{
 let closed=0;const inputs=[];const backend={rpc:async(a,i)=>{inputs.push(i);return {ready:true};},close:async()=>{closed++;}};
 const r=await createPaymentRuntime({...settings,enabled:true,accounts:[b]},[account],{backendFactory:async()=>backend});assert.equal(typeof r.handler,'function');assert.deepEqual(inputs,[{businessId:b,accountId:'123'}]);await r.close();assert.equal(closed,1);
 await assert.rejects(createPaymentRuntime({...settings,enabled:true,accounts:[b]},[account],{backendFactory:async()=>({...backend,rpc:async()=>({ready:false})})}),/payment_runtime_startup_rejected/);assert.equal(closed,2);
 await assert.rejects(createPaymentRuntime({...settings,enabled:true,accounts:[]},[]));
});
test('private reader rejects loose permissions, symlinks, malformed and oversized contents',async t=>{
 if(process.platform!=='linux')return t.skip('Linux private-file permission check');
 // Container HOME need not be a trusted secret ancestor. Select an actually
 // owned/non-writable fixture chain; never relax the production reader.
 let parent;
 for(const candidate of [homedir(),process.cwd()]){
  try{if(await realpath(candidate)!==candidate)continue;let safe=true;
   for(let d=candidate;;d=dirname(d)){const s=await lstat(d);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o022)||![0,process.getuid()].includes(s.uid)){safe=false;break;}if(dirname(d)===d)break;}
   if(safe){parent=candidate;break;}
  }catch{}
 }
 assert.ok(parent,'eligible private fixture ancestor required');
 const dir=await mkdtemp(join(parent,'t20-private-'));t.after(()=>rm(dir,{recursive:true,force:true}));await chmod(dir,0o700);const file=join(dir,'test.json');
 await writeFile(file,'{}',{mode:0o600});assert.deepEqual(await readPaymentPrivateJson(file),{});
 await chmod(file,0o644);await assert.rejects(readPaymentPrivateJson(file));await symlink(file,join(dir,'link'));await assert.rejects(readPaymentPrivateJson(join(dir,'link')));
 await chmod(file,0o600);await writeFile(file,'not json');await assert.rejects(readPaymentPrivateJson(file));await writeFile(file,'x'.repeat(8193));await assert.rejects(readPaymentPrivateJson(file));
});
test('owner payment RPC is opt-in; backend, checkout, private tables and provider routes stay blocked',async()=>{
 const base='https://xdmfyrsauvqznkloroxg.supabase.co';let calls=0;const dispatch=async()=>{calls++;return new Response('{}');};
 await assert.rejects(createStagingFetch(dispatch)(base+'/rest/v1/rpc/t20_payment_owner',{method:'POST'}));
 const f=createStagingFetch(dispatch,{payments:true});await f(base+'/rest/v1/rpc/t20_payment_owner',{method:'POST'});
 for(const url of [base+'/rest/v1/rpc/t20_payment_checkout',base+'/rest/v1/rpc/t20_payment_backend','https://api.paystack.co/transaction/initialize'])await assert.rejects(f(url,{method:'POST'}));assert.equal(calls,1);
});
test('hosted mount admits only the exact signed-webhook path past Origin gate',async t=>{
 let calls=0;
 const server=createStagingServer({createClient:()=>({}),hostedStaging:true,hostedFingerprint:'a'.repeat(64),hostedTransport:'litespeed',hostedReady:()=>true,paymentProxy:async({res})=>{calls++;res.writeHead(409);res.end('signature verification required');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const request=(path,method='POST')=>new Promise((resolve,reject)=>{const req=httpRequest({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{host:'staging.faraios.com'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
 assert.equal(await request('/payments/'+b+'/webhook'),409);assert.equal(calls,1);
 for(const path of ['/payments/'+b+'/intents','/payments/'+b+'/webhook?bypass=yes','/accounting/'+b+'/connection'])assert.equal(await request(path),403);
 assert.equal(calls,1);
 assert.throws(()=>createStagingServer({paymentProxy:()=>{}}),/Invalid TEST payment runtime/);
});
