import test from 'node:test';
import assert from 'node:assert/strict';
import {createZohoBooks,verifiedReceipt,providerCents} from '../src/zoho-books.js';
const id='00000000-0000-4000-8000-000000000001';
const connection={business_id:'business-A',organization_id:'111',api_domain:'https://www.zohoapis.com',credential_key:'A_TEST',enabled:true,environment:'staging'};
const invoice={id,business_id:connection.business_id,currency:'ZAR',total_cents:10001,external_customer_id:'123',snapshot:{local_start:'2026-11-02T09:00:00',customer_snapshot:{name:'Synthetic'},price_lines:[{name:'Saved service',quantity:1,rate_cents:10001,total_cents:10001,unit_label:'visit'}]}};
const secret={...connection,client_id:'synthetic-client',client_secret:'SENSITIVE_SYNTHETIC_SECRET',refresh_token:'SENSITIVE_SYNTHETIC_REFRESH',staging_organization_confirmed:true};
invoice.snapshot.tax_snapshot={enabled:false,policy_version:0,price_basis:'customer_total',rate_bps:0,vat_number:null,registration_date:null,net_cents:10001,vat_cents:0,total_cents:10001};
const external={invoice_id:'9001',invoice_number:'TEST-0001',reference_number:'FaraiOS:'+id,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,total:'100.01',tax_total:0,shipping_charge:0,adjustment:0,payment_made:0,credits_applied:0,line_items:[{name:'Saved service',quantity:1,rate:'100.01',item_total:'100.01',unit:'visit',tax_id:'',discount_amount:0}]};
function fixture({found=[],override={},failure=null,claimMode='create',resolveItems}={}){
 const calls=[];let posts=0;
 const fetchImpl=async(url,options={})=>{
  calls.push({url:String(url),...options});const u=new URL(url);let data;
  if(u.pathname==='/oauth/v2/token'){assert.equal(options.method,'POST');assert.ok(options.body instanceof URLSearchParams);assert.doesNotMatch(String(url),/SENSITIVE/);data={access_token:'synthetic-access',api_domain:connection.api_domain,expires_in:3600};}
  else if(u.pathname==='/books/v3/organizations')data={code:0,organizations:[{organization_id:'111',currency_code:'ZAR',is_org_active:true}]};
  else if(u.pathname==='/books/v3/contacts/123')data={code:0,contact:{contact_id:'123',contact_name:'Synthetic',status:'active',currency_code:'ZAR'}};
  else if(u.pathname==='/books/v3/invoices'&&options.method==='POST'){posts++;assert.equal(u.searchParams.get('send'),'false');const p=JSON.parse(options.body);assert.equal(p.reference_number,'FaraiOS:'+id);assert.deepEqual(p.contact_persons,[]);assert.equal(p.line_items[0].rate,100.01);if(failure==='timeout')throw new Error('SENSITIVE_NETWORK_DETAIL');data={code:0,invoice:{invoice_id:'9001'}};}
  else if(u.pathname==='/books/v3/invoices')data={code:0,invoices:found,page_context:{has_more_page:false}};
  else if(u.pathname==='/books/v3/invoices/9001')data={code:0,invoice:external};
  else throw new Error('Unexpected route');
  if(override[u.pathname])data=override[u.pathname](data);
  if(u.pathname.startsWith('/books/')){assert.equal(u.searchParams.get('organization_id'),'111');assert.equal(options.headers.Authorization,'Zoho-oauthtoken synthetic-access');}
  assert.equal(options.redirect,'error');return {ok:true,status:200,text:async()=>JSON.stringify(data)};
 };
 const adapter=createZohoBooks({credentials:async alias=>{assert.equal(alias,'A_TEST');return secret;},fetchImpl,resolveItems});
 return {adapter,calls,posts:()=>posts,claim:{invoice:structuredClone(invoice),connection:{...connection},mode:claimMode}};
}
external.sub_total='100.01';

test('unverified saved tax evidence stops before credentials or provider traffic',async()=>{
 for(const tax of [undefined,null,{}, {enabled:'false'},{...invoice.snapshot.tax_snapshot,vat_cents:1},{...invoice.snapshot.tax_snapshot,net_cents:10000},{...invoice.snapshot.tax_snapshot,policy_version:-1},{...invoice.snapshot.tax_snapshot,enabled:true}]){
  const f=fixture();f.claim.invoice.snapshot.tax_snapshot=tax;
  const r=await f.adapter.sync(f.claim);assert.notEqual(r.outcome,'matched');assert.equal(r.receipt,null);assert.equal(f.calls.length,0);assert.equal(f.posts(),0);
  assert.throws(()=>verifiedReceipt(f.claim.invoice,connection,external));
 }
});

test('non-VAT receipt requires explicit tax/net evidence and rejects tax classifications',()=>{
 for(const patch of [{tax_total:undefined},{sub_total:undefined},{sub_total:'100.00'},{taxes:[{tax_name:'Unverified',tax_amount:0}]}])assert.throws(()=>verifiedReceipt(invoice,connection,{...external,...patch}),/mismatch/);
 const r=verifiedReceipt(invoice,connection,external);assert.deepEqual(r.tax_snapshot,invoice.snapshot.tax_snapshot);assert.equal(r.provider_tax_cents,0);assert.equal(r.provider_net_cents,10001);
 const changed=structuredClone(external);changed.line_items[0].tax_percentage=15;assert.throws(()=>verifiedReceipt(invoice,connection,changed),/mismatch/);
});
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

test('organisation substitution fails independent credential pins before any provider request',async()=>{
 const f=fixture();f.claim.connection.organization_id='222';
 const result=await f.adapter.sync(f.claim);
 assert.equal(result.outcome,'failed');assert.equal(result.error_code,'credentials');
 assert.equal(f.calls.length,0);assert.equal(f.posts(),0);
});

test('provider permission denial stops before financial writes and never falls back to another organisation',async()=>{
 const calls=[];
 const adapter=createZohoBooks({credentials:async()=>secret,fetchImpl:async(url,options)=>{
  const u=new URL(url);calls.push({path:u.pathname,method:options.method,org:u.searchParams.get('organization_id')});
  if(u.pathname==='/oauth/v2/token')return {ok:true,status:200,text:async()=>JSON.stringify({access_token:'synthetic-access',api_domain:connection.api_domain,expires_in:3600})};
  return {ok:false,status:403,text:async()=>{throw new Error('denial body must not be consumed');}};
 }});
 const result=await adapter.sync({invoice:structuredClone(invoice),connection:structuredClone(connection),mode:'create'});
 assert.equal(result.outcome,'failed');assert.equal(result.error_code,'credentials');assert.equal(result.receipt,null);
 assert.deepEqual(calls,[{path:'/oauth/v2/token',method:'POST',org:null},{path:'/books/v3/organizations',method:'GET',org:'111'}]);
});


test('organisation list requires a unique active pinned match and complete results before writes',async()=>{
 const pinned={organization_id:'111',currency_code:'ZAR',is_org_active:true};
 for(const result of [
  {organizations:[]},
  {organizations:[{...pinned,organization_id:'222'}]},
  {organizations:[pinned,pinned]},
  {organizations:[{...pinned,is_org_active:false}]},
  {organizations:[{...pinned,is_org_active:undefined}]},
  {organizations:[{...pinned,currency_code:'USD'}]},
  {organizations:[pinned],page_context:{has_more_page:true}},
  {organizations:[pinned],page_context:{}},
 ]){
  const f=fixture({override:{'/books/v3/organizations':()=>({code:0,...result})}});
  const response=await f.adapter.sync(f.claim);
  assert.equal(response.error_code,'organization');assert.equal(f.posts(),0);
  assert.equal(f.calls.length,2);
 }
 const f=fixture({override:{'/books/v3/organizations':()=>({code:0,organizations:[{...pinned,organization_id:'222'},pinned],page_context:{has_more_page:false}})}});
 assert.equal((await f.adapter.sync(f.claim)).outcome,'matched');
});

test('mapped item IDs reach creation and substituted receipt IDs are never accepted',async()=>{
 const resolveItems=async()=>[{item_id:'555',name:'Saved service',quantity:1,rate:100.01,unit:'visit'}];
 const f=fixture({resolveItems,override:{'/books/v3/invoices/9001':d=>({...d,invoice:{...d.invoice,line_items:d.invoice.line_items.map(l=>({...l,item_id:'555'}))}})}});
 assert.equal((await f.adapter.sync(f.claim)).outcome,'matched');
 assert.equal(JSON.parse(f.calls.find(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/invoices')).body).line_items[0].item_id,'555');
 const g=fixture({resolveItems});assert.equal((await g.adapter.sync(g.claim)).error_code,'mismatch');assert.equal(g.posts(),1);
 for(const bad of [null,undefined,[]]){const h=fixture({resolveItems:async()=>bad});assert.equal((await h.adapter.sync(h.claim)).error_code,'item_mapping');assert.equal(h.posts(),0);}
});
