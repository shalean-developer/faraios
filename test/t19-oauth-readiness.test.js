import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareZohoConnectionStatus,renderZohoReadiness} from '../src/t19-oauth-readiness.js';
import {renderInvoices} from '../src/invoices.js';
const a='612be091-b1d7-4911-9c3b-143446a9fe27',b='0cc3f518-d64e-40c2-8817-bc14d1ef1420';
const conn=(business_id,organization_id)=>({business_id,organization_id,environment:'staging',api_domain:'https://www.zohoapis.com',enabled:false});
const status=(businessId,connection,ownerVerified=true,environment='staging')=>prepareZohoConnectionStatus({businessId,connection,ownerVerified,environment});
test('separate owner business identities remain scoped',()=>{assert.equal(status(a,conn(a,'943440851')).organizationId,'943440851');assert.equal(status(b,conn(b,'943440162')).organizationId,'943440162');});
test('cross-business credential substitution denied',()=>assert.equal(status(b,conn(a,'943440851')).reason,'binding_denied'));
test('missing verified owner is denied',()=>assert.equal(status(b,conn(b,'943440162'),false).reason,'owner_required'));
test('manager-equivalent nonowner cannot authorise',()=>assert.equal(status(b,conn(b,'943440162'),false).canAuthorize,false));
test('untrusted actor metadata cannot override ownerVerified',()=>assert.equal(prepareZohoConnectionStatus({businessId:a,ownerVerified:false,actor:{platformAdmin:true,memberships:[{businessId:a,status:'active',role:'owner'}]},connection:conn(a,'943440851')}).reason,'owner_required'));
test('production environment denied',()=>assert.equal(status(a,conn(a,'943440851'),true,'production').reason,'environment_denied'));
test('enabled connection still held by gate',()=>assert.equal(status(a,{...conn(a,'943440851'),enabled:true}).canAuthorize,false));
test('rendered action inert without secrets or provider URL',()=>{const html=renderZohoReadiness(status(a,conn(a,'943440851')));assert.match(html,/<button type="button" disabled aria-disabled="true"/);assert.doesNotMatch(html,/oauth\/v2|refresh_token|client_secret|<form|onclick=/i);});

test('settings projection refuses persisted foreign business binding',()=>{const html=renderInvoices({id:a,name:'Shalean'},[],{settings:true,owner:true,connection:{...conn(b,'943440162'),version:1}});assert.match(html,/data-readiness="unavailable"/);assert.match(html,/button type="button" disabled/);});
test('settings projection refuses missing or incorrect stored environment',()=>{for(const connection of [{...conn(a,'943440851'),environment:'production'},(()=>{const c=conn(a,'943440851');delete c.environment;return c;})()]){const html=renderInvoices({id:a,name:'Shalean'},[],{settings:true,owner:true,connection});assert.match(html,/data-readiness="unavailable"/);}});
