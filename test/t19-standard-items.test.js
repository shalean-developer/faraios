import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandardItemMappings,noStandardItemMappings} from '../src/t19-standard-items.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const connection={business_id:id(1),connection_id:id(2),generation:1,environment:'staging',organization_id:'111',api_domain:'https://www.zohoapis.com'};
const config={version:1,environment:'staging',connections:[{businessId:id(1),connectionId:id(2),generation:1,organizationId:'111',apiDomain:connection.api_domain,items:[{catalogueId:id(3),itemId:'555'}]}]};
const invoice={business_id:id(1),snapshot:{price_lines:[{catalogue_id:id(3),name:'Synthetic service',quantity:2,rate_cents:10000,total_cents:20000,unit_label:'visit'}]}};
const item={item_id:'555',status:'active',can_be_sold:true,name:'Synthetic service',unit:'visit',rate:999,tax_id:'',tax_percentage:0,item_tax_preferences:[]};
const call=async path=>{assert.equal(path,'/items/555');return {item:structuredClone(item)};};
test('explicit catalogue identity resolves pinned item and unit while preserving agreed rates',async()=>{
 const input=structuredClone(config),resolve=createStandardItemMappings(input);input.connections[0].items[0].itemId='999';
 assert.deepEqual(await resolve({invoice,connection},call),[{item_id:'555',name:'Synthetic service',quantity:2,rate:100,unit:'visit'}]);
 const excluded=structuredClone(invoice);excluded.snapshot.price_lines.push({quantity:0,total_cents:0});assert.equal((await resolve({invoice:excluded,connection},call)).length,1);
});
test('missing, foreign business, environment, organisation and stale connection mappings stop before provider reads',async()=>{
 const resolve=createStandardItemMappings(config);let reads=0;const read=async()=>{reads++;return {item};};
 for(const patch of [{business_id:id(9)},{environment:'production'},{organization_id:'222'},{api_domain:'https://www.zohoapis.eu'},{connection_id:id(9)},{generation:2}])await assert.rejects(()=>resolve({invoice,connection:{...connection,...patch}},read),e=>e.code==='item_mapping');
 await assert.rejects(()=>noStandardItemMappings({invoice,connection},read),e=>e.code==='item_mapping');
 const changed=structuredClone(invoice);changed.snapshot.price_lines[0].catalogue_id=id(9);await assert.rejects(()=>resolve({invoice:changed,connection},read));assert.equal(reads,0);
});
test('inactive, substituted, renamed, unit-mismatched and taxable items are rejected',async()=>{
 const resolve=createStandardItemMappings(config);
 for(const patch of [{item_id:'999'},{status:'inactive'},{can_be_sold:false},{name:'Other service'},{unit:''},{unit:'hour'},{tax_id:'123'},{tax_percentage:15},{item_tax_preferences:[{tax_id:'123'}]}])await assert.rejects(()=>resolve({invoice,connection},async()=>({item:{...item,...patch}})));
});
test('configuration rejects duplicate identities, cross-business org reuse, production and unknown fields',()=>{
 const cases=[];let x;
 x=structuredClone(config);x.environment='production';cases.push(x);
 x=structuredClone(config);x.connections[0].apiDomain='https://attacker.invalid';cases.push(x);
 x=structuredClone(config);x.connections[0].items.push({...x.connections[0].items[0]});cases.push(x);
 x=structuredClone(config);x.connections.push({...x.connections[0]});cases.push(x);
 x=structuredClone(config);x.connections.push({...x.connections[0],businessId:id(9),connectionId:id(8)});cases.push(x);
 x=structuredClone(config);x.connections[0].items[0].itemId='../999';cases.push(x);
 x=structuredClone(config);x.connections[0].items[0].name='Do not auto-link by name';cases.push(x);
 for(const candidate of cases)assert.throws(()=>createStandardItemMappings(candidate),/configuration_rejected/);
});

test('invoice-specific mapping binds derived charges to exact invoice, position and complete saved line',async()=>{
 const {standardInvoiceLineDigest}=await import('../src/t19-standard-items.js');
 const derived={kind:'scope',name:'Synthetic service',quantity:2,rate_cents:10000,total_cents:20000,unit_label:'visit',pricing_model:'fixed'};
 const inv={id:id(8),business_id:id(1),snapshot:{price_lines:[derived]}};
 const cfg=structuredClone(config);cfg.version=2;cfg.connections[0].items=[];cfg.connections[0].invoiceLines=[{invoiceId:id(8),lineIndex:0,lineDigest:standardInvoiceLineDigest(derived),itemId:'555'}];
 const resolve=createStandardItemMappings(cfg);cfg.connections[0].invoiceLines[0].itemId='999';
 assert.equal((await resolve({invoice:inv,connection},call))[0].item_id,'555');
 let reads=0;const read=async()=>{reads++;return {item};};
 for(const other of [{...inv,id:id(9)},{...inv,snapshot:{price_lines:[{quantity:0},derived]}},{...inv,snapshot:{price_lines:[{...derived,rate_cents:9999}]}},{...inv,snapshot:{price_lines:[{...derived,kind:'assessment'}]}}])await assert.rejects(()=>resolve({invoice:other,connection},read),e=>e.code==='item_mapping');
 assert.equal(reads,0);
 const reordered=Object.fromEntries(Object.entries(derived).reverse());assert.equal(standardInvoiceLineDigest(derived),standardInvoiceLineDigest(reordered));
});
test('invoice-line configuration rejects duplicate positions, invalid digests and version-one extensions',()=>{
 const cfg=structuredClone(config);cfg.version=2;cfg.connections[0].invoiceLines=[{invoiceId:id(8),lineIndex:0,lineDigest:'a'.repeat(64),itemId:'555'}];
 for(const patch of [{lineIndex:-1},{lineIndex:1.5},{lineDigest:'bad'},{invoiceId:'bad'},{itemId:'../555'}]){const c=structuredClone(cfg);Object.assign(c.connections[0].invoiceLines[0],patch);assert.throws(()=>createStandardItemMappings(c));}
 const duplicate=structuredClone(cfg);duplicate.connections[0].invoiceLines.push({...duplicate.connections[0].invoiceLines[0]});assert.throws(()=>createStandardItemMappings(duplicate));
 const legacy=structuredClone(cfg);legacy.version=1;assert.throws(()=>createStandardItemMappings(legacy));
});
