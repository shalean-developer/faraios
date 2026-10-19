import test from 'node:test';
import assert from 'node:assert/strict';
import {createZohoBooks,verifiedReceipt,providerCents} from '../src/zoho-books.js';
const id='00000000-0000-4000-8000-000000000001';
const connection={business_id:'business-A',organization_id:'111',api_domain:'https://www.zohoapis.com',credential_key:'A_TEST',enabled:true,environment:'staging'};
const invoice={id,business_id:connection.business_id,currency:'ZAR',total_cents:10001,external_customer_id:'123',snapshot:{local_start:'2026-11-02T09:00:00',customer_snapshot:{name:'Synthetic'},price_lines:[{name:'Saved service',quantity:1,rate_cents:10001,total_cents:10001,unit_label:'visit'}]}};
const secret={...connection,client_id:'synthetic-client',client_secret:'SENSITIVE_SYNTHETIC_SECRET',refresh_token:'SENSITIVE_SYNTHETIC_REFRESH',staging_organization_confirmed:true};
const external={invoice_id:'9001',invoice_number:'TEST-0001',reference_number:'FaraiOS:'+id,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,total:'100.01',tax_total:0,shipping_charge:0,adjustment:0,payment_made:0,credits_applied:0,line_items:[{name:'Saved service',quantity:1,rate:'100.01',item_total:'100.01',unit:'visit',tax_id:'',discount_amount:0}]};
function fixture({found=[],override={},failure=null,claimMode='create'}={}){
 const calls=[];let posts=0;
 const fetchImpl=async(url,options={})=>{
  calls.push({url:String(url),...options});const u=new URL(url);let data;
  if(u.pathname==='/oauth/v2/token'){assert.equal(options.method,'POST');assert.ok(options.body instanceof URLSearchParams);assert.doesNotMatch(String(url),/SENSITIVE/);data={access_token:'synthetic-access',api_domain:connection.api_domain,expires_in:3600};}
  else if(u.pathname==='/books/v3/organizations/111')data={code:0,organization:{organization_id:'111',currency_code:'ZAR',is_org_active:true}};
  else if(u.pathname==='/books/v3/contacts/123')data={code:0,contact:{contact_id:'123',contact_name:'Synthetic',status:'active',currency_code:'ZAR'}};
  else if(u.pathname==='/books/v3/invoices'&&options.method==='POST'){posts++;assert.equal(u.searchParams.get('send'),'false');const p=JSON.parse(options.body);assert.equal(p.reference_number,'FaraiOS:'+id);assert.deepEqual(p.contact_persons,[]);assert.equal(p.line_items[0].rate,100.01);if(failure==='timeout')throw new Error('SENSITIVE_NETWORK_DETAIL');data={code:0,invoice:{invoice_id:'9001'}};}
  else if(u.pathname==='/books/v3/invoices')data={code:0,invoices:found,page_context:{has_more_page:false}};
  else if(u.pathname==='/books/v3/invoices/9001')data={code:0,invoice:external};
  else throw new Error('Unexpected route');
  if(override[u.pathname])data=override[u.pathname](data);
  if(u.pathname.startsWith('/books/')){assert.equal(u.searchParams.get('organization_id'),'111');assert.equal(options.headers.Authorization,'Zoho-oauthtoken synthetic-access');}
  assert.equal(options.redirect,'error');return {ok:true,status:200,text:async()=>JSON.stringify(data)};
 };
 const adapter=createZohoBooks({credentials:async alias=>{assert.equal(alias,'A_TEST');return secret;},fetchImpl});
 return {adapter,calls,posts:()=>posts,claim:{invoice:structuredClone(invoice),connection:{...connection},mode:claimMode}};
}
test('Zoho adapter creates once, reads back exact draft and reuses the same identity',async()=>{
 const f=fixture(),r=await f.adapter.sync(f.claim);assert.equal(r.outcome,'matched');assert.equal(r.receipt.total_cents,10001);assert.equal(f.posts(),1);assert.deepEqual(r.receipt.price_lines,invoice.snapshot.price_lines);
 const existing=fixture({found:[{invoice_id:'9001',reference_number:'FaraiOS:'+id}]});assert.equal((await existing.adapter.sync(existing.claim)).outcome,'matched');assert.equal(existing.posts(),0);
 const repeated=fixture();repeated.claim.invoice.external_invoice_id='9001';assert.equal((await repeated.adapter.sync(repeated.claim)).outcome,'matched');assert.equal(repeated.posts(),0);
});
test('uncertain creation stops, reconciliation never POSTs when the record is absent',async()=>{
 const f=fixture({failure:'timeout'}),r=await f.adapter.sync(f.claim);assert.equal(r.outcome,'review_required');assert.equal(r.error_code,'unknown_outcome');assert.equal(f.posts(),1);assert.doesNotMatch(JSON.stringify(r),/SENSITIVE/);
 const retry=fixture({claimMode:'reconcile'});assert.equal((await retry.adapter.sync(retry.claim)).error_code,'unknown_outcome');assert.equal(retry.posts(),0);
 const duplicate=fixture({found:[{invoice_id:'9001',reference_number:'FaraiOS:'+id},{invoice_id:'9002',reference_number:'FaraiOS:'+id}]});assert.equal((await duplicate.adapter.sync(duplicate.claim)).error_code,'duplicates');assert.equal(duplicate.posts(),0);
});
test('provider mismatch and incomplete collections cannot claim matched totals or create a replacement',async()=>{
 for(const [field,value] of [['total','100.02'],['currency_code','USD'],['customer_id','999'],['status','paid'],['is_emailed',true],['reference_number','foreign'],['tax_total',1]]){
  const f=fixture({found:[{invoice_id:'9001',reference_number:'FaraiOS:'+id}],override:{'/books/v3/invoices/9001':d=>({...d,invoice:{...d.invoice,[field]:value}})}});const r=await f.adapter.sync(f.claim);assert.equal(r.error_code,'mismatch',field);assert.equal(r.outcome,'review_required');assert.equal(f.posts(),0);
 }
 for(const field of ['name','quantity','rate','item_total','unit','tax_id']){const changed=structuredClone(external);changed.line_items[0][field]=field==='quantity'?2:field==='rate'||field==='item_total'?'100.02':'wrong';assert.throws(()=>verifiedReceipt(invoice,connection,changed),/mismatch/);}
 const f=fixture({override:{'/books/v3/invoices':d=>({...d,page_context:{has_more_page:true}})}});assert.equal((await f.adapter.sync(f.claim)).outcome,'failed');assert.equal(f.posts(),0);assert.equal(f.calls.filter(c=>new URL(c.url).pathname==='/books/v3/invoices').length,10);
});
test('credential pins and regional hosts fail closed without network or secret exposure',async()=>{
 const f=fixture();f.claim.connection.api_domain='https://attacker.invalid';const r=await f.adapter.sync(f.claim);assert.equal(r.error_code,'organization');assert.equal(f.calls.length,0);
 const g=fixture();g.claim.connection.business_id='foreign';assert.equal((await g.adapter.sync(g.claim)).error_code,'credentials');assert.equal(g.calls.length,0);
 const h=fixture({override:{'/oauth/v2/token':()=>({access_token:'SENSITIVE_TOKEN',api_domain:'https://attacker.invalid',expires_in:3600})}});const response=await h.adapter.sync(h.claim);assert.equal(response.error_code,'credentials');assert.equal(h.calls.length,1);assert.doesNotMatch(JSON.stringify(response),/SENSITIVE/);
});
test('money comparison rejects fractional cents and imprecise provider values',()=>{
 assert.equal(providerCents('0'),0);assert.equal(providerCents('100.01'),10001);assert.equal(providerCents(1.2),120);
 for(const value of ['1.001','1e3','NaN',-1,Infinity,'21474836.48','01.00'])assert.throws(()=>providerCents(value));
});

test('zero-quantity exclusions remain in the internal agreement and cannot become provider charges',()=>{
 const source=structuredClone(invoice);source.snapshot.price_lines.push({name:'Excluded room',quantity:0,rate_cents:5000,total_cents:0,unit_label:'room'});
 const receipt=verifiedReceipt(source,connection,external);assert.equal(receipt.price_lines.length,2);assert.equal(receipt.total_cents,10001);
 source.snapshot.price_lines[1].total_cents=1;assert.throws(()=>verifiedReceipt(source,connection,external),/mismatch/);
});
