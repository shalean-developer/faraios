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
  // The restricted SA grant permits the documented paginated list, but denies
  // the detail endpoint. Pin the organisation country and exact tax identity;
  // read every page so an ambiguous/duplicate entry can never be accepted.
  const orgs=await call('/organizations');
  const organisations=Array.isArray(orgs.organizations)?orgs.organizations.filter(o=>String(o?.organization_id)===m.organizationId):[];
  if(organisations.length!==1||orgs.page_context!==undefined&&orgs.page_context?.has_more_page!==false||organisations[0].country_code!=='ZA'||organisations[0].currency_code!=='ZAR'||organisations[0].is_org_active!==true)throw new AccountingError('tax_mapping');
  const matches=[],seen=new Set();let complete=false;
  for(let page=1;page<=20;page++){
   const result=await call('/settings/taxes',{query:{page:String(page),per_page:'200'}});
   if(!Array.isArray(result.taxes)||result.taxes.length>200||typeof result.page_context?.has_more_page!=='boolean')throw new AccountingError('tax_mapping');
   for(const tax of result.taxes){if(!tax||!numeric(String(tax.tax_id))||seen.has(String(tax.tax_id)))throw new AccountingError('tax_mapping');seen.add(String(tax.tax_id));if(String(tax.tax_id)===p.taxId)matches.push(tax);}
   if(!result.page_context.has_more_page){complete=true;break;}
   if(!result.taxes.length)throw new AccountingError('tax_mapping');
  }
  if(!complete||matches.length!==1)throw new AccountingError('tax_mapping');
  const tax=matches[0];
  // Actual SA list omits is_value_added and spells status "Active". Ordinary
  // VAT is established by the pinned, operator-verified SA policy and tax ID.
  // Reject explicit incompatible or inactive metadata instead of inferring it.
  if(tax.tax_name!==p.taxName||tax.tax_type!=='tax'||providerCents(tax.tax_percentage)!==1500||tax.is_value_added!==undefined&&tax.is_value_added!==true||tax.status!==undefined&&!['active','Active'].includes(tax.status)||tax.is_inactive===true||tax.tax_specific_type&&String(tax.tax_specific_type).trim()||tax.tds_payable_account_id&&String(tax.tds_payable_account_id).trim())throw new AccountingError('tax_mapping');
  return Object.freeze({taxId:p.taxId,taxName:p.taxName});
 };
}
export const noStandardTaxMappings=createStandardTaxMappings({version:1,environment:'staging',connections:[]});
