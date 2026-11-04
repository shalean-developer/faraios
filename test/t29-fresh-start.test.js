import test from 'node:test';
import assert from 'node:assert/strict';
import {accessibleBusinesses, canAccess, canAccessOwnedRecord} from '../src/access.js';

// T29 fresh-start policy-only fixtures. No DB, network, providers or customer data.
const businessIds = Object.freeze({shalean:'t29-shalean',bokkie:'t29-bokkie'});
const memberships = [
 {userId:'owner-s',businessId:businessIds.shalean,role:'owner',status:'active'},
 {userId:'owner-b',businessId:businessIds.bokkie,role:'owner',status:'active'},
 {userId:'manager-b',businessId:businessIds.bokkie,role:'manager',status:'active'},
 {userId:'shared-owner',businessId:businessIds.shalean,role:'owner',status:'active'},
 {userId:'shared-owner',businessId:businessIds.bokkie,role:'owner',status:'active'},
 {userId:'former-s',businessId:businessIds.shalean,role:'owner',status:'suspended'},
];
const req=(userId,businessId,permission,record)=>({userId,businessId,permission,memberships,record});

test('T29: fresh businesses share policy but do not gain implicit cross-business membership',()=>{
 assert.deepEqual(accessibleBusinesses('owner-s',memberships),[businessIds.shalean]);
 assert.deepEqual(accessibleBusinesses('manager-b',memberships),[businessIds.bokkie]);
 assert.deepEqual(accessibleBusinesses('shared-owner',memberships),[businessIds.shalean,businessIds.bokkie]);
 assert.deepEqual(accessibleBusinesses('former-s',memberships),[]);
});

test('T29: new customer, booking, quote and invoice records remain business-owned',()=>{
 const actions=['customers.manage','bookings.manage','quotes.manage','invoices.manage'];
 for(const action of actions){
  assert.equal(canAccess(req('owner-s',businessIds.shalean,action)),true);
  assert.equal(canAccess(req('manager-b',businessIds.shalean,action)),false);
  assert.equal(canAccessOwnedRecord(req('owner-s',businessIds.shalean,action,{businessId:businessIds.bokkie})),false);
  assert.equal(canAccessOwnedRecord(req('manager-b',businessIds.bokkie,action,{businessId:businessIds.bokkie})),true);
 }
});

test('T29: a shared owner must select the record-owning business explicitly',()=>{
 assert.equal(canAccessOwnedRecord(req('shared-owner',businessIds.shalean,'bookings.read',{businessId:businessIds.bokkie})),false);
 assert.equal(canAccessOwnedRecord(req('shared-owner',businessIds.bokkie,'bookings.read',{businessId:businessIds.bokkie})),true);
});

test('T29: fresh-start does not infer privileged money movement from booking access',()=>{
 for(const action of ['payouts.approve','refunds.issue','payment_settings.manage']){
  assert.equal(canAccess(req('manager-b',businessIds.bokkie,action)),false);
  assert.equal(canAccess(req('owner-b',businessIds.bokkie,action)),true);
  assert.equal(canAccess(req('owner-b',businessIds.shalean,action)),false);
 }
});
