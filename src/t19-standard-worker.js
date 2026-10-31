import {createZohoBooks} from './zoho-books.js';
import {noStandardTaxMappings} from './t19-standard-taxes.js';
import {noStandardItemMappings} from './t19-standard-items.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
// One business/one invoice per invocation, under the existing durable connection lease.
// No scheduler or default entrypoint imports this inactive candidate.
export function createStandardInvoiceWorker({connection,jobs,fetchImpl=globalThis.fetch,resolveItems=noStandardItemMappings,resolveTax=noStandardTaxMappings}){
 if(typeof connection?.access!=='function'||!jobs)throw Error('accounting_worker_configuration_rejected');
 return Object.freeze({async runOnce(businessId){
  if(!uuid(businessId))throw Error('accounting_worker_configuration_rejected');
  try{return await connection.access(businessId,async(token,binding,leaseGuard)=>{
   if(binding.environment!=='staging'||binding.businessId!==businessId||binding.status!=='connected')throw Error();
   await leaseGuard();const ids=await jobs.pending(binding);
   if(!Array.isArray(ids)||ids.length>20||ids.some(id=>!uuid(id))||new Set(ids).size!==ids.length)throw Error();
   if(!ids.length)return {status:'idle'};
   const jobId=ids[0];let claim,dispatched=false;
   try{
    claim=await jobs.claim(binding,jobId);
    if(!claim?.invoice||!uuid(claim.invoice.attempt_id)||claim.invoice.business_id!==businessId||claim.connection?.business_id!==businessId||claim.connection.environment!==binding.environment||claim.connection.organization_id!==binding.organizationId||claim.connection.api_domain!==binding.apiDomain||!['create','reconcile'].includes(claim.mode))throw Error();
    dispatched=claim.mode==='reconcile';
    const guard=async()=>{await leaseGuard();await jobs.guard(binding,jobId,claim.invoice.attempt_id);};
    const books=createZohoBooks({fetchImpl,resolveTax:(claim,call)=>resolveTax({...claim,connection:{...claim.connection,connection_id:binding.connectionId,generation:binding.generation}},call),resolveItems:(claim,call)=>resolveItems({...claim,connection:{...claim.connection,connection_id:binding.connectionId,generation:binding.generation}},call),custodyAccess:async()=>{await guard();return token;},guard,beforeCreate:async()=>{await jobs.dispatch(binding,jobId,claim.invoice.attempt_id);dispatched=true;}});
    const result=await books.sync(claim);
    await guard();const finished=await jobs.finish(binding,jobId,claim.invoice.attempt_id,result);
    if(!['matched','failed','review_required'].includes(finished?.status))throw Error();
    return {jobId,status:finished.status};
   }catch{
    // A failed/uncertain durable dispatch can never trigger an automatic new POST.
    // SQL retains the marker even if this best-effort finish cannot be committed.
    if(claim?.invoice?.attempt_id)try{await jobs.finish(binding,jobId,claim.invoice.attempt_id,{outcome:dispatched?'review_required':'failed',error_code:dispatched?'unknown_outcome':'credentials',receipt:null});}catch{}
    return {jobId,status:'review_required'};
   }
  });}catch{return {status:'unavailable'};}
 }});
}
export function createStandardInvoiceJobs({rpc,scope}){
 async function call(action,binding,input={}){
  const held=scope();if(!held||held.environment!==binding.environment||held.businessId!==binding.businessId)throw Error('accounting_job_denied');
  const {data,error}=await rpc('t19_standard_jobs',{action,input:{...input,environment:held.environment,businessId:held.businessId,lease:held.holder,connectionId:binding.connectionId,generation:binding.generation}});
  if(error||data===undefined)throw Error('accounting_job_unavailable');return data;
 }
 return Object.freeze({pending:b=>call('pending',b),claim:(b,jobId)=>call('claim',b,{jobId}),guard:(b,jobId,attemptId)=>call('guard',b,{jobId,attemptId}),dispatch:(b,jobId,attemptId)=>call('dispatch',b,{jobId,attemptId}),finish:(b,jobId,attemptId,result)=>call('finish',b,{jobId,attemptId,result})});
}
