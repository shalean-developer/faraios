import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWorkspace} from '../src/workspace.js';
const identity={userId:'u',businesses:[{id:'a',name:'Alpha & Co'},{id:'b',name:'Beta <script>'},{id:'c',name:'Forbidden'}],memberships:[{userId:'u',businessId:'a',role:'owner',status:'active'},{userId:'u',businessId:'b',role:'staff',status:'active'},{userId:'other',businessId:'c',role:'owner',status:'active'}]};
test('combined workspace includes only authorised businesses and escapes names',()=>{
 const html=renderWorkspace(identity);assert.match(html,/Alpha &amp; Co/);assert.match(html,/Beta &lt;script&gt;/);assert.doesNotMatch(html,/Forbidden|<script>/);assert.match(html,/All authorised businesses/);
});
test('selected staff workspace excludes owner and business finance controls',()=>{
 const html=renderWorkspace(identity,'b');assert.match(html,/My assignments/);assert.match(html,/My earnings/);assert.doesNotMatch(html,/Business finances|>Finance<|Business settings|Team access|payout approval/);assert.match(html,/>Alpha &amp; Co<\/option>/);assert.doesNotMatch(html,/<strong>Alpha/);
});
test('manager can see finance module without owner controls',()=>{
 const html=renderWorkspace({...identity,memberships:[{userId:'u',businessId:'a',role:'manager',status:'active'}]},'a');assert.match(html,/>Finance</);assert.match(html,/manage invoices and record payments/);assert.doesNotMatch(html,/Business settings|Team access|payout approval/);
});
test('unauthorised selection fails closed and revoked memberships give empty state',()=>{
 assert.throws(()=>renderWorkspace(identity,'c'),/denied/);
 const html=renderWorkspace({...identity,memberships:identity.memberships.map(m=>({...m,status:'suspended'}))});assert.match(html,/No business access assigned/);assert.doesNotMatch(html,/Alpha|Beta|Business view/);
});
