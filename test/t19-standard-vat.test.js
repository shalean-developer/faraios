import test from 'node:test';
import assert from 'node:assert/strict';
import {inclusiveVatCents,verifiedVatSnapshot,verifiedReceipt,createZohoBooks} from '../src/zoho-books.js';
import {createStandardTaxMappings} from '../src/t19-standard-taxes.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const connection={business_id:id(1),connection_id:id(2),generation:1,organization_id:'111',api_domain:'https://www.zohoapis.com',environment:'staging',enabled:true};
const tax={enabled:true,policy_version:1,price_basis:'customer_total',rate_bps:1500,vat_number:'4000000000',registration_date:'2026-01-01',total_cents:11500,vat_cents:1500,net_cents:10000};
const invoice={id:id(3),business_id:id(1),currency:'ZAR',total_cents:11500,external_customer_id:'123',snapshot:{local_start:'2026-11-05T09:00:00',customer_snapshot:{name:'Synthetic VAT TEST'},tax_snapshot:tax,price_lines:[{name:'Synthetic VAT service',quantity:1,rate_cents:11500,total_cents:11500,unit_label:'visit'}]}};
const config={version:1,environment:'staging',connections:[{businessId:id(1),connectionId:id(2),generation:1,organizationId:'111',apiDomain:connection.api_domain,policies:[{policyVersion:1,vatNumber:'4000000000',registrationDate:'2026-01-01',taxId:'555',taxName:'VAT15 TEST',verifiedStagingVat:true}]}]};
const taxRecord={tax_id:'555',tax_name:'VAT15 TEST',tax_type:'tax',tax_percentage:15,is_value_added:true,status:'active',tax_specific_type:''};
const external={invoice_id:'9001',invoice_number:'VAT-TEST-1',reference_number:'FaraiOS:'+invoice.id,customer_id:'123',currency_code:'ZAR',status:'draft',is_emailed:false,is_inclusive_tax:true,date:'2026-11-05',total:115,sub_total:100,tax_total:15,taxes:[{tax_name:'VAT15 TEST',tax_amount:15}],payment_made:0,line_items:[{item_id:'777',name:'Synthetic VAT service',quantity:1,rate:115,item_total:100,unit:'visit',tax_id:'555',tax_name:'VAT15 TEST',tax_type:'tax',tax_percentage:15,discount_amount:0}]};
test('inclusive VAT uses saved document cents; malformed snapshots and line/document rounding disagreement hold',()=>{
 assert.equal(inclusiveVatCents(11500),1500);assert.equal(inclusiveVatCents(10000),1304);assert.equal(inclusiveVatCents(2147483647),280106563);
 assert.deepEqual(verifiedVatSnapshot(invoice),tax);
 for(const patch of [{vat_cents:1499},{net_cents:10001},{rate_bps:1400},{policy_version:0},{vat_number:null},{vat_number:'123'},{registration_date:'2026-02-30'},{registration_date:'2027-01-01'}]){const i=structuredClone(invoice);Object.assign(i.snapshot.tax_snapshot,patch);assert.throws(()=>verifiedVatSnapshot(i));}
 const i=structuredClone(invoice);i.total_cents=8;Object.assign(i.snapshot.tax_snapshot,{total_cents:8,vat_cents:1,net_cents:7});i.snapshot.price_lines=[{name:'A',quantity:1,rate_cents:4,total_cents:4},{name:'B',quantity:1,rate_cents:4,total_cents:4}];assert.throws(()=>verifiedVatSnapshot(i),e=>e.code==='tax_rounding');
});
test('VAT tax IDs are pinned to business, environment, connection generation and saved VAT policy',async()=>{
 const resolve=createStandardTaxMappings(config);let reads=0;const call=async path=>{reads++;assert.equal(path,'/settings/taxes/555');return {tax:structuredClone(taxRecord)};};
 assert.deepEqual(await resolve({invoice,connection},call),{taxId:'555',taxName:'VAT15 TEST'});
 for(const patch of [{business_id:id(9)},{environment:'production'},{generation:2},{organization_id:'222'},{connection_id:id(9)}])await assert.rejects(()=>resolve({invoice,connection:{...connection,...patch}},call),e=>e.code==='tax_mapping');
 const i=structuredClone(invoice);i.snapshot.tax_snapshot.policy_version=2;await assert.rejects(()=>resolve({invoice:i,connection},call));assert.equal(reads,1);
 const withoutStatus={...taxRecord};delete withoutStatus.status;assert.deepEqual(await resolve({invoice,connection},async()=>({tax:withoutStatus})),{taxId:'555',taxName:'VAT15 TEST'});
 for(const patch of [{tax_id:'999'},{tax_percentage:14},{tax_type:'compound_tax'},{is_value_added:false},{status:'inactive'},{is_inactive:true},{tax_specific_type:'export_of_shg'}])await assert.rejects(()=>resolve({invoice,connection},async()=>({tax:{...taxRecord,...patch}})));
});
test('tax mapping configuration rejects duplicates, unverified records and shared cross-business organisations',()=>{
 for(const mutate of [x=>x.environment='production',x=>x.connections[0].policies[0].verifiedStagingVat=false,x=>x.connections[0].policies.push({...x.connections[0].policies[0]}),x=>x.connections.push({...x.connections[0],businessId:id(9)}),x=>x.connections[0].policies[0].registrationDate='2026-02-30']){const c=structuredClone(config);mutate(c);assert.throws(()=>createStandardTaxMappings(c));}
});
test('VAT receipt must preserve inclusive rates, exact tax identity, all net amounts and the saved total',()=>{
 const mapping={taxId:'555',taxName:'VAT15 TEST'};const receipt=verifiedReceipt(invoice,connection,external,mapping);assert.equal(receipt.provider_tax_cents,1500);assert.equal(receipt.provider_net_cents,10000);assert.equal(receipt.total_cents,11500);
 for(const patch of [{is_inclusive_tax:false},{date:'2026-11-06'},{total:130},{tax_total:14.99},{sub_total:100.01},{taxes:[]},{payment_made:1},{is_emailed:true}])assert.throws(()=>verifiedReceipt(invoice,connection,{...external,...patch},mapping));
 for(const patch of [{tax_id:'999'},{tax_percentage:14},{rate:100},{item_total:115},{unit:'hour'}]){const e=structuredClone(external);Object.assign(e.line_items[0],patch);assert.throws(()=>verifiedReceipt(invoice,connection,e,mapping));}
});
test('VAT creation sends inclusive prices and explicit tax ID; missing mapping and reconciliation cannot create replacements',async()=>{
 let posts=0,dispatches=0;const fetchImpl=async(url,options)=>{
  const u=new URL(url);assert.equal(u.searchParams.get('organization_id'),'111');
  if(u.pathname.endsWith('/organizations'))return Response.json({code:0,organizations:[{organization_id:'111',currency_code:'ZAR',is_org_active:true}]});
  if(u.pathname.endsWith('/settings/taxes/555'))return Response.json({code:0,tax:taxRecord});
  if(u.pathname.endsWith('/contacts/123'))return Response.json({code:0,contact:{contact_id:'123',contact_name:'Synthetic VAT TEST',currency_code:'ZAR',status:'active'}});
  if(u.pathname.endsWith('/invoices/9001'))return Response.json({code:0,invoice:external});
  if(u.pathname.endsWith('/invoices')&&options.method==='POST'){posts++;const p=JSON.parse(options.body);assert.equal(p.is_inclusive_tax,true);assert.equal(p.line_items[0].rate,115);assert.equal(p.line_items[0].tax_id,'555');assert.equal(u.searchParams.get('send'),'false');assert.deepEqual(p.contact_persons,[]);return Response.json({code:0,invoice:{invoice_id:'9001'}});}
  if(u.pathname.endsWith('/invoices'))return Response.json({code:0,invoices:[],page_context:{has_more_page:false}});assert.fail(u.pathname);
 };
 const options={fetchImpl,custodyAccess:async()=> 'synthetic',guard:async()=>{},beforeCreate:async()=>{dispatches++;},resolveItems:async()=>[{item_id:'777',name:'Synthetic VAT service',unit:'visit',rate:115,quantity:1}],resolveTax:createStandardTaxMappings(config)};
 const claim={invoice,connection,mode:'create'};assert.equal((await createZohoBooks(options).sync(claim)).outcome,'matched');assert.equal(posts,1);assert.equal(dispatches,1);
 assert.equal((await createZohoBooks({...options,resolveTax:createStandardTaxMappings({version:1,environment:'staging',connections:[]})}).sync(claim)).error_code,'tax_mapping');assert.equal(posts,1);
 assert.equal((await createZohoBooks(options).sync({...claim,mode:'reconcile'})).error_code,'unknown_outcome');assert.equal(posts,1);
 assert.equal((await createZohoBooks({...options,resolveTax:undefined}).sync(claim)).error_code,'vat_not_supported');assert.equal(posts,1);
});

test('lost VAT creation response reconciles the same tax receipt without a second create',async()=>{
 let posts=0,exists=false,wrongItem=false;
 const fetchImpl=async(url,options)=>{const p=new URL(url).pathname;
  if(p.endsWith('/organizations'))return Response.json({code:0,organizations:[{organization_id:'111',currency_code:'ZAR',is_org_active:true}]});
  if(p.endsWith('/settings/taxes/555'))return Response.json({code:0,tax:taxRecord});
  if(p.endsWith('/contacts/123'))return Response.json({code:0,contact:{contact_id:'123',contact_name:'Synthetic VAT TEST',currency_code:'ZAR',status:'active'}});
  if(p.endsWith('/invoices')&&options.method==='POST'){posts++;exists=true;throw Error('synthetic lost response');}
  if(p.endsWith('/invoices'))return Response.json({code:0,invoices:exists?[{invoice_id:'9001',reference_number:external.reference_number}]:[],page_context:{has_more_page:false}});
  if(p.endsWith('/invoices/9001'))return Response.json({code:0,invoice:wrongItem?{...external,line_items:[{...external.line_items[0],item_id:'999'}]}:external});assert.fail(p);
 };
 const adapter=createZohoBooks({fetchImpl,custodyAccess:async()=> 'synthetic',guard:async()=>{},beforeCreate:async()=>{},resolveItems:async()=>[{item_id:'777',name:'Synthetic VAT service',rate:115,quantity:1,unit:'visit'}],resolveTax:createStandardTaxMappings(config)});
 const first=await adapter.sync({invoice,connection,mode:'create'});assert.equal(first.outcome,'review_required');assert.equal(first.error_code,'unknown_outcome');assert.equal(posts,1);
 const recovered=await adapter.sync({invoice,connection,mode:'reconcile'});assert.equal(recovered.outcome,'matched');assert.equal(recovered.receipt.provider_tax_cents,1500);assert.equal(posts,1);
 wrongItem=true;assert.equal((await adapter.sync({invoice,connection,mode:'reconcile'})).error_code,'mismatch');assert.equal(posts,1);
});
