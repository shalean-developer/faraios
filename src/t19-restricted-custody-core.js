// T19-01: inactive restricted-service core. No routes, env reads, keys or provider IO.
// ALL dependencies must be wired inside a separately authenticated isolated service.
// Worker receives only an operation outcome, never access or refresh tokens.
import {credentialBinding, bindingKey} from './t19-c1.js';
const denied=(code='custody_denied')=>Object.assign(new Error(code),{code});
export function createRestrictedCustodyCore({authorize, coordinator, vault, provider}) {
  if(typeof authorize!=='function'||!coordinator||!vault||typeof provider?.refresh!=='function'
    ||!['current','claim','dispatch','complete','fail'].every(k=>typeof coordinator[k]==='function')
    ||!['read','seal'].every(k=>typeof vault[k]==='function')) throw denied('configuration_rejected');
  async function refresh({principal,binding,operationId}) {
    const b=credentialBinding(binding);
    if(typeof operationId!=='string'||!/^[-a-zA-Z0-9]{8,120}$/.test(operationId))throw denied();
    // No auth attributes from client requests: authorize implementation rechecks machine
    // identity and current durable operation against trusted membership/job records.
    let lease, dispatched=false;
    try{
      if(await authorize({principal,binding:b,operationId,action:'refresh'})!==true)throw denied();
      const current=await coordinator.current(b);
      if(!current?.reference)throw denied('stale');
      lease=await coordinator.claim(b,operationId);
      // Retrieving raw refresh token happens only inside this trusted service.
      const material=await vault.read(b,current.reference);
      if(typeof material?.refresh_token!=='string'||!material.refresh_token)throw denied();
      // Recheck immediately before dispatch; provider effect MUST be called only
      // by coordinator.dispatch after persisting a durable dispatch intent.
      if(await authorize({principal,binding:b,operationId,action:'refresh'})!==true)throw denied();
      const outcome=await coordinator.dispatch(b,lease,()=>{
        dispatched=true;
        return provider.refresh(b,material);
      });
      if(outcome?.kind==='invalid_grant'){
        await coordinator.fail(b,lease,'reauthorisation_required');
        return Object.freeze({status:'reauthorisation_required'});
      }
      if(outcome?.kind!=='success'||(outcome.refresh_token!==undefined
        &&(typeof outcome.refresh_token!=='string'||!outcome.refresh_token)))
        throw denied('uncertain_outcome');
      const next=credentialBinding({...b,credential_version:b.credential_version+1});
      // Zoho may refresh access without rotating the long-lived refresh token.
      // Only the trusted provider adapter classifies success; no caller outcome.
      const reference=await vault.seal(next,{...material,binding:next,refresh_token:outcome.refresh_token??material.refresh_token});
      if(await authorize({principal,binding:b,operationId,action:'complete'})!==true)
        throw denied('stale');
      // Adapter complete MUST compare seven-field binding, lease, expiry, disconnect
      // and sealed reference in one DB transaction; no direct worker access.
      await coordinator.complete(b,lease,reference);
      return Object.freeze({status:'completed',bindingKey:bindingKey(next)});
    }catch(error){
      if(lease){try{await coordinator.fail(b,lease,dispatched?'recovery_required':'idle');}catch{}}
      // Even recognized adapter codes may carry secrets in message, stack, cause
      // or enumerable properties. Export only a newly constructed static error.
      if(error?.code==='custody_denied'||error?.code==='stale')throw denied(error.code);
      throw denied(dispatched?'reconciliation_required':'refresh_unavailable');
    }
  }
  return Object.freeze({refresh});
}
