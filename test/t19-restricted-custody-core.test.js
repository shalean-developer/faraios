import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRestrictedCustodyCore} from '../src/t19-restricted-custody-core.js';
const binding={business_id:'11111111-1111-4111-8111-111111111111',environment:'synthetic',provider:'synthetic',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-org',credential_version:1};
const make=({allow=true,result={kind:'success',refresh_token:'fake-next'},failAt}={})=>{
 const events=[];let state='active';
 const deps={authorize:async({action})=>{events.push('authorize:'+action);return allow;},
 coordinator:{
  current:async()=>({reference:'sealed'}),
  claim:async()=>({id:'lease'}),
  dispatch:async(b,l,effect)=>{events.push('dispatch');state='dispatched';return effect();},
  complete:async()=>{if(failAt==='complete')throw Error('db down');state='complete';events.push('complete');},
  fail:async(b,l,s)=>{state=s;events.push('fail:'+s);}
 },vault:{read:async()=>({refresh_token:'fake-old'}),seal:async()=>{events.push('seal');return 'sealed-next';}},
 provider:{refresh:async()=>{events.push('provider');if(failAt==='provider')throw Error('timeout');return result;}}};
 return {svc:createRestrictedCustodyCore(deps),events,get state(){return state;}};
};
test('rejects worker before reading secrets or calling provider',async()=>{
 const x=make({allow:false});
 await assert.rejects(x.svc.refresh({principal:'untrusted',binding,operationId:'operation-1'}),{code:'custody_denied'});
 assert.deepEqual(x.events,['authorize:refresh']);
});
test('success returns status and C1 binding only, never secrets',async()=>{
 const x=make();const v=await x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-1'});
 assert.equal(v.status,'completed');assert.equal(x.state,'complete');
 assert.equal(JSON.stringify(v).includes('fake-'),false);
 assert.deepEqual(x.events,['authorize:refresh','authorize:refresh','dispatch','provider','seal','authorize:complete','complete']);
});
test('provider timeout goes to reconciliation, never auto-retries',async()=>{
 const x=make({failAt:'provider'});
 await assert.rejects(x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-1'}),{code:'reconciliation_required'});
 assert.equal(x.state,'recovery_required');assert.equal(x.events.filter(e=>e==='provider').length,1);
});
test('failed publication cannot return completed status',async()=>{
 const x=make({failAt:'complete'});
 await assert.rejects(x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-1'}),{code:'reconciliation_required'});
 assert.equal(x.state,'recovery_required');
});
test('invalid grant is terminal but no token leaks',async()=>{
 const x=make({result:{kind:'invalid_grant'}});
 const outcome=await x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-1'});
 assert.deepEqual(outcome,{status:'reauthorisation_required'});
 assert.equal(x.state,'reauthorisation_required');
});
