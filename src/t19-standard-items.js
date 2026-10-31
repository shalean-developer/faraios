import {createHash} from 'node:crypto';
import {AccountingError,providerCents,zohoDomains} from './zoho-books.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const numeric=v=>typeof v==='string'&&/^[0-9]{1,30}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
export function standardInvoiceLineDigest(line){
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
 return createHash('sha256').update(JSON.stringify(canonical(line))).digest('hex');
}
// Operator-reviewed mappings live in a protected staging file, never in a browser form.
// Missing mappings stop creation, but never prevent reconciliation of dispatched work.
export function createStandardItemMappings(document){
 const reject=()=>{throw new Error('accounting_item_configuration_rejected');};
 if(!exact(document,['version','environment','connections'])||![1,2].includes(document.version)||document.environment!=='staging'||!Array.isArray(document.connections)||document.connections.length>20)reject();
 const bindings=new Map(),owners=new Map();
 for(const c of document.connections){
  if(!exact(c,['businessId','connectionId','generation','organizationId','apiDomain','items',...(document.version===2?['invoiceLines']:[])])||!uuid(c.businessId)||!uuid(c.connectionId)||!Number.isSafeInteger(c.generation)||c.generation<1||!numeric(c.organizationId)||!Object.hasOwn(zohoDomains,c.apiDomain)||!Array.isArray(c.items)||c.items.length>1000||bindings.has(c.businessId))reject();
  const org=c.apiDomain+'|'+c.organizationId;if(owners.has(org)&&owners.get(org)!==c.businessId)reject();owners.set(org,c.businessId);
  const items=new Map();for(const item of c.items){if(!exact(item,['catalogueId','itemId'])||!uuid(item.catalogueId)||!numeric(item.itemId)||items.has(item.catalogueId))reject();items.set(item.catalogueId,item.itemId);}
  const invoiceLines=new Map();
  if(document.version===2){
   if(!Array.isArray(c.invoiceLines)||c.invoiceLines.length>1000)reject();
   for(const line of c.invoiceLines){
    if(!exact(line,['invoiceId','lineIndex','lineDigest','itemId'])||!uuid(line.invoiceId)||!Number.isSafeInteger(line.lineIndex)||line.lineIndex<0||line.lineIndex>999||typeof line.lineDigest!=='string'||! /^[0-9a-f]{64}$/.test(line.lineDigest)||!numeric(line.itemId))reject();
    const key=line.invoiceId+'|'+line.lineIndex;if(invoiceLines.has(key))reject();invoiceLines.set(key,{lineDigest:line.lineDigest,itemId:line.itemId});
   }
  }
  bindings.set(c.businessId,{connectionId:c.connectionId,generation:c.generation,organizationId:c.organizationId,apiDomain:c.apiDomain,items,invoiceLines});
 }
 return async({invoice,connection},call)=>{
  const m=bindings.get(invoice.business_id);
  if(!m||connection.business_id!==invoice.business_id||connection.environment!=='staging'||connection.connection_id!==m.connectionId||connection.generation!==m.generation||connection.organization_id!==m.organizationId||connection.api_domain!==m.apiDomain)throw new AccountingError('item_mapping');
  const result=[],cache=new Map();
  for(const [lineIndex,line] of invoice.snapshot.price_lines.entries()){
   if(!(line.quantity>0))continue;
   const specific=m.invoiceLines.get(invoice.id+'|'+lineIndex);
   if(specific&&specific.lineDigest!==standardInvoiceLineDigest(line))throw new AccountingError('item_mapping');
   const itemId=specific?.itemId??m.items.get(line.catalogue_id);if(!itemId)throw new AccountingError('item_mapping');
   let item=cache.get(itemId);if(!item){item=(await call('/items/'+itemId)).item;cache.set(itemId,item);}
   if(!item||String(item.item_id)!==itemId||item.status!=='active'||item.name!==line.name||item.unit!==line.unit_label||item.can_be_sold!==true||item.tax_id&&String(item.tax_id).trim()||item.tax_percentage!==undefined&&providerCents(item.tax_percentage)!==0||item.item_tax_preferences!==undefined&&(!Array.isArray(item.item_tax_preferences)||item.item_tax_preferences.length))throw new AccountingError('item_mapping');
   // Current catalogue/item prices never rewrite the saved customer agreement.
   result.push({item_id:itemId,name:line.name,quantity:line.quantity,rate:line.rate_cents/100,unit:line.unit_label});
  }
  return result;
 };
}
export const noStandardItemMappings=createStandardItemMappings({version:1,environment:'staging',connections:[]});
