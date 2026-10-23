import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCancellation,allocateCancellationPool,cancellationEvent,cancellationPolicyVersion,refundTargetDate} from '../src/cancellation-review.js';
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const fixture=(patch={})=>({policyVersion:cancellationPolicyVersion,agreementKind:'new_accepted',acceptanceEvidence:'Synthetic prospective terms accepted',cause:'customer',action:'cancel',stage:'accepted',originalStart:'2026-10-24T09:00:00+02:00',requestedAt:'2026-10-23T10:00:00+02:00',stageTimes:{accepted:'2026-10-22T09:00:00+02:00'},workers:[1,2,3,4].map(n=>({id:id(n),agreedCents:30000,expenseCents:0})),eligibleLabourCents:200000,reasonableLossCents:30000,verifiedReceiptsCents:225000,performedServiceCents:0,completedRefundsCents:0,pendingRefundsCents:0,reviewedCustomerFeeCents:30000,collectedPoolCents:30000,mandatoryRightsReviewed:true,feeMustBeWaived:false,holidays:[],...patch});

test('exact 24-hour boundary is free; one second inside is late and stronger rights override',()=>{
 const early=fixture({requestedAt:'2026-10-23T09:00:00+02:00',reviewedCustomerFeeCents:0,collectedPoolCents:0});
 assert.equal(assessCancellation(early).late,false);assert.equal(assessCancellation(early).refundableCents,225000);
 assert.equal(assessCancellation(fixture({requestedAt:'2026-10-23T09:00:01+02:00'})).late,true);
 assert.throws(()=>assessCancellation({...early,reviewedCustomerFeeCents:1}),/ceiling/);
 assert.throws(()=>assessCancellation(fixture({feeMustBeWaived:true})),/ceiling/);
 assert.equal(assessCancellation(fixture({feeMustBeWaived:true,reviewedCustomerFeeCents:0,collectedPoolCents:0})).customerFeeCents,0);
});
test('whole-booking charge is capped by labour, loss and R300, not headcount',()=>{
 for(const [patch,ceiling] of [[{eligibleLabourCents:19999},9999],[{reasonableLossCents:7000},7000],[{},30000]]){
  const x=fixture({...patch,reviewedCustomerFeeCents:ceiling,collectedPoolCents:ceiling});assert.equal(assessCancellation(x).feeCeilingCents,ceiling);
  assert.throws(()=>assessCancellation({...x,reviewedCustomerFeeCents:ceiling+1}),/ceiling/);
 }
 assert.throws(()=>assessCancellation(fixture({verifiedReceiptsCents:0})),/collected/);
});
test('customer pools allocate actual collected compensation proportionally without company top-up',()=>{
 for(const [pool,each] of [[30000,7500],[20000,5000],[0,0]])assert.deepEqual(assessCancellation(fixture({collectedPoolCents:pool})).compensation.map(w=>w.amountCents),[each,each,each,each]);
 const rows=[{id:id(2),agreedCents:20000,expenseCents:0},{id:id(1),agreedCents:10000,expenseCents:0},{id:id(3),agreedCents:0,expenseCents:0}];
 assert.deepEqual(allocateCancellationPool(100,rows).map(w=>w.amountCents),[33,67,0]);
 assert.deepEqual(allocateCancellationPool(1,fixture().workers).map(w=>w.amountCents),[1,0,0,0]);
 assert.throws(()=>allocateCancellationPool(100,[{id:id(1),agreedCents:0,expenseCents:0}]),/positive accepted/);
});
test('company cancellation tiers do not stack and are not limited by customer fee ceiling',()=>{
 for(const [stage,requestedAt,expected] of [['accepted','2026-10-23T09:00:00+02:00',0],['accepted','2026-10-23T10:00:00+02:00',60000],['travelling','2026-10-24T08:00:00+02:00',60000],['arrived','2026-10-24T09:00:00+02:00',120000],['started','2026-10-24T09:30:00+02:00',120000]]){
  const x=fixture({cause:'business',stage,requestedAt,reviewedCustomerFeeCents:0,collectedPoolCents:0,stageTimes:{accepted:'2026-10-22T09:00:00+02:00',travelling:'2026-10-24T07:00:00+02:00',arrived:'2026-10-24T08:30:00+02:00',started:'2026-10-24T09:00:00+02:00'},accessConfirmedAt:'2026-10-24T06:30:00+02:00'});
  const result=assessCancellation(x);assert.equal(result.compensationTotalCents,expected);assert.equal(result.customerFeeCents,0);assert.equal(result.companyFunded,true);
 }
 const x=fixture({cause:'business',reviewedCustomerFeeCents:0,collectedPoolCents:0});x.workers[0].expenseCents=5000;assert.equal(assessCancellation(x).expenseTotalCents,5000);
});
test('partial performance, pending refunds and completed refunds cannot be refunded twice',()=>{
 const r=assessCancellation(fixture({performedServiceCents:50000,completedRefundsCents:20000,pendingRefundsCents:10000}));assert.equal(r.refundableCents,115000);
 assert.throws(()=>assessCancellation(fixture({completedRefundsCents:226000})),/exceed verified/);
 const unpaid=assessCancellation(fixture({verifiedReceiptsCents:0,collectedPoolCents:0}));assert.equal(unpaid.refundableCents,0);assert.equal(unpaid.customerBalanceDueCents,30000);assert.equal(unpaid.compensationTotalCents,0);
});
test('rescheduling retains original-slot fee, credits and new price acceptance',()=>{
 const x=fixture({action:'reschedule',newDateAccepted:true,newStart:'2026-10-26T09:00:00+02:00',newAgreedTotalCents:240000,newAgreementEvidence:'Synthetic agreed change'});
 const r=assessCancellation(x);assert.equal(r.customerFeeCents,30000);assert.equal(r.creditCents,195000);assert.equal(r.newBalanceCents,45000);
 assert.throws(()=>assessCancellation({...x,newDateAccepted:false}),/customer acceptance/);
});
test('unknown evidence, old agreements, duplicate workers and invalid event chronology block assessment',()=>{
 for(const patch of [{agreementKind:'existing'},{mandatoryRightsReviewed:false},{eligibleLabourCents:null},{acceptanceEvidence:''},{requestedAt:'2026-10-23T10:00:00'},{workers:[fixture().workers[0],fixture().workers[0]]},{stage:'travelling',accessConfirmedAt:null},{stageTimes:{accepted:'2026-10-24T12:00:00+02:00'}}])assert.throws(()=>assessCancellation(fixture(patch)));
});
test('business-day targets start at request and include reviewed holidays',()=>{
 assert.equal(refundTargetDate('2026-10-23T10:00:00+02:00',1,[]),'2026-10-26');
 assert.equal(refundTargetDate('2026-10-23T10:00:00+02:00',5,['2026-10-26']),'2026-11-02');
 assert.throws(()=>refundTargetDate('2026-10-23T10:00:00+02:00',5,null),/calendar/);
});

const event=(record,type,payload={},n=1,patch={})=>cancellationEvent(record,{businessId:id(90),actorId:id(91),role:'owner',expectedVersion:record?.version??0,key:id(100+n),type,payload,at:'2026-10-23T12:00:00+02:00',...patch});
test('preparer cannot approve; scope, immutable history, replay and stale versions are enforced',()=>{
 const r=event(null,'prepare',fixture(),1,{role:'manager'});assert.equal(r.status,'prepared');assert.equal(Object.isFrozen(r.input),true);
 assert.throws(()=>event(r,'approve',{reason:'reviewed'},2,{role:'manager'}),/Owner/);
 assert.throws(()=>event(r,'approve',{reason:'reviewed'},2,{businessId:id(99)}),/scope/);
 assert.throws(()=>event(r,'approve',{reason:'reviewed'},2,{expectedVersion:0}),/changed/);
 assert.deepEqual(event(r,'prepare',fixture(),1,{role:'manager',expectedVersion:0}),r);
 assert.throws(()=>event(r,'prepare',fixture({collectedPoolCents:0}),1),/different/);
 const approved=event(r,'approve',{reason:'Reviewed synthetic rights and amounts'},2);assert.equal(approved.version,2);assert.equal(r.status,'prepared');
});
test('refund reservations prevent over-refund; uncertain submission remains reserved; completion is distinct',()=>{
 let r=event(null,'prepare',fixture(),1);r=event(r,'approve',{reason:'Synthetic approval'},2);
 const payload={amountCents:100000,receiptReference:'TEST-PAYMENT',route:'test-card',originalRoute:'test-card'};
 r=event(r,'reserve_refund',payload,3);assert.throws(()=>event(r,'reserve_refund',payload,4),/exceeds/);
 assert.throws(()=>event(r,'complete_refund',{refundId:id(103),reference:'TEST-COMPLETE'},4),/submission/);
 r=event(r,'submit_refund',{refundId:id(103),reference:'TEST-SUBMITTED'},4);assert.equal(r.refunds[0].status,'submitted');
 assert.throws(()=>event(r,'release_refund',{refundId:id(103),reference:'No confirmation'},5),/uncertain/);
 r=event(r,'complete_refund',{refundId:id(103),reference:'TEST-RECEIVED'},6);assert.equal(r.refunds[0].status,'completed');assert.equal(r.result.execution,'disabled');
 assert.throws(()=>event(r,'complete_refund',{refundId:id(103),reference:'REPLAY'},7),/submission/);
});
