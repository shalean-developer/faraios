// Runs inside restricted custody. The worker sees only operation IDs/outcomes.
import {bindingKey,credentialBinding} from './t19-c1.js';
import {createRestrictedCustodyCore} from './t19-restricted-custody-core.js';
import {createZohoBooks} from './zoho-books.js';
import {createCustodyTransport} from './t19-provider-transport.js';
const fail=code=>Object.assign(new Error(code),{code});
export function createCustodyInvoiceRunner({database,authenticateMachine,refreshProvider,fetchImpl,now=Date.now}){
 if(!database||typeof authenticateMachine!=='function'||typeof fetchImpl!=='function')throw fail('configuration_rejected');
 const cache=new Map(),flights=new Map();
 const transportFetch=createCustodyTransport(fetchImpl);
 async function machine(transport,expected){const m=await authenticateMachine(transport);if(!m?.active||expected&&m.id!==expected)throw fail('custody_denied');return m.id;}
 async function resolve(transport,m,id){await machine(transport,m);const j=await database.resolveAuthorizedOperation({machineId:m,operationId:id,action:'refresh'});if(j?.authorized!==true||j.machine_id!==m||j.id!==id)throw fail('custody_denied');return credentialBinding(j.binding);}
 function cached(b){const k=bindingKey(b),t=cache.get(k);if(t&&t.expires_at>now()+60000)return t.access_token;cache.delete(k);return null;}
 async function access(transport,m,id,adapters){
  let b=await resolve(transport,m,id),token=cached(b);if(token)return {b,token};
  // One refresh per connection/version in this process; SQL arbitrates processes.
  const key=bindingKey(b);
  if(!flights.has(key)){
   const task=(async()=>{
    const refreshId=await adapters.ensureRefresh(),a=database.operation(m,refreshId);
    const core=createRestrictedCustodyCore({...a,provider:refreshProvider,
     authorize:async({binding})=>bindingKey(await resolve(transport,m,refreshId))===bindingKey(binding),
     onPublished:(next,value)=>{cache.delete(key);if(value.expires_at<=now()+60000)throw fail('credentials');cache.set(bindingKey(next),Object.freeze(value));}
    });
    await core.refresh({principal:m,binding:b,operationId:refreshId});
   })().finally(()=>flights.delete(key));flights.set(key,task);
  }
  await flights.get(key);b=await resolve(transport,m,id);token=cached(b);
  if(!token)throw fail('credentials');return {b,token};
 }
 return Object.freeze({async run(transport,input){
  let adapter,claim,m,b,mayHaveWritten=false;
  try{
   if(!input||Object.keys(input).length!==1||typeof input.operationId!=='string')throw fail('custody_denied');
   m=await machine(transport);const id=input.operationId;
   b=await resolve(transport,m,id);adapter=database.operation(m,id);
   claim=await adapter.invoice.claim();
   mayHaveWritten=claim.mode==='reconcile';
   if(claim.operationId!==id||claim.invoice?.business_id!==b.business_id||claim.connection?.business_id!==b.business_id
    ||claim.connection.organization_id!==b.organization_id||claim.connection.environment!==b.environment
    ||bindingKey(claim.binding)!==bindingKey(b))throw fail('custody_denied');
   const token=await access(transport,m,id,adapter);b=token.b;
   if(cache.get(bindingKey(b))?.api_domain!==claim.connection.api_domain)throw fail('custody_denied');
   const guard=async()=>{
    await machine(transport,m);const current=await adapter.invoice.guard(claim.invoice.attempt_id);
    if(bindingKey(current)!==bindingKey(b)||!cached(b))throw fail('stale');
   };
   const books=createZohoBooks({fetchImpl:transportFetch,now,custodyAccess:async()=>{await guard();return token.token;},guard,
    beforeCreate:async()=>{await guard();await adapter.invoice.dispatch(claim.invoice.attempt_id);mayHaveWritten=true;}});
   const result=await books.sync(claim);
   if(result.error_code==='credentials')cache.delete(bindingKey(b));
   await machine(transport,m);
   const finished=await adapter.invoice.finish(claim.invoice.attempt_id,result);
   return Object.freeze({operationId:id,status:finished.status});
  }catch{
   if(b)cache.delete(bindingKey(b));
   if(adapter&&claim){try{await adapter.invoice.finish(claim.invoice.attempt_id,{outcome:mayHaveWritten?'review_required':'failed',error_code:mayHaveWritten?'unknown_outcome':'credentials',receipt:null});}catch{}}
   throw fail(claim?'reconciliation_required':'custody_denied');
  }
 },clear(){cache.clear();}});
}
