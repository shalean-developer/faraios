import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRestrictedCustodyCore} from '../src/t19-restricted-custody-core.js';
const binding={business_id:'11111111-1111-4111-8111-111111111111',environment:'synthetic',provider:'synthetic',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-org',credential_version:1};
const make=({allow=true,result={kind:'success',refresh_token:'fake-next'},failAt,material={refresh_token:'fake-old'}}={})=>{
 const events=[];let state='active',sealed;
 const deps={authorize:async({action})=>{events.push('authorize:'+action);return allow;},
 coordinator:{
  current:async()=>({reference:'sealed'}),
  claim:async()=>({id:'lease'}),
  dispatch:async(b,l,effect)=>{events.push('dispatch');state='dispatched';return effect();},
  complete:async()=>{if(failAt==='complete')throw Error('db down');state='complete';events.push('complete');},
  fail:async(b,l,s)=>{state=s;events.push('fail:'+s);}
 },vault:{read:async()=>material,seal:async(b,material)=>{sealed={binding:b,material};events.push('seal');return 'sealed-next';}},
 provider:{refresh:async()=>{events.push('provider');if(failAt==='provider')throw Error('timeout');return result;}}};
 return {svc:createRestrictedCustodyCore(deps),events,get state(){return state;},get sealed(){return sealed;}};
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

test('successful nonrotating refresh seals existing token under next C1 version',async()=>{
 const x=make({result:{kind:'success'}});
 const result=await x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-nonrotating'});
 assert.equal(result.status,'completed');
 assert.equal(x.sealed.material.refresh_token,'fake-old');
 assert.deepEqual(x.sealed.binding,{...binding,credential_version:2});
 assert.equal(JSON.stringify(result).includes('fake-old'),false);
 assert.equal(x.events.filter(e=>e==='provider').length,1);
});

test('rotated refresh token replaces old token only inside custody',async()=>{
 const x=make();
 await x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-rotating'});
 assert.equal(x.sealed.material.refresh_token,'fake-next');
});

test('missing stored refresh material denies before provider dispatch',async()=>{
 for(const material of [null,{}, {refresh_token:''}, {refresh_token:17}]){
  const x=make({material});
  await assert.rejects(x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-missing'}),{code:'custody_denied'});
  assert.equal(x.events.includes('provider'),false);assert.equal(x.sealed,undefined);assert.equal(x.state,'idle');
 }
});

for(const refresh_token of ['',null,17,{}])test('malformed replacement token is held without publication '+JSON.stringify(refresh_token),async()=>{
 const x=make({result:{kind:'success',refresh_token}});
 await assert.rejects(x.svc.refresh({principal:'trusted-service',binding,operationId:'operation-malformed'}),{code:'reconciliation_required'});
 assert.equal(x.state,'recovery_required');assert.equal(x.sealed,undefined);
 assert.equal(x.events.includes('complete'),false);
});

for (const stage of ['authorize','current','claim','read','dispatch','provider','seal','complete']) {
 for (const code of ['stale','custody_denied','unexpected']) {
  test(`sanitizes ${stage} rejection (${code}) without exposing adapter details`,async()=>{
   const secret='SYNTHETIC_SECRET_MUST_NOT_ESCAPE';
   const original=Object.assign(new Error(secret),{code,detail:secret,cause:new Error(secret)});
   const reject=async()=>{throw original;};
   let providerCalls=0;const failures=[];
   const deps={authorize:async()=>true,
    coordinator:{current:async()=>({reference:'sealed'}),claim:async()=>({id:'lease'}),
     dispatch:async(b,l,effect)=>effect(),complete:async()=>{},fail:async(b,l,state)=>{failures.push(state);}},
    vault:{read:async()=>({refresh_token:'fake-old'}),seal:async()=> 'sealed-next'},
    provider:{refresh:async()=>{providerCalls++;if(stage==='provider')throw original;return {kind:'success',refresh_token:'fake-next'};}}};
   if(stage==='authorize')deps.authorize=reject;
   else if(['read','seal'].includes(stage))deps.vault[stage]=reject;
   else if(stage!=='provider')deps.coordinator[stage]=reject;
   const svc=createRestrictedCustodyCore(deps);
   await assert.rejects(svc.refresh({principal:'trusted-service',binding,operationId:'operation-redaction'}),error=>{
    assert.notEqual(error,original);
    assert.equal(error.message.includes(secret),false);
    assert.equal(error.stack.includes(secret),false);
    assert.equal(JSON.stringify(error).includes(secret),false);
    assert.equal(error.cause,undefined);
    assert.ok(['custody_denied','stale','refresh_unavailable','reconciliation_required'].includes(error.code));
    return true;
   });
   const afterDispatch=['provider','seal','complete'].includes(stage);
   assert.equal(providerCalls,afterDispatch?1:0);
   assert.deepEqual(failures,['authorize','current','claim'].includes(stage)?[]:[afterDispatch?'recovery_required':'idle']);
  });
 }
}
