// Custody-process only. Inject a dedicated PostgreSQL query transport; never a
// service_role REST client. SQL functions enforce identity, scope and transitions.
import {randomUUID} from 'node:crypto';
import {credentialBinding,bindingKey} from './t19-c1.js';
const fail=()=>Object.assign(new Error('custody_denied'),{code:'custody_denied'});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function createCustodyDatabase({query}){
 if(typeof query!=='function')throw fail();
 async function call(action,input){
  try{
   const result=await query('select private_t19_custody.runtime($1::text,$2::jsonb) as value',[action,JSON.stringify(input)]);
   if(result?.rows?.length!==1||result.rows[0].value==null)throw fail();
   return result.rows[0].value;
  }catch{throw fail();}
 }
 return Object.freeze({
  findMachineByFingerprint:fingerprint=>call('machine',{fingerprint}),
  resolveAuthorizedOperation:input=>call('resolve',input),
  async pending(machineId){return call('pending',{machineId});},
  // One adapter set per operation prevents cross-request lease substitution.
  operation(machineId,operationId){
   if(!uuid(machineId)||!uuid(operationId))throw fail();
   let lease,claimedBinding;
   const request=(action,data={})=>call(action,{machineId,operationId,...data});
   function checked(b,l){if(!lease||l.id!==lease.id||l.operationId!==operationId||bindingKey(b)!==bindingKey(claimedBinding))throw fail();}
   return Object.freeze({
    resolve:()=>request('resolve',{action:'refresh'}),
    ensureRefresh:()=>request('ensure_refresh'),
    coordinator:{
     current:b=>request('current',{binding:credentialBinding(b)}),
     async claim(b,id){if(lease||id!==operationId)throw fail();claimedBinding=credentialBinding(b);
      const value=await request('claim',{binding:claimedBinding,leaseId:randomUUID()});
      if(!uuid(value.id)||value.operationId!==id)throw fail();lease=Object.freeze(value);return lease;},
     async dispatch(b,l,effect){checked(b,l);if(await request('dispatch',{binding:b,leaseId:l.id})!==true)throw fail();return effect();},
     async complete(b,l,reference){checked(b,l);if(await request('publish',{binding:b,leaseId:l.id,reference})!==true)throw fail();},
     async fail(b,l,state){checked(b,l);await request('fail',{binding:b,leaseId:l.id,state});}
    },
    vault:{
     async read(b,reference){const value=await request('read',{binding:credentialBinding(b),reference});
      if(bindingKey(value.binding)!==bindingKey(b))throw fail();return value;},
     async seal(b,material){if(!lease||bindingKey(b)!==bindingKey({...claimedBinding,credential_version:claimedBinding.credential_version+1})||bindingKey(material.binding)!==bindingKey(b))throw fail();
      const value=await request('seal',{binding:b,leaseId:lease.id,material});if(!uuid(value))throw fail();return value;}
    },
    invoice:{
     claim:()=>request('invoice_claim'),
     guard:attemptId=>request('invoice_guard',{attemptId}),
     dispatch:attemptId=>request('invoice_dispatch',{attemptId}),
     finish:(attemptId,result)=>request('invoice_finish',{attemptId,result})
    }
   });
  }
 });
}
