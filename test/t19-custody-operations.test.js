import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustodyOperations} from '../src/t19-custody-operations.js';
import {createZohoCustodyProvider} from '../src/t19-zoho-custody-provider.js';
const id='33333333-3333-4333-8333-333333333333';
const binding={business_id:'11111111-1111-4111-8111-111111111111',environment:'staging',provider:'zoho',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'123',credential_version:1};
function setup(){
 let machine={id:'machine-a',active:true},record={id,machine_id:'machine-a',kind:'refresh',authorized:true,binding:{...binding}};
 let material={binding:{...binding},api_domain:'https://www.zohoapis.com',client_id:'fake-client',client_secret:'fake-secret',refresh_token:'fake-refresh'};
 let state='idle',calls=0,reads=0;const actions=[];
 const hooks={};
 const service=createCustodyOperations({authenticateMachine:async()=>machine,
  resolveAuthorizedOperation:async({action,...args})=>{actions.push(action);assert.equal(args.machineId,'machine-a');await hooks.resolve?.(action);return record;},
  vault:{read:async()=>{reads++;await hooks.read?.();return structuredClone(material);},seal:async(b,m)=>{material=structuredClone(m);return 'next';}},
  coordinator:{current:async()=>({reference:'sealed'}),claim:async()=>({id:'lease'}),
   dispatch:async(b,l,effect)=>{state='dispatched';return effect();},complete:async(b)=>{state='published';record.binding={...b,credential_version:b.credential_version+1};},
   fail:async(b,l,s)=>{state=s;}},
  provider:createZohoCustodyProvider({fetchImpl:async()=>{calls++;await hooks.provider?.();return new Response(JSON.stringify({access_token:'fake-access',api_domain:'https://www.zohoapis.com',token_type:'Bearer',expires_in:3600}));}})});
 return {service,hooks,actions,set machine(v){machine=v;},set record(v){record=v;},get record(){return record;},get calls(){return calls;},get reads(){return reads;},get state(){return state;}};
}
test('server operation binds actual provider adapter and seals next-version material for subsequent refresh',async()=>{
 const x=setup();
 assert.deepEqual(await x.service.refresh({}, {operationId:id}),{operationId:id,status:'completed'});
 assert.equal(x.state,'published');assert.equal(x.record.binding.credential_version,2);
 // A separate authorised job verifies the successor material's version binding.
 // This harness is not a durable replay oracle.
 const nextId='44444444-4444-4444-8444-444444444444';x.record.id=nextId;
 assert.deepEqual(await x.service.refresh({}, {operationId:nextId}),{operationId:nextId,status:'completed'});
 assert.equal(x.record.binding.credential_version,3);assert.equal(x.calls,2);
 assert.equal(JSON.stringify(x.actions).includes('fake-'),false);
});
test('rejects caller business, role, binding and provider-outcome claims before secret access',async()=>{
 for(const extra of [{business_id:binding.business_id},{role:'owner'},{binding},{kind:'success'},{principal:'machine-a'}]){
  const x=setup();await assert.rejects(x.service.refresh({}, {operationId:id,...extra}),{code:'custody_denied'});
  assert.equal(x.reads,0);assert.equal(x.calls,0);
 }
});
test('unverified, inactive and wrong-machine jobs deny before vault access',async()=>{
 for(const mutate of [x=>{x.machine=null;},x=>{x.machine={id:'machine-a',active:false};},x=>{x.record={...x.record,machine_id:'machine-b'};},x=>{x.record={...x.record,authorized:false};},x=>{x.record={...x.record,id:'foreign'};},x=>{x.record=null;}]){
  const x=setup();mutate(x);await assert.rejects(x.service.refresh({}, {operationId:id}),{code:'custody_denied'});assert.equal(x.reads,0);assert.equal(x.calls,0);
 }
});
test('machine revoked while vault read is pending prevents provider dispatch',async()=>{
 const x=setup();x.hooks.read=()=>{x.machine={id:'machine-a',active:false};};
 await assert.rejects(x.service.refresh({}, {operationId:id}),{code:'custody_denied'});
 assert.equal(x.calls,0);assert.equal(x.state,'idle');
});
test('server operation changes tenant during vault read: no dispatch',async()=>{
 const x=setup();x.hooks.read=()=>{x.record.binding={...binding,business_id:'99999999-9999-4999-8999-999999999999'};};
 await assert.rejects(x.service.refresh({}, {operationId:id}),{code:'custody_denied'});assert.equal(x.calls,0);
});
test('revoked authority after provider response holds operation without publication',async()=>{
 const x=setup();x.hooks.provider=()=>{x.record.authorized=false;};
 await assert.rejects(x.service.refresh({}, {operationId:id}),{code:'custody_denied'});
 assert.equal(x.calls,1);assert.equal(x.state,'recovery_required');
});
test('resolver errors never leave service with secret text or cause',async()=>{
 const x=setup();x.hooks.resolve=()=>{throw Object.assign(Error('fake-private'),{cause:Error('fake-private')});};
 await assert.rejects(x.service.refresh({}, {operationId:id}),e=>e.message==='custody_denied'&&e.cause===undefined&&!e.stack.includes('fake-private'));
 assert.equal(x.calls,0);
});
