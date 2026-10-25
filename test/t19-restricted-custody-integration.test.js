import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRestrictedCustodyCore} from '../src/t19-restricted-custody-core.js';
import {createDummyCustody,createDummyCoordinator,dummyRefresh} from '../test-support/t19-c1-dummy.mjs';
const binding=()=>({business_id:randomUUID(),environment:'synthetic',provider:'synthetic',connection_id:randomUUID(),generation:1,organization_id:'synthetic-tenant',credential_version:1});
async function setup(){
 const b=binding(),vault=createDummyCustody(),coordinator=createDummyCoordinator();
 const reference=await vault.provision(b);coordinator.installForTest(b,reference);
 let calls=0; const provider={refresh:()=>{calls++;return dummyRefresh();}};
 const svc=createRestrictedCustodyCore({authorize:async({principal})=>principal==='custody-machine',coordinator,vault,provider});
 return {b,vault,coordinator,svc,get calls(){return calls;}};
}
test('isolated encrypted vault with coordinator succeeds without returning tokens',async()=>{
 const x=await setup();
 const v=await x.svc.refresh({principal:'custody-machine',binding:x.b,operationId:'operation-0001'});
 assert.equal(v.status,'completed');assert.equal(x.calls,1);
 assert.equal(JSON.stringify(v).includes('dummy-'),false);
 const after=x.coordinator.snapshotForTest(); assert.equal(after.rows[0][1].binding.credential_version,2);
});
test('cross-business binding, stale generation and disabled connection deny refresh',async()=>{
 const x=await setup();
 await assert.rejects(x.svc.refresh({principal:'invoice-worker',binding:x.b,operationId:'operation-0002'}),{code:'custody_denied'});
 const foreign={...x.b,business_id:randomUUID()};
 await assert.rejects(x.svc.refresh({principal:'custody-machine',binding:foreign,operationId:'operation-0003'}));
 assert.equal(x.calls,0);
 x.coordinator.changeForTest(x.b);
 await assert.rejects(x.svc.refresh({principal:'custody-machine',binding:x.b,operationId:'operation-0004'}));
 assert.equal(x.calls,0);
});
test('refresh timeout remains recovery-required across synthetic coordinator reopen',async()=>{
 const x=await setup();
 const failed=createRestrictedCustodyCore({authorize:async()=>true,coordinator:x.coordinator,vault:x.vault,provider:{refresh:()=>{throw Error('unknown timeout');}}});
 await assert.rejects(failed.refresh({principal:'custody-machine',binding:x.b,operationId:'operation-0005'}),{code:'reconciliation_required'});
 const restored=createDummyCoordinator({snapshot:x.coordinator.snapshotForTest()});
 await assert.rejects(restored.current(x.b),{code:'recovery_required'});
});
