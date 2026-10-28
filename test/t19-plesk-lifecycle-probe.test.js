import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm,readFile,chmod,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {userInfo} from 'node:os';
import {EventEmitter,once} from 'node:events';
const require=createRequire(import.meta.url);
const {assertManaged,createProbe,privateJournal,verifyUnixListener}=require('../scripts/t19-plesk-lifecycle-probe.cjs');
function fixture(options={}){
 const events=[],exits=[];let closed=0;
 const probe=createProbe({journal:{append:e=>events.push(e),close:()=>closed++},durationMs:1000,heartbeatMs:10,onExit:c=>exits.push(c),...options});
 return {probe,events,exits,closed:()=>closed};
}
test('standalone, foreign identity and malformed managed contexts cannot start the probe',()=>{
 for(const settings of [{},{platform:'win32'},{uid:10463},{uid:10521,root:'/httpdocs'},
  {uid:10521,root:'/var/www/vhosts/custody-staging.faraios.com/t19-lifecycle-probe',lsNode:new EventEmitter(),env:{}}]){
  assert.throws(()=>assertManaged(settings),/T19_LIFECYCLE_PROBE_REFUSED/);
 }
});
test('actual HTTP requests always receive denial without journaled request data',async t=>{
 const f=fixture();t.after(()=>f.probe.close());f.probe.server.listen(0,'127.0.0.1');await once(f.probe.server,'listening');
 const base='http://127.0.0.1:'+f.probe.server.address().port;
 for(const requestPath of ['/','/health','/accounting/zoho/callback?code=NEVER_LOG_THIS','/crash']){
  const r=await fetch(base+requestPath,{method:'POST',headers:{Cookie:'PRIVATE_COOKIE','Authorization':'Bearer PRIVATE_TOKEN'},body:'PRIVATE_BODY'});
  assert.equal(r.status,403);assert.equal(await r.text(),'Unavailable');assert.equal(r.headers.get('cache-control'),'no-store');
 }
 assert.doesNotMatch(JSON.stringify(f.events),/NEVER_LOG_THIS|PRIVATE_COOKIE|PRIVATE_TOKEN|PRIVATE_BODY|\/crash/);
 assert.ok(f.events.some(e=>e.event==='ready'));
});
test('fixed deadline closes the owned listener and journal exactly once',async()=>{
 const f=fixture({durationMs:35,heartbeatMs:5});f.probe.server.listen(0,'127.0.0.1');await once(f.probe.server,'listening');
 await once(f.probe.server,'close');f.probe.close('duplicate');
 assert.equal(f.probe.server.listening,false);assert.equal(f.closed(),1);assert.deepEqual(f.exits,[0]);
 assert.equal(f.events.filter(e=>e.event==='deadline').length,1);
});
test('TCP cannot masquerade as the managed Unix listener',async t=>{
 const f=fixture();t.after(()=>f.probe.close());f.probe.server.listen(0,'127.0.0.1');await once(f.probe.server,'listening');
 assert.throws(()=>verifyUnixListener(f.probe.server,'/not-the-actual-listener'),/REFUSED/);
});
test('listener-verification failure closes the probe without readiness',async()=>{
 const f=fixture({verify:()=>{throw Error('untrusted listener');}});
 const close=once(f.probe.server,'close');f.probe.server.listen(0,'127.0.0.1');await close;
 assert.equal(f.events.some(e=>e.event==='ready'),false);assert.ok(f.events.some(e=>e.event==='listener_refused'));
 assert.deepEqual(f.exits,[1]);
});
test('invalid duration cannot create an unlimited or long-lived test service',()=>{
 for(const durationMs of [0,-1,180001,Infinity,'120000'])assert.throws(()=>fixture({durationMs}),/REFUSED/);
});
test('real private journal is exclusive and rejects changed permissions and symlink directories',async t=>{
 const nonce='12345678-1234-4234-8234-123456789abc';
 // Docker's account home can be intentionally shared/writable; the local
 // workspace can also have a shared ancestor. Find an actually protected
 // fixture root, without chmodding either environment or skipping checks.
 let dir,journal;
 for(const parent of new Set([userInfo().homedir,process.cwd()])){
  const candidate=await mkdtemp(join(parent,'t19-lifecycle-private-'));
  try{journal=privateJournal(candidate,nonce);dir=candidate;break;}
  catch(error){await rm(candidate,{recursive:true,force:true});if(error.message!=='T19_LIFECYCLE_PROBE_REFUSED')throw error;}
 }
 assert.ok(journal,'a protected test directory is required');t.after(()=>rm(dir,{recursive:true,force:true}));journal.append({event:'synthetic'});
 assert.deepEqual(JSON.parse(await readFile(journal.file,'utf8')),{event:'synthetic'});
 assert.throws(()=>privateJournal(dir,nonce),/EEXIST/);
 await chmod(journal.file,0o644);assert.throws(()=>journal.append({event:'must-not-append'}),/REFUSED/);journal.close();
 const alias=dir+'-alias';await symlink(dir,alias);t.after(()=>rm(alias));assert.throws(()=>privateJournal(alias,'22345678-1234-4234-8234-123456789abc'),/REFUSED/);
 await chmod(dir,0o777);assert.throws(()=>privateJournal(dir,'32345678-1234-4234-8234-123456789abc'),/REFUSED/);await chmod(dir,0o700);
});
