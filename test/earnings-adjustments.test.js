import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsAdjustmentEvent,adjustmentPreview} from '../src/earnings-adjustments.js';
const id=n=>'ab000000-0000-4000-8000-'+String(n).padStart(12,'0');
const businessId=id(1),actorId=id(2),workerId=id(3),otherWorker=id(4),sourceId=id(5),bookingId=id(6);
const base={sourceId,bookingId,workerId,originalVersion:3,originalCents:250000,originalPeriod:'2026-10',agreementEvidence:'SYNTHETIC accepted terms',originalRecordEvidence:'SYNTHETIC original amount paid R2500'};
function fixture(){let state=null,n=100;return{get state(){return state;},next(type,payload={},overrides={}){const event={businessId,actorId,role:'owner',key:id(n++),expectedVersion:state?.version??0,at:'2026-10-22T12:00:00+02:00',type,payload,...overrides};state=earningsAdjustmentEvent(state,event);return state;}};}
const proposal=(patch={})=>({sourceId,kind:'reimbursement',deltaCents:5000,reason:'Missed approved transport',evidence:'SYNTHETIC receipt',occurrenceReference:'transport-missed-1',...patch});
const approval=adjustmentId=>({adjustmentId,originalVerificationEvidence:'Original statement checked',entitlementReviewEvidence:'Full pay obligations separately reviewed',reason:'Verified correction'});
test('paid R2500 plus missed R50 creates only R50 correction; replay cannot settle original again',()=>{
 const f=fixture();f.next('register_source',base);f.next('propose',proposal());const a=f.state.adjustments[0].id;
 f.next('approve',approval(a));f.next('freeze_review',{adjustmentId:a,reference:'review1'});
 assert.equal(adjustmentPreview(f.state,{businessId,role:'owner'}).positivePendingCents,5000);
 assert.throws(()=>f.next('simulate_settlement',{adjustmentId:a,amountCents:255000,reference:'TEST'}),/only the correction/);
 const key=id(900);f.next('simulate_settlement',{adjustmentId:a,amountCents:5000,reference:'TEST-NO-MONEY'},{key});
 const state=f.state;f.next('simulate_settlement',{adjustmentId:a.toUpperCase(),amountCents:5000,reference:'TEST-NO-MONEY'},{key:key.toUpperCase(),expectedVersion:0});assert.equal(f.state,state);
 assert.throws(()=>f.next('simulate_settlement',{adjustmentId:a,amountCents:5000,reference:'again'}),/previous simulation/);
 assert.equal(f.state.sources[0].originalCents,250000);assert.equal(f.state.sources[0].originalVersion,3);assert.equal(f.state.adjustments[0].simulation.status,'simulated_only');
 assert.equal(adjustmentPreview(f.state,{businessId,role:'owner'}).positivePendingCents,0);
 assert.equal(f.state.execution,'disabled');assert.ok(Object.isFrozen(f.state.sources[0]));
});
test('managers prepare; only owner approves, rejects, freezes or simulates',()=>{
 const f=fixture();f.next('register_source',base,{role:'manager'});f.next('propose',proposal(),{role:'manager'});const a=f.state.adjustments[0].id;
 for(const [type,p] of [['approve',approval(a)],['reject',{adjustmentId:a,reason:'test'}],['freeze_review',{adjustmentId:a,reference:'test'}],['simulate_settlement',{adjustmentId:a,reference:'test',amountCents:5000}]])assert.throws(()=>f.next(type,p,{role:'manager'}),/Owner approval/);
 assert.throws(()=>f.next('register_source',base,{role:'customer'}),/access denied/);
 assert.throws(()=>f.next('propose',proposal(),{role:'staff',actorId:workerId}),/Staff may only/);
 assert.throws(()=>f.next('approve',approval(a),{businessId:id(99)}),/scope mismatch/);
});
test('reductions require lawful-basis, applicable agreement, fair process and full-entitlement evidence',()=>{
 const f=fixture();f.next('register_source',base);f.next('propose',proposal({kind:'calculation_correction',deltaCents:-5000}));const a=f.state.adjustments[0].id;
 const p={...approval(a),lawfulBasisEvidence:'Verified lawful correction',requiredAgreementEvidence:'Specific accepted agreement checked',fairProcessEvidence:'Worker review and fair process recorded'};
 for(const name of ['lawfulBasisEvidence','requiredAgreementEvidence','fairProcessEvidence','entitlementReviewEvidence']){const bad={...p};delete bad[name];assert.throws(()=>f.next('approve',bad),/evidence/);}
 f.next('approve',p);assert.equal(f.state.adjustments[0].newCents,245000);assert.equal(f.state.sources[0].originalCents,250000);
});
test('no fines, nonpayment, damage, refund clawbacks or negative reimbursements',()=>{
 const f=fixture();f.next('register_source',base);
 for(const kind of ['fine','damage','customer_nonpayment','refund_clawback','overpayment_recovery'])assert.throws(()=>f.next('propose',proposal({kind})),/Unsupported reason/);
 for(const kind of ['reimbursement','additional_agreed_work'])assert.throws(()=>f.next('propose',proposal({kind,deltaCents:-1})),/Only reviewed/);
 assert.throws(()=>f.next('propose',proposal({kind:'additional_agreed_work'})),/evidence/);
 f.next('propose',proposal({kind:'additional_agreed_work',approvedRuleEvidence:'Agreed extra under saved rule3'}));const a=f.state.adjustments[0].id;
 assert.throws(()=>f.next('approve',approval(a)),/evidence/);f.next('approve',{...approval(a),approvedRuleVerification:'Saved rule/cap and agreement verified'});
});
test('one cleaner dispute never blocks another valid positive correction; staff only their own',()=>{
 const f=fixture();f.next('register_source',base);f.next('register_source',{...base,sourceId:id(7),workerId:otherWorker});
 f.next('propose',proposal());const a=f.state.adjustments[0].id;f.next('approve',approval(a));f.next('freeze_review',{adjustmentId:a,reference:'frozen1'});
 f.next('propose',proposal({sourceId:id(7)}));const b=f.state.adjustments[1].id;f.next('approve',approval(b));f.next('freeze_review',{adjustmentId:b,reference:'frozen2'});
 assert.throws(()=>f.next('raise_dispute',{adjustmentId:a,reason:'dispute',evidence:'test'},{role:'staff',actorId:otherWorker}),/own adjustment/);
 f.next('raise_dispute',{adjustmentId:a,reason:'Please review',evidence:'SYNTHETIC worker request'},{role:'staff',actorId:workerId});
 assert.equal(f.state.adjustments[0].frozen,null);assert.equal(adjustmentPreview(f.state,{businessId,role:'owner'}).positivePendingCents,5000);
 assert.throws(()=>f.next('simulate_settlement',{adjustmentId:a,amountCents:5000,reference:'TEST'}),/undisputed/);
 f.next('resolve_dispute',{adjustmentId:a,reason:'Reviewed evidence',workerReviewEvidence:'Worker review route preserved'});assert.equal(f.state.adjustments[0].frozen,null);
 f.next('freeze_review',{adjustmentId:a,reference:'renewed review'});assert.equal(adjustmentPreview(f.state,{businessId,role:'owner'}).positivePendingCents,10000);
});
test('snapshot, version, occurrence and replacement links prevent silent rewrite and stale approval',()=>{
 const f=fixture();f.next('register_source',base);assert.throws(()=>f.next('register_source',{...base,sourceId:id(8)}),/already registered/);
 f.next('propose',proposal());const a=f.state.adjustments[0].id;
 assert.throws(()=>f.next('propose',proposal()),/linked replacement/);
 f.next('propose',proposal({kind:'calculation_correction',deltaCents:1000,occurrenceReference:'other-error'}));const b=f.state.adjustments[1].id;
 f.next('approve',approval(a));assert.throws(()=>f.next('approve',approval(b)),/Source changed/);
 f.next('reject',{adjustmentId:b,reason:'Stale basis; prepare linked replacement'});
 f.next('propose',proposal({kind:'calculation_correction',deltaCents:1000,occurrenceReference:'other-error',supersedesId:b}));const c=f.state.adjustments[2].id;f.next('approve',approval(c));
 assert.equal(f.state.adjustments[2].supersedesId,b);assert.equal(f.state.adjustments[1].status,'rejected');assert.equal(f.state.adjustments[2].oldCents,250000);assert.equal(f.state.adjustments[2].newCents,251000);
 assert.throws(()=>f.next('reject',{adjustmentId:c,reason:'erase'}),/cannot be erased/);
});
test('unknowns stay unknown; negative/overflow/invalid dates and injected identity fields fail closed',()=>{
 for(const originalCents of [undefined,null,'250000',-1,2147483648]){const f=fixture();assert.throws(()=>f.next('register_source',{...base,originalCents}),/integer-cent/);assert.equal(f.state,null);}
 const f=fixture();f.next('register_source',base);
 for(const deltaCents of [null,'5000',0,2147483648,-250001])assert.throws(()=>f.next('propose',proposal({kind:'calculation_correction',deltaCents})));
 for(const patch of [{id:id(90)},{workerId:otherWorker},{oldCents:0},{status:'approved'},{newCents:999}])assert.throws(()=>f.next('propose',proposal(patch)),/field/);
 for(const at of ['2026-02-30T12:00:00Z','2026-10-22 12:00:00Z','2026-10-22T24:00:00Z','2026-10-22T12:60:00Z'])assert.throws(()=>f.next('propose',proposal(),{at}));
 assert.throws(()=>f.next('propose',proposal({evidence:'\u00a0'})),/evidence/);
 assert.throws(()=>f.next('propose',proposal(),{key:'00000000-0000-0000-0000-000000000000'}),/reference/);
});
test('replay requires same actor, role and content; stale and out-of-order events cannot mutate history',()=>{
 const f=fixture(),key=id(800);f.next('register_source',base,{key});const state=f.state;
 assert.throws(()=>f.next('register_source',{...base,originalCents:999},{key}),/different details/);
 assert.throws(()=>f.next('register_source',base,{key,actorId:workerId}),/different details/);
 assert.throws(()=>f.next('propose',proposal(),{expectedVersion:0}),/History changed/);
 assert.throws(()=>f.next('propose',proposal(),{at:'2026-10-21T12:00:00Z'}),/precedes/);
 assert.equal(f.state,state);assert.equal(f.state.version,1);
 assert.throws(()=>adjustmentPreview(state,{businessId:id(99),role:'owner'}),/scope/);
 assert.throws(()=>adjustmentPreview(state,{businessId,role:'staff'}),/authenticated own-record/);
});
