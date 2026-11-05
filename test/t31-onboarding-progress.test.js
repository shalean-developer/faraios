import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingProgress,renderOnboardingProgress} from '../src/t31-onboarding-progress.js';
import {renderWorkspace} from '../src/workspace.js';
const a='10000000-0000-4000-8000-000000000031',b='10000000-0000-4000-8000-000000000032',uid='00000000-0000-4000-8000-000000000031';
const details={display_name:'Independent Cleaning',contact_email:'hello@example.invalid',service_areas:['Cape Town'],working_days:[1,2,3,4,5],opens_at:'08:00:00',closes_at:'17:00:00',time_zone:'Africa/Johannesburg'};
const items=[{kind:'service',is_active:true,price_cents:50000},{kind:'extra',is_active:true,price_cents:2500}];
test('T31 onboarding progress follows persisted business configuration, never browser flags',()=>{
 assert.deepEqual(onboardingProgress(null,[]),{profile:false,serviceAreas:false,operatingHours:false,services:false,branding:false,completed:0,total:5});
 assert.deepEqual(onboardingProgress(details,items,{accent_color:'#146C94'}),{profile:true,serviceAreas:true,operatingHours:true,services:true,branding:true,completed:5,total:5});
 assert.equal(onboardingProgress({...details,service_areas:[]},items).completed,3);
 assert.equal(onboardingProgress(details,[{kind:'service',is_active:false,price_cents:50000}]).services,false);
 assert.equal(onboardingProgress(details,[{kind:'service',is_active:true,price_cents:-1}]).services,false);
 assert.equal(onboardingProgress(details,items).branding,false);
});
test('T31 progress markup escapes tenant names and links only to selected ID',()=>{
 const html=renderOnboardingProgress({id:a,name:'<script>bad</script>'},onboardingProgress(details,items));
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,new RegExp('/catalogue\\?business='+a));
 assert.doesNotMatch(html,new RegExp(b));
});
test('T31 workspace invites owner to continue setup, not unrelated staff',()=>{
 const identity={userId:uid,businesses:[{id:a,name:'First'},{id:b,name:'Second'}],memberships:[{businessId:a,userId:uid,role:'owner',status:'active'},{businessId:b,userId:uid,role:'staff',status:'active'}]};
 const owner=renderWorkspace(identity,a);
 assert.match(owner,new RegExp('/onboarding\\?business='+a));
 assert.doesNotMatch(owner,new RegExp('/onboarding\\?business='+b));
 const staff=renderWorkspace(identity,b);
 assert.doesNotMatch(staff,new RegExp('/onboarding\\?business='+b));
 assert.match(staff,/Create another cleaning business/);
 const restore=renderWorkspace(identity,a,{restoreTest:true});
 assert.doesNotMatch(restore,/Create another cleaning business/);
});
