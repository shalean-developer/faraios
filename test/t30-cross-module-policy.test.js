import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderEft} from '../src/t21-eft.js';
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


test('T30 EFT mobile form contracts: labels, fields and receipt wrapping remain scoped to EFT',()=>{
 const business={id:'synthetic-business',name:'Synthetic Business'};
 const html=renderEft(business,[{
  id:'synthetic-receipt',
  bank_reference:'SYNTHETIC-RECEIPT-LONG-REFERENCE-123456789',
  amount_cents:35500,
  received_on:'2026-11-02',
  evidence_reference:'SYNTHETIC-EVIDENCE',
  invoice_id:null,
  verified_at:'2026-11-02T00:00:00Z',
  recorded_by:'synthetic-user',
  recorded_at:'2026-11-02T00:00:00Z',
  verified_by:'synthetic-user',
 }]);
 for(const scope of ['eft-record','eft-payment','eft-receipts']){
  assert.match(html,new RegExp('class="panel '+scope+'"'));
 }
 for(const field of ['bankReference','evidenceReference','amount','receivedOn','invoice','invoiceId']){
  assert.match(html,new RegExp('name="'+field+'"'));
 }
 assert.match(html,/SYNTHETIC-RECEIPT-LONG-REFERENCE/);
 assert.match(html,/Match verified payment/);
 const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
 assert.match(css,/\.eft-record form>label/);
 assert.match(css,/\.eft-record form>label>input/);
 assert.match(css,/\.eft-receipts article\{[^}]*overflow-wrap:anywhere/);
 assert.match(css,/@media\(max-width:600px\)\{\s*\.eft-record form/);
 assert.match(css,/\.eft-payment form>label>input/);
});
