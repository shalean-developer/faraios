import test from 'node:test';
import assert from 'node:assert/strict';
import { accessibleBusinesses, canAccess, canAccessOwnedRecord } from '../src/access.js';
const memberships = [
  {userId:'farai',businessId:'shalean',role:'owner',status:'active'},
  {userId:'farai',businessId:'bokkie',role:'owner',status:'active'},
  {userId:'manager',businessId:'bokkie',role:'manager',status:'active'},
  {userId:'cleaner',businessId:'shalean',role:'staff',status:'active'},
  {userId:'suspended',businessId:'shalean',role:'owner',status:'suspended'},
];
const request = (userId,businessId,permission) => ({userId,businessId,permission,memberships});
test('business switcher lists only active permitted memberships',()=>{
  assert.deepEqual(accessibleBusinesses('farai',memberships),['shalean','bokkie']);
  assert.deepEqual(accessibleBusinesses('manager',memberships),['bokkie']);
  assert.deepEqual(accessibleBusinesses('suspended',memberships),[]);
});
test('Bokkie manager cannot access Shalean or an unrelated business',()=>{
  assert.equal(canAccess(request('manager','bokkie','bookings.manage')),true);
  for(const business of ['shalean','other']) assert.equal(canAccess(request('manager',business,'bookings.read')),false);
});
test('roles do not grant implicit finance or membership administration',()=>{
  assert.equal(canAccess(request('manager','bokkie','finance.manage')),false);
  assert.equal(canAccess(request('manager','bokkie','members.manage')),false);
  assert.equal(canAccess(request('cleaner','shalean','finance.read')),false);
});
test('missing, revoked and unknown claims fail closed',()=>{
  for(const user of ['',null,'suspended','outsider']) assert.equal(canAccess(request(user,'shalean','business.read')),false);
  for(const role of ['platform_admin','customer','toString','__proto__']) {
    const bad=[{userId:'x',businessId:'shalean',role,status:'active'}];
    assert.equal(canAccess({...request('x','shalean','business.read'),memberships:bad}),false);
  }
  assert.equal(canAccess({...request('farai','shalean','business.read'),memberships:null}),false);
  assert.equal(canAccess(request('farai','shalean','unknown')),false);
});
test('record business is verified independently of selected dashboard',()=>{
  assert.equal(canAccessOwnedRecord({...request('farai','shalean','bookings.read'),record:{businessId:'bokkie'}}),false);
});
test('staff see and update only their assignments in an authorised business',()=>{
  for(const permission of ['jobs.assigned.read','jobs.assigned.update']) {
    const req=request('cleaner','shalean',permission);
    assert.equal(canAccessOwnedRecord({...req,record:{businessId:'shalean',assignedUserIds:['cleaner']}}),true);
    assert.equal(canAccessOwnedRecord({...req,record:{businessId:'shalean',assignedUserIds:['other']}}),false);
    assert.equal(canAccessOwnedRecord({...req,record:{businessId:'bokkie',assignedUserIds:['cleaner']}}),false);
  }
});
test('earnings ownership prevents peer visibility',()=>{
  const req=request('cleaner','shalean','earnings.own.read');
  assert.equal(canAccessOwnedRecord({...req,record:{businessId:'shalean',userId:'cleaner'}}),true);
  assert.equal(canAccessOwnedRecord({...req,record:{businessId:'shalean',userId:'other'}}),false);
});

test('approved manager invoice and payment permissions remain business scoped',()=>{
  for (const permission of ['finance.read','invoices.manage','payments.record']) {
    assert.equal(canAccess(request('manager','bokkie',permission)),true);
    assert.equal(canAccess(request('manager','shalean',permission)),false);
    assert.equal(canAccessOwnedRecord({...request('manager','bokkie',permission),record:{businessId:'shalean'}}),false);
    assert.equal(canAccess(request('cleaner','shalean',permission)),false);
  }
});
test('owner retains restricted financial and administration actions',()=>{
  for (const permission of ['payouts.approve','refunds.issue','payment_settings.manage','members.manage']) {
    assert.equal(canAccess(request('manager','bokkie',permission)),false);
    assert.equal(canAccess(request('farai','bokkie',permission)),true);
  }
});
