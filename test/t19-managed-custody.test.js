import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {startManagedCustody,assertManaged,verifyPrimary,ROOT,SOCKET,CONFIG}=require('../src/t19-managed-custody.cjs');
function harness(overrides={}){
 const signals=new EventEmitter();let primary,loads=0,starts=0,closes=0;
 const options={signals,assertContext:()=>{},verifyListener:s=>assert.equal(s.address().address,'127.0.0.1'),
  createPrimary:(options,handler)=>{
   primary=http.createServer(options,handler);const listen=primary.listen;
   primary.listen=function(){return listen.call(this,0,'127.0.0.1');};return primary;
  },load:async path=>{assert.equal(path,CONFIG);loads++;return {synthetic:true};},
  start:async c=>{assert.equal(c.synthetic,true);starts++;return {close:async()=>{closes++;}};},...overrides};
 return {options,signals,get primary(){return primary;},counts:()=>({loads,starts,closes})};
}
test('isolated managed identity and exact socket/root binding deny other subscriptions and standalone execution',()=>{
 const context={platform:'linux',uid:10521,root:ROOT,env:{LSNODE_ROOT:ROOT+'/',LSNODE_STARTUP_FILE:'_custody.cjs',LSNODE_SOCKET:SOCKET},
  argv:['node','/usr/local/lsws/fcgi-bin/lsnode.js'],lsNode:new EventEmitter(),serverPrototype:{realListen(){}}};
 assert.doesNotThrow(()=>assertManaged(context));
 for(const change of [{uid:10463},{platform:'win32'},{root:ROOT+'-other'},{argv:['node','_custody.cjs']},{lsNode:{}},{serverPrototype:{}}]){
  assert.throws(()=>assertManaged({...context,...change}),/managed_custody_rejected/);
 }
 for(const env of [{...context.env,LSNODE_ROOT:ROOT+'/../app/'},{...context.env,LSNODE_SOCKET:SOCKET+'-other'},
  {...context.env,LSNODE_STARTUP_FILE:'_accounting.cjs'}])assert.throws(()=>assertManaged({...context,env}),/managed_custody_rejected/);
});
test('public primary denies real requests and closes delegated custody once without dispatching requests',async t=>{
 const h=harness(),app=await startManagedCustody(h.options);t.after(()=>app.close());
 const origin='http://127.0.0.1:'+app.primary.address().port;
 for(const path of ['/','/custody/run','/accounting/zoho/callback?code=PRIVATE']){
  const r=await fetch(origin+path,{method:'POST',headers:{Authorization:'Bearer PRIVATE',Cookie:'PRIVATE'},body:'PRIVATE'});
  assert.equal(r.status,403);assert.equal(await r.text(),'Unavailable');assert.equal(r.headers.get('cache-control'),'no-store');
 }
 await Promise.all([app.close(),app.close()]);assert.deepEqual(h.counts(),{loads:1,starts:1,closes:1});
 assert.equal(app.primary.listening,false);for(const s of ['SIGTERM','SIGINT','SIGHUP'])assert.equal(h.signals.listenerCount(s),0);
});
test('actual TCP primary is rejected before credential loading or database startup',async()=>{
 const h=harness({verifyListener:verifyPrimary});
 await assert.rejects(startManagedCustody(h.options),{message:'managed_custody_rejected'});
 assert.deepEqual(h.counts(),{loads:0,starts:0,closes:0});assert.equal(h.primary.listening,false);
});
test('foreign managed context cannot even create a primary listener',async()=>{
 let created=false;await assert.rejects(startManagedCustody({assertContext:()=>{throw Error('managed_custody_rejected');},createPrimary:()=>{created=true;}}));
 assert.equal(created,false);
});
test('interruption during credential loading never starts custody and releases the primary',async()=>{
 let release,loaded;const entered=new Promise(r=>loaded=r),config=new Promise(r=>release=r);let starts=0;
 const h=harness({load:async()=>{loaded();return config;},start:async()=>{starts++;throw Error('must not start');}});
 const opening=startManagedCustody(h.options);const refused=assert.rejects(opening,{message:'managed_custody_rejected'});
 await entered;h.signals.emit('SIGTERM');release({});await refused;
 assert.equal(starts,0);assert.equal(h.primary.listening,false);assert.equal(h.signals.listenerCount('SIGTERM'),0);
});
test('interruption during asynchronous custody startup closes the late service exactly once',async()=>{
 let release,started;const entered=new Promise(r=>started=r),service=new Promise(r=>release=r);let closes=0;
 const h=harness({start:async()=>{started();return service;}});
 const opening=startManagedCustody(h.options),refused=assert.rejects(opening,{message:'managed_custody_rejected'});
 await entered;h.signals.emit('SIGHUP');h.signals.emit('SIGTERM');release({close:async()=>{closes++;}});await refused;
 assert.equal(closes,1);assert.equal(h.primary.listening,false);assert.equal(h.signals.listenerCount('SIGINT'),0);
});
test('startup failure is sanitized and primary closes; an unexpected primary closure drains custody',async()=>{
 const h=harness({start:async()=>{throw Error('PRIVATE_DB_PASSWORD');}});
 await assert.rejects(startManagedCustody(h.options),{message:'managed_custody_rejected'});assert.equal(h.primary.listening,false);
 const good=harness(),app=await startManagedCustody(good.options);
 await new Promise(r=>app.primary.close(r));await app.close();assert.equal(good.counts().closes,1);
});

test('unexpected private listener shutdown withdraws the public listener and drains the delegated service',async()=>{
 const privateServer=http.createServer();privateServer.listen(0,'127.0.0.1');
 await new Promise(r=>privateServer.once('listening',r));let closes=0;
 const h=harness({start:async()=>({server:privateServer,close:async()=>{closes++;}})});
 const app=await startManagedCustody(h.options);
 await new Promise(r=>privateServer.close(r));await app.close();
 assert.equal(app.primary.listening,false);assert.equal(closes,1);assert.equal(h.signals.exitCode,1);
 assert.equal(privateServer.listenerCount('error'),0);
});
