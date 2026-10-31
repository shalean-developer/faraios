import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStandardInvoiceReview} from '../src/t19-standard-invoice-page.js';
const businessId='11111111-1111-4111-8111-111111111111',invoiceId='22222222-2222-4222-8222-222222222222';
const identity={userId:'owner',businesses:[{id:businessId,name:'Synthetic business'}],memberships:[{userId:'owner',businessId,role:'owner',status:'active'}]};
const review={environment:'staging',invoiceCount:1,connection:{id:invoiceId,generation:2,organizationId:'123',organizationName:'<script>bad</script>',apiDomain:'https://www.zohoapis.com',status:'connected'},invoices:[{id:invoiceId,documentStatus:'draft',version:1,customerName:'Synthetic <customer>',totalCents:10000,currency:'ZAR',date:'2026-11-02T09:00:00',taxReady:true,bookingStatus:'confirmed',lines:[{name:'Synthetic service',quantity:1,rate_cents:10000,total_cents:10000}],job:null}]};
test('review shows exact consent, escaped identities and version/connection bindings',()=>{
 const html=renderStandardInvoiceReview({identity,businessId,review});
 assert.match(html,/Synthetic &lt;customer&gt;/);assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;script&gt;bad/);
 for(const name of ['connectionId','generation','organizationId','apiDomain','invoiceVersion','totalCents','customerId','confirm'])assert.ok(html.includes('name="'+name+'"'));
 assert.match(html,/Do not send it or record payment/);assert.match(html,/does not start/);assert.doesNotMatch(html,/value="yes" checked/);
 const held=structuredClone(review);held.invoices[0].taxReady=false;
 const heldHtml=renderStandardInvoiceReview({identity,businessId,review:held});assert.match(heldHtml,/Saved tax evidence/);assert.doesNotMatch(heldHtml,/\/invoices\/approve/);
});
test('queued/review states never display as provider success; error text is fixed and escaped',()=>{
 const data=structuredClone(review);data.invoices[0].job={id:invoiceId,generation:2,state:'review_required',attempts:1,dispatched:true,error:'unknown_outcome'};
 const html=renderStandardInvoiceReview({identity,businessId,review:data});assert.match(html,/Creation is uncertain/);assert.match(html,/Review required/);assert.doesNotMatch(html,/Verified Zoho draft|\/invoices\/approve/);
 assert.match(html,/invoices\/reconcile/);assert.match(html,/cannot create a replacement/);
 data.connection.generation=3;assert.doesNotMatch(renderStandardInvoiceReview({identity,businessId,review:data}),/invoices\/reconcile/);
 assert.throws(()=>renderStandardInvoiceReview({identity,businessId:'foreign',review}));
});
