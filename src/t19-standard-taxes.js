import {AccountingError,providerCents,verifiedVatSnapshot,zohoDomains} from './zoho-books.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const numeric=v=>typeof v==='string'&&/^[0-9]{1,30}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
// Explicit operator-verified staging tax mappings. Never select the first/default 15% tax.
export function createStandardTaxMappings(document){
 const reject=()=>{throw Error('accounting_tax_configuration_rejected');},bindings=new Map(),owners=new Map();
 if(!exact(document,['version','environment','connections'])||document.version!==1||document.environment!=='staging'||!Array.isArray(document.connections)||document.connections.length>20)reject();
 for(const c of document.connections){
  if(!exact(c,['businessId','connectionId','generation','organizationId','apiDomain','policies'])||!uuid(c.businessId)||!uuid(c.connectionId)||!Number.isSafeInteger(c.generation)||c.generation<1||!numeric(c.organizationId)||!Object.hasOwn(zohoDomains,c.apiDomain)||!Array.isArray(c.policies)||c.policies.length>100||bindings.has(c.businessId))reject();
  const key=c.apiDomain+'|'+c.organizationId;if(owners.has(key)&&owners.get(key)!==c.businessId)reject();owners.set(key,c.businessId);
  const policies=new Map();
  for(const p of c.policies){
   if(!exact(p,['policyVersion','vatNumber','registrationDate','taxId','taxName','verifiedStagingVat'])||!Number.isSafeInteger(p.policyVersion)||p.policyVersion<1||!/^4\d{9}$/.test(p.vatNumber??'')||!/^\d{4}-\d{2}-\d{2}$/.test(p.registrationDate??'')||!Number.isFinite(Date.parse(p.registrationDate))||new Date(p.registrationDate).toISOString().slice(0,10)!==p.registrationDate||!numeric(p.taxId)||typeof p.taxName!=='string'||!p.taxName.trim()||p.taxName.length>100||p.verifiedStagingVat!==true||policies.has(p.policyVersion))reject();
   policies.set(p.policyVersion,Object.freeze({...p}));
  }
  bindings.set(c.businessId,{...c,policies});
 }
 return async({invoice,connection},call)=>{
  if(invoice?.snapshot?.tax_snapshot?.enabled!==true)return null;
  const t=verifiedVatSnapshot(invoice),m=bindings.get(invoice.business_id),p=m?.policies.get(t.policy_version);
  if(!p||connection.business_id!==invoice.business_id||connection.environment!=='staging'||connection.connection_id!==m.connectionId||connection.generation!==m.generation||connection.organization_id!==m.organizationId||connection.api_domain!==m.apiDomain||p.vatNumber!==t.vat_number||p.registrationDate!==t.registration_date)throw new AccountingError('tax_mapping');
  const result=await call('/settings/taxes/'+p.taxId),tax=Array.isArray(result.tax)?result.tax.length===1?result.tax[0]:null:result.tax;
  // Successful exact-ID detail lookup proves existence; reject explicit inactive flags.
  // The documented Taxes object has no mandatory active-status field.
  if(!tax||String(tax.tax_id)!==p.taxId||tax.tax_name!==p.taxName||tax.tax_type!=='tax'||providerCents(tax.tax_percentage)!==1500||tax.is_value_added!==true||tax.status!==undefined&&tax.status!=='active'||tax.is_inactive===true||tax.tax_specific_type&&String(tax.tax_specific_type).trim()||tax.tds_payable_account_id&&String(tax.tds_payable_account_id).trim())throw new AccountingError('tax_mapping');
  return Object.freeze({taxId:p.taxId,taxName:p.taxName});
 };
}
export const noStandardTaxMappings=createStandardTaxMappings({version:1,environment:'staging',connections:[]});
