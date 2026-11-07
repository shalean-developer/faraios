import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWorkspace} from '../src/workspace.js';
const userId='00000000-0000-4000-8000-000000000001';
const a='80f99b17-c16c-492e-bb5a-50fe81e64985',b='d6657d58-0777-457d-8853-d8fde2e1ef1f';
const identity=role=>({onboardingPreview:true,userId,businesses:[{id:a,name:'Same company'},{id:b,name:'Same company'},{id:'foreign',name:'Hidden company'}],memberships:[a,b].map(businessId=>({userId,businessId,role,status:'active'}))});
test('selector has distinct compact references, one action per business, and no duplicated filter',()=>{
 const html=renderWorkspace(identity('owner'));
 assert.match(html,/80f99b17…4985/);assert.match(html,/d6657d58…ef1f/);
 assert.equal((html.match(/>Open workspace<\/a>/g)||[]).length,2);
 assert.doesNotMatch(html,/Open setup|<select|Select a business|Hidden company/);
 assert.match(html,/id="business"/);
 assert.match(html,new RegExp('business='+a));
});
test('preview manager and cleaner views contain no owner actions',()=>{
 for(const role of ['manager','staff']){
  const all=renderWorkspace(identity(role)),selected=renderWorkspace(identity(role),a);
  assert.doesNotMatch(all+selected,/Create business|>Setup<|Open setup/);
  assert.doesNotMatch(all,/Hidden company/);
  if(role==='manager')assert.match(selected,/>Services<\/a>/);
  else assert.doesNotMatch(selected,/>Services<\/a>/);
 }
});
test('owner controls follow selected membership, labels escape, foreign selection fails closed',()=>{
 const i=identity('owner');i.memberships[1].role='manager';
 assert.match(renderWorkspace(i,a),/Create business|>Setup<\/a>/);
 assert.doesNotMatch(renderWorkspace(i,b),/Create business|>Setup<\/a>/);
 i.businesses[0].name='<img src=x onerror=alert(1)>';
 assert.doesNotMatch(renderWorkspace(i),/<img/);
 assert.match(renderWorkspace(i),/&lt;img/);
 assert.throws(()=>renderWorkspace(i,'foreign'),/denied/);
});
