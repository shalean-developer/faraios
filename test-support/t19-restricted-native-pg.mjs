// Disposable native PostgreSQL E2E ONLY. This is not a hosted service adapter.
// Synthetic DB roles, fixed test password and test-only privileged metadata reads.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createRestrictedCustodyCore} from '../src/t19-restricted-custody-core.js';
import {createDummyCustody,dummyRefresh} from '../test-support/t19-c1-dummy.mjs';
if(process.env.PGDATABASE!=='faraios_t19_test'||process.env.PGHOST!=='127.0.0.1')throw Error('disposable_only');
const b={business_id:'612be091-b1d7-4911-9c3b-143446a9fe27',environment:'synthetic',provider:'synthetic',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-shalean',credential_version:1};
function run(role,sql){const password={t19_fixture:'synthetic-only',t19_custody:'fake-custody-only',t19_sealer:'fake-sealer-only'}[role];if(!password)throw Error('role');return execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',sql],{env:{...process.env,PGUSER:role,PGPASSWORD:password},encoding:'utf8'}).trim();}
const uuid=v=>{if(!/^[0-9a-f-]{36}$/i.test(v))throw Error('invalid uuid');return "'"+v+"'::uuid";};
const row=b=>`ROW(${uuid(b.business_id)},'${b.environment}','${b.provider}',${uuid(b.connection_id)},${b.generation},'${b.organization_id}',${b.credential_version})::custody_durable.binding`;
const bsql=row(b),vaultImpl=createDummyCustody(),envelopes=new Map();
const original=await vaultImpl.provision(b);const initial='33333333-3333-4333-8333-333333333333';envelopes.set(initial,original);
const vault={
 async read(binding,reference){const envelope=envelopes.get(reference);if(!envelope)throw Error('missing_envelope');return vaultImpl.read(binding,envelope);},
 async seal(binding,material){const opaque=randomUUID();const envelope=await vaultImpl.seal(binding,material);envelopes.set(opaque,envelope);return opaque;}
};
let op,leaseId;
const coordinator={
 async current(binding){assert.deepEqual(binding,b);const reference=run('t19_fixture',`select reference from custody_durable.connections where connection_id=${uuid(binding.connection_id)} and business_id=${uuid(binding.business_id)} and enabled and generation=${binding.generation} and credential_version=${binding.credential_version}`);if(!reference)throw Error('stale');return {reference};},
 async claim(binding,operationId){op=operationId;leaseId=randomUUID();assert.equal(run('t19_custody',`select custody_durable.claim(${row(binding)},${uuid(op)},${uuid(leaseId)},interval '2 minutes')`),'t');return {id:leaseId,operationId:op};},
 async dispatch(binding,lease,effect){assert.equal(run('t19_custody',`select custody_durable.dispatch(${row(binding)},${uuid(lease.operationId)},${uuid(lease.id)})`),'t');return effect();},
 async complete(binding,lease,ref){assert.equal(run('t19_sealer',`select custody_durable.prepare(${row(binding)},${uuid(lease.operationId)},${uuid(lease.id)},${uuid(ref)})`),'t');assert.equal(run('t19_custody',`select custody_durable.publish(${row(binding)},${uuid(lease.operationId)},${uuid(lease.id)},${uuid(ref)})`),'t');},
 async fail(binding,lease,state){if(state!=='recovery_required'&&state!=='idle'&&state!=='reauthorisation_required')throw Error('invalid_state');if(state==='recovery_required'){run('t19_fixture',`update custody_durable.operations set phase='recovery_required' where operation_id=${uuid(lease.operationId)} and lease_id=${uuid(lease.id)} and phase='dispatched'`);return;}throw Error('terminal path not implemented in disposable fixture');}
};
const svc=createRestrictedCustodyCore({authorize:async({principal})=>principal==='custody-service-synthetic',coordinator,vault,provider:{refresh:async()=>dummyRefresh()}});
await assert.rejects(svc.refresh({principal:'ordinary-invoice-worker',binding:b,operationId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}),{code:'custody_denied'});
const foreign={...b,business_id:randomUUID()};
await assert.rejects(svc.refresh({principal:'custody-service-synthetic',binding:foreign,operationId:'job-12345678'}));
const answer=await svc.refresh({principal:'custody-service-synthetic',binding:b,operationId:'job-12345678'});
assert.equal(answer.status,'completed');assert.equal(JSON.stringify(answer).includes('dummy-'),false);
assert.equal(run('t19_fixture',`select credential_version from custody_durable.connections where connection_id=${uuid(b.connection_id)}`),'2');
assert.equal(run('t19_fixture',`select count(*) from custody_durable.operations where phase='published'`),'1');
await assert.rejects(svc.refresh({principal:'custody-service-synthetic',binding:b,operationId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}));
console.log('T19_CUSTODY_NATIVE_PG_INTEGRATION_PASS');
