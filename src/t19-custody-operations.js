// Restricted runtime composition only. Not imported by web or worker entrypoints.
import {bindingKey,credentialBinding} from './t19-c1.js';
import {createRestrictedCustodyCore} from './t19-restricted-custody-core.js';
const denied=()=>Object.assign(new Error('custody_denied'),{code:'custody_denied'});
const operationId=v=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);

/** authenticateMachine verifies transport credentials, not request JSON/headers claims.
 * resolveAuthorizedOperation queries durable jobs + current machine grants and
 * business authority server-side for EACH action. Return null on revoked/foreign
 * or disallowed work. Neither callback may trust client-provided business/role.
 * The coordinator remains the atomic lease/generation/disconnect authority.
 */
export function createCustodyOperations({authenticateMachine,resolveAuthorizedOperation,coordinator,vault,provider}){
 if(typeof authenticateMachine!=='function'||typeof resolveAuthorizedOperation!=='function')throw denied();
 async function resolve(transport,id,action,expectedMachine){
  const machine=await authenticateMachine(transport);
  if(!machine||typeof machine.id!=='string'||!machine.id||machine.active!==true
    ||(expectedMachine!==undefined&&machine.id!==expectedMachine))throw denied();
  const record=await resolveAuthorizedOperation({machineId:machine.id,operationId:id,action});
  if(!record||record.id!==id||record.machine_id!==machine.id||record.kind!=='refresh'
    ||record.authorized!==true)throw denied();
  return {machineId:machine.id,binding:credentialBinding(record.binding)};
 }
 return Object.freeze({async refresh(transport,input){
  try{
   // The sole caller input is an opaque durable operation ID. Reject all claims.
   if(!input||Array.isArray(input)||Object.keys(input).length!==1
     ||!Object.hasOwn(input,'operationId')||!operationId(input.operationId))throw denied();
   const id=input.operationId,initial=await resolve(transport,id,'refresh');
   const core=createRestrictedCustodyCore({coordinator,vault,provider,authorize:async({binding,operationId:requested,action})=>{
    if(requested!==id)return false;
    const current=await resolve(transport,id,action,initial.machineId);
    return bindingKey(current.binding)===bindingKey(binding);
   }});
   const result=await core.refresh({principal:initial.machineId,binding:initial.binding,operationId:id});
   // No binding, secret reference, provider response or credentials leave service.
   return Object.freeze({operationId:id,status:result.status});
  }catch(error){
   const code=['stale','refresh_unavailable','reconciliation_required'].includes(error?.code)?error.code:'custody_denied';
   throw Object.assign(new Error(code),{code});
  }
 }});
}
