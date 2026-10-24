// Run from the FaraiOS repository root with the real src/t19-c1.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createC1TokenService} from '../src/t19-c1.js';
import {createSyntheticCustody,createSyntheticCoordinator} from '../src/t19-synthetic-custody.js';

const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(10),b=id(20);
const makeBinding=(business_id=a)=>({business_id,environment:'synthetic',provider:'synthetic',connection_id:id(business_id===a?11:21),generation:1,organization_id:business_id===a?'synthetic-shalean':'synthetic-bokkie',credential_version:1});
function fixture({business_id=a,refresh,now=()=>Date.now()}={}) {
 const binding=makeBinding(business_id),custody=createSyntheticCustody();
 const reference=custody.provision(binding,{kind:'synthetic',organization_id:binding.organization_id,refresh_token:'fake-v1'});
 const coordinator=createSyntheticCoordinator({custody,binding,reference});
 const memberships=new Map([['owner',new Set([a,b])]]);
 const sessions={async withOwner(session,business,fn){if(!memberships.get(session)?.has(business))throw Error('owner_denied');return fn();}};
 let calls=0;
 const tokenRefresh=refresh??(async()=>({kind:'success',access_token:'fake-access',expires_in_ms:600000,refresh_token:'fake-v2'}));
 const service=createC1TokenService({sessions,coordinator,custody,now,refresh:async(...args)=>{calls++;return tokenRefresh(...args);}});
 return {binding,custody,coordinator,service,memberships,get calls(){return calls;}};
}
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

test('C1 synthetic integration refreshes only exact owner binding',async()=>{
 const f=fixture();const result=await f.service.access('owner',f.binding);
 assert.equal(result.access_token,'fake-access');assert.equal(f.calls,1);
 const current=f.coordinator.status();assert.equal(current.binding.credential_version,2);
 assert.equal(current.status,'active');assert.equal(f.custody.count(),2);
});

test('C1 denies cross-business requests before credential read or refresh',async()=>{
 const f=fixture({business_id:b});
 await assert.rejects(()=>f.service.access('outsider',f.binding),/owner_denied/);
 assert.equal(f.calls,0);assert.equal(f.custody.count(),1);
});

test('C1 denies owner whose membership is revoked before access',async()=>{
 const f=fixture();f.memberships.get('owner').delete(a);
 await assert.rejects(()=>f.service.access('owner',f.binding),/owner_denied/);
 assert.equal(f.calls,0);
});

test('C1 same-binding concurrent access dispatches one refresh, not two',async()=>{
 const p=pending();const f=fixture({refresh:async()=>p.promise});
 const results=[f.service.access('owner',f.binding),f.service.access('owner',f.binding)];
 await new Promise(resolve=>setImmediate(resolve));
 p.resolve({kind:'success',access_token:'shared-token',expires_in_ms:600000});
 const [x,y]=await Promise.all(results);
 assert.equal(x.access_token,'shared-token');assert.equal(y.access_token,'shared-token');assert.equal(f.calls,1);
});

test('C1 disconnect during in-flight refresh never publishes token',async()=>{
 const p=pending();const f=fixture({refresh:async()=>p.promise});
 const access=f.service.access('owner',f.binding);
 await new Promise(resolve=>setImmediate(resolve));
 f.coordinator.disconnect();
 p.resolve({kind:'success',access_token:'stale-after-disconnect',expires_in_ms:600000});
 await assert.rejects(access);
 assert.equal(f.coordinator.status().status,'disabled');
 await assert.rejects(()=>f.service.access('owner',f.binding));
});

test('C1 cannot access stale credential generation/version after refresh',async()=>{
 const f=fixture();await f.service.access('owner',f.binding);
 await assert.rejects(()=>f.service.access('owner',f.binding));
 assert.equal(f.coordinator.status().binding.credential_version,2);
 assert.equal(f.calls,1);
});

test('C1 uncertain dispatched failure causes persistent in-memory recovery hold',async()=>{
 const f=fixture({refresh:async()=>{throw Error('synthetic lost response');}});
 await assert.rejects(()=>f.service.access('owner',f.binding),e=>e.code==='refresh_unavailable');
 assert.equal(f.coordinator.status().status,'recovery_required');
 await assert.rejects(()=>f.service.access('owner',f.binding));
 assert.equal(f.calls,1);
});

test('C1 denied waiter cannot receive shared token after membership revocation',async()=>{
 const p=pending();const f=fixture({refresh:async()=>p.promise});
 const first=f.service.access('owner',f.binding);
 await new Promise(resolve=>setImmediate(resolve));
 f.memberships.get('owner').delete(a);
 p.resolve({kind:'success',access_token:'must-not-publish',expires_in_ms:600000});
 await assert.rejects(first);
 assert.equal(f.coordinator.status().status,'recovery_required');
});

test('C1 confirmed invalid_grant holds for reauthorisation, not uncertain recovery',async()=>{const f=fixture({refresh:async()=>({kind:'invalid_grant'})});await assert.rejects(()=>f.service.access('owner',f.binding),e=>e.code==='reauthorisation_required');assert.equal(f.coordinator.status().status,'reauthorisation_required');await assert.rejects(()=>f.service.access('owner',f.binding));assert.equal(f.calls,1);});
