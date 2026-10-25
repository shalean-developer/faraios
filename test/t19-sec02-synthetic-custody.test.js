import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bindingKey} from '../src/t19-c1.js';
import {createSyntheticRestrictedCustody} from '../src/t19-sec02-synthetic-custody.js';
const ids={sealIdentity:'synthetic-sealer-001',publishIdentity:'synthetic-custody-001',verifierIdentity:'synthetic-verifier-001'};
const binding={business_id:'612be091-b1d7-4911-9c3b-143446a9fe27',environment:'synthetic',provider:'synthetic',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-shalean',credential_version:1};
const op='synthetic-operation-001',lease='synthetic-lease-001',ref='synthetic-sealed-reference-001';
const make=()=>createSyntheticRestrictedCustody(ids);
const begin=s=>s.begin({identity:ids.publishIdentity,binding,operation:op,lease});
const verify=s=>s.verifyResult({identity:ids.verifierIdentity,binding,operation:op,lease,result:{kind:'success',receipt:{operation:op,lease,binding:bindingKey(binding)}}});
test('restricted identities and seven-field binding',()=>{
 const s=make();begin(s);
 assert.throws(()=>s.verifyResult({identity:ids.sealIdentity,binding,operation:op,lease,result:{kind:'success'}}));
 assert.throws(()=>s.verifyResult({identity:ids.verifierIdentity,binding,operation:op,lease,result:{kind:'success',receipt:{operation:op,lease,binding:'wrong'}}}));
 verify(s);
 for(const field of Object.keys(binding)){
  const foreign={...binding,[field]:field==='generation'||field==='credential_version'?2:field==='business_id'||field==='connection_id'?'99999999-9999-4999-8999-999999999999':field==='environment'?'staging':field==='provider'?'zoho':'different-org'};
  assert.throws(()=>s.prepare({identity:ids.sealIdentity,binding:foreign,operation:op,lease,reference:ref}),field);
 }
 assert.throws(()=>s.prepare({identity:ids.publishIdentity,binding,operation:op,lease,reference:ref}));
 s.prepare({identity:ids.sealIdentity,binding,operation:op,lease,reference:ref});
 assert.throws(()=>s.publish({identity:ids.sealIdentity,binding,operation:op,lease,reference:ref}));
 s.publish({identity:ids.publishIdentity,binding,operation:op,lease,reference:ref});
 assert.equal(s.reference({identity:ids.publishIdentity,binding}),ref);
 assert.throws(()=>s.publish({identity:ids.publishIdentity,binding,operation:op,lease,reference:ref}));
});
test('uncertain provider response cannot be replayed or published',()=>{
 const s=make();begin(s);
 s.interrupt({identity:ids.publishIdentity,operation:op});
 assert.equal(s.status({identity:ids.publishIdentity,operation:op}),'uncertain');
 assert.throws(()=>s.begin({identity:ids.publishIdentity,binding,operation:'new-operation',lease:'new-lease'}));
 assert.throws(()=>verify(s));
 assert.throws(()=>s.prepare({identity:ids.sealIdentity,binding,operation:op,lease,reference:ref}));
 assert.equal(s.reference({identity:ids.publishIdentity,binding}),null);
});
test('invalid grant is fenced and never auto-refreshes',()=>{
 const s=make();begin(s);
 s.verifyResult({identity:ids.verifierIdentity,binding,operation:op,lease,result:{kind:'invalid_grant'}});
 assert.equal(s.status({identity:ids.publishIdentity,operation:op}),'reauthorisation_required');
 assert.throws(()=>s.begin({identity:ids.publishIdentity,binding,operation:'replay-op',lease:'replay-lease'}));
 assert.throws(()=>s.prepare({identity:ids.sealIdentity,binding,operation:op,lease,reference:ref}));
});
