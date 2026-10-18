import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCleaningRules,createPriceSnapshot} from '../src/cleaning-rules.js';
const fixture = () => ({businessId:'example-a',version:'test-v1',currency:'ZAR',pricing:{model:'fixed',rateCents:12345},earnings:{model:'fixed_per_worker',rateCents:5000},payoutSchedule:'monthly_bank_transfer',cancellationPolicyVersion:'test-c1',recurrencePolicyVersion:'test-r1'});
test('independent businesses use independently versioned configurations',()=>{
  const a=fixture(),b={...fixture(),businessId:'example-b',version:'test-v2',pricing:{model:'fixed',rateCents:54321}};
  assert.equal(createPriceSnapshot({businessId:a.businessId,rules:a,quantity:1}).amountCents,12345);
  assert.equal(createPriceSnapshot({businessId:b.businessId,rules:b,quantity:1}).amountCents,54321);
  assert.throws(()=>validateCleaningRules(a,'example-b'),/scope/);
});
test('invalid money and unknown pricing models are rejected',()=>{
  for(const rateCents of [-1,1.2,NaN,Infinity,'100',Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>validateCleaningRules({...fixture(),pricing:{model:'fixed',rateCents}},'example-a'));
  assert.throws(()=>validateCleaningRules({...fixture(),pricing:{model:'arbitrary',rateCents:100}},'example-a'));
});
test('earnings options require explicit bounded parameters',()=>{
  for(const basisPoints of [-1,10001,1.1,'5000']) assert.throws(()=>validateCleaningRules({...fixture(),earnings:{model:'percentage_pool',basisPoints}},'example-a'));
  assert.equal(validateCleaningRules({...fixture(),earnings:{model:'percentage_pool',basisPoints:3500}},'example-a'),true);
  assert.throws(()=>validateCleaningRules({...fixture(),earnings:{model:'fixed_per_worker',rateCents:-1}},'example-a'));
});
test('historical snapshot is unchanged by later catalogue edits',()=>{
  const rules=fixture(), snapshot=createPriceSnapshot({businessId:'example-a',rules,quantity:1});
  rules.pricing.rateCents=99999;rules.version='test-v2';
  assert.equal(snapshot.amountCents,12345);assert.equal(snapshot.ruleVersion,'test-v1');
  assert.equal(Object.isFrozen(snapshot),true);
});
test('quantities and multiplication cannot produce unsafe or ambiguous amounts',()=>{
  for(const quantity of [0,-1,1.5,2,'1']) assert.throws(()=>createPriceSnapshot({businessId:'example-a',rules:fixture(),quantity}));
  const rules={...fixture(),pricing:{model:'hourly',rateCents:12345}};
  assert.equal(createPriceSnapshot({businessId:'example-a',rules,quantity:3}).amountCents,37035);
  assert.throws(()=>createPriceSnapshot({businessId:'example-a',rules:{...rules,pricing:{model:'per_unit',rateCents:Number.MAX_SAFE_INTEGER}},quantity:2}));
});
test('currency, policy references and payout settings have no implicit defaults',()=>{
  for(const patch of [{currency:'USD'},{version:''},{payoutSchedule:'weekly'},{cancellationPolicyVersion:''},{recurrencePolicyVersion:null}]) assert.throws(()=>validateCleaningRules({...fixture(),...patch},'example-a'));
});
