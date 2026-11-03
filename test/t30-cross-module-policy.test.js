import test from 'node:test';
import assert from 'node:assert/strict';
import {accessibleBusinesses,canAccess,canAccessOwnedRecord} from '../src/access.js';

// T30 cross-module acceptance contract. All identifiers, records and actions
// below are synthetic. This is policy verification, NOT HTTP, RLS, a payment,
// payroll execution, staff invitation, hosted read or a cutover rehearsal.
const S='synthetic-shalean',B='synthetic-bokkie';
const memberships=[
 {userId:'owner-s',businessId:S,role:'owner',status:'active'},
 {userId:'owner-b',businessId:B,role:'owner',status:'active'},
 {userId:'manager-s',businessId:S,role:'manager',status:'active'},
 {userId:'manager-b',businessId:B,role:'manager',status:'active'},
 {userId:'staff-shared',businessId:S,role:'staff',status:'active'},
 {userId:'staff-shared',businessId:B,role:'staff',status:'active'},
 {userId:'staff-b',businessId:B,role:'staff',status:'active'},
 {userId:'former-owner',businessId:S,role:'owner',status:'suspended'},
];
const allowed=(userId,businessId,permission,record)=>{
 const args={userId,businessId,permission,memberships};
 return record?canAccessOwnedRecord({...args,record}):canAccess(args);
};
const record=(businessId,userId,assignedUserIds=[])=>({businessId,userId,assignedUserIds});

test('T30 synthetic roles: each business owns its booking, invoice, payment and payout authority',()=>{
 for(const [business,foreign,owner,manager] of [[S,B,'owner-s','manager-s'],[B,S,'owner-b','manager-b']]){
  assert.deepEqual(accessibleBusinesses(owner,memberships),[business]);
  assert.deepEqual(accessibleBusinesses(manager,memberships),[business]);
  for(const action of ['customers.manage','bookings.manage','staff.read','invoices.manage','payments.record','finance.read']){
   assert.equal(allowed(manager,business,action),true,action+' own '+business);
   assert.equal(allowed(manager,foreign,action),false,action+' foreign '+business);
   assert.equal(allowed(manager,business,action,record(foreign)),false,action+' foreign record '+business);
  }
  for(const action of ['payouts.approve','refunds.issue','payment_settings.manage','members.manage']){
   assert.equal(allowed(owner,business,action),true,action+' owner '+business);
   assert.equal(allowed(owner,foreign,action),false,action+' foreign owner '+business);
   assert.equal(allowed(manager,business,action),false,action+' manager '+business);
  }
 }
 assert.deepEqual(accessibleBusinesses('former-owner',memberships),[]);
 assert.equal(allowed('former-owner',S,'payouts.approve'),false);
 assert.deepEqual(accessibleBusinesses('staff-shared',memberships),[S,B]);
});

test('T30 synthetic teams: shared staff get assigned jobs and own earnings, not tenant finance',()=>{
 const sJob=record(S,'owner-s',['staff-shared']);
 const bJob=record(B,'owner-b',['staff-b']);
 for(const business of [S,B]){
  assert.equal(allowed('staff-shared',business,'finance.read'),false);
  assert.equal(allowed('staff-shared',business,'payments.record'),false);
  assert.equal(allowed('staff-shared',business,'payouts.approve'),false);
  assert.equal(allowed('staff-shared',business,'staff.manage'),false);
 }
 assert.equal(allowed('staff-shared',S,'jobs.assigned.read',sJob),true);
 assert.equal(allowed('staff-shared',B,'jobs.assigned.read',bJob),false);
 assert.equal(allowed('staff-shared',S,'jobs.assigned.update',bJob),false);
 assert.equal(allowed('staff-b',B,'jobs.assigned.read',bJob),true);
 assert.equal(allowed('staff-b',S,'jobs.assigned.read',sJob),false);
 assert.equal(allowed('staff-shared',S,'earnings.own.read',record(S,'staff-shared')),true);
 assert.equal(allowed('staff-shared',S,'earnings.own.read',record(S,'staff-b')),false);
 assert.equal(allowed('staff-shared',B,'earnings.own.read',record(S,'staff-shared')),false);
});

test('T30 synthetic end-to-end separation: no cross-business booking->invoice->payment->payout elevation',()=>{
 for(const [business,foreign,owner,manager] of [[S,B,'owner-s','manager-s'],[B,S,'owner-b','manager-b']]){
  const stages=[['bookings.manage',manager],['invoices.manage',manager],['payments.record',manager],['payouts.approve',owner]];
  for(const [permission,actor] of stages){
   assert.equal(allowed(actor,business,permission,record(business)),true);
   assert.equal(allowed(actor,business,permission,record(foreign)),false);
   assert.equal(allowed(actor,foreign,permission,record(foreign)),false);
  }
  assert.equal(allowed(manager,business,'payouts.approve',record(business)),false);
  assert.equal(allowed('staff-shared',business,'payments.record',record(business)),false);
 }
});
