import test from 'node:test';
import assert from 'node:assert/strict';
import {renderInvoices} from '../src/invoices.js';

const shalean={id:'00000000-0000-4000-8000-000000000001',name:'Shalean'};
const bokkie={id:'00000000-0000-4000-8000-000000000002',name:'Bokkie'};

test('T19 connect call to action is inert while custody/provider approval is blocked',()=>{
  for(const business of [shalean,bokkie]){
    const html=renderInvoices(business,[],{settings:true,owner:true,connection:{version:1,enabled:false,organization_id:'123',api_domain:'https://www.zohoapis.com',credential_key:'TEST_ONLY'}});
    assert.match(html,/Connect Zoho Books \(coming after verification\)<\/button>/);
    assert.match(html,/button type="button" disabled/);
    assert.match(html,/No authorisation or automatic sync will start/);
    assert.doesNotMatch(html,/accounts\.zoho\.com\/oauth\/v2\/auth|name="client_secret"|name="refresh_token"/);
    assert.match(html,new RegExp('invoices\\?business='+business.id));
  }
});

test('nonowner sees readiness message but no configure form',()=>{
  const html=renderInvoices(shalean,[],{settings:true,owner:false,connection:null});
  assert.match(html,/Connect Zoho Books \(coming after verification\)/);
  assert.doesNotMatch(html,/name="action" value="configure"/);
  assert.match(html,/The owner manages connection settings/);
});
