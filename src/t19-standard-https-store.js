// HTTPS storage has no pg dependency and never assumes a DB session survives an RPC.
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
export function createStandardHttpsStore({rpc}){
 if(typeof rpc!=='function')throw Error('accounting_storage_configuration_rejected');
 const context=new AsyncLocalStorage();
 async function call(action,input={}){
  try{
   const held=context.getStore();
   const {data,error}=await rpc('t19_standard_store',{action,input:{...input,...(held?{lease:held.holder,businessId:held.businessId,environment:held.environment}:{})}});
   if(error||data===undefined)throw Error();return data;
  }catch{throw Error('accounting_storage_unavailable');}
 }
 const guard=()=>call('guard');
 return Object.freeze({
  async lock(environment,businessId,action){
   if(context.getStore())throw Error('accounting_nested_operation_rejected');
   const held={environment,businessId,holder:randomUUID()};
   await call('acquire',{...held,lease:held.holder});
   return context.run(held,async()=>{
    try{return await action(guard);}finally{await call('release');}
   });
  },
  guard,
  connection:(environment,businessId)=>call('connection',{environment,businessId}),
  begin:s=>call('begin',s),state:digest=>call('state',{digest}),
  consume:(digest,actor,sessionDigest)=>call('consume',{digest,actor,sessionDigest}),
  resolve:digest=>call('resolve',{digest}),
  save:(connection,previous)=>call('save',{connection,previous}),
  publish:(connection,organization)=>call('publish',{connection,organization}),
  refresh:(connection,envelope)=>call('refresh',{connection,envelope}),
  disable:connection=>call('disable',{connection}),
  revoked:connection=>call('revoked',{connection})
 });
}
