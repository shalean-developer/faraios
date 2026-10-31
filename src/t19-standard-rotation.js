// INACTIVE operator primitive. Caller must stop writers and retain both private keys.
// Never imports runtime settings, calls a provider, switches configuration or resumes work.
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {createTokenCipher,tokenBinding} from './t19-standard-secrets.js';
import {credentialMaterialDigest,rekeyCredentialSnapshot} from './t19-standard-recovery.js';
const denied=()=>new Error('accounting_rotation_recovery_required');
const fields=['environment','businessId','connectionId','generation','organizationId','apiDomain','clientId','status','envelope'];
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
const keyId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const envelopeEqual=(a,b)=>exact(a,['version','keyId','iv','body','tag'])&&exact(b,['version','keyId','iv','body','tag'])&&['version','keyId','iv','body','tag'].every(k=>a[k]===b[k]);
const row=c=>Object.fromEntries(fields.map(k=>[k,c?.[k]]));
export async function rewrapStandardCredentials({businessIds,storeFactory,fromConfig,toConfig,journal,assertQuiescent,direction='forward'}){
 try{
  if(!Array.isArray(businessIds)||!businessIds.length||businessIds.length>20||businessIds.some(b=>!uuid(b))||new Set(businessIds).size!==businessIds.length||!['forward','rollback'].includes(direction)||typeof storeFactory!=='function'||typeof assertQuiescent!=='function'||!journal||['load','prepare','record'].some(k=>typeof journal[k]!=='function')||!Buffer.isBuffer(fromConfig?.key)||fromConfig.key.length!==32||!Buffer.isBuffer(toConfig?.key)||toConfig.key.length!==32||!keyId(fromConfig.keyId)||!keyId(toConfig.keyId)||[fromConfig.environment,toConfig.environment].some(e=>e!==undefined&&e!=='staging')||fromConfig.keyId===toConfig.keyId||timingSafeEqual(fromConfig.key,toConfig.key))throw denied();
  const ids=[...businessIds].sort(),stores=ids.map(b=>storeFactory(b));
  if(new Set(stores).size!==stores.length||stores.some(s=>['lock','connection','refresh'].some(k=>typeof s?.[k]!=='function')))throw denied();
  const quiet=async()=>{if(await assertQuiescent()!==true)throw denied();};
  await quiet();
  const guards=[];
  async function locked(index,action){
   if(index===ids.length)return action();
   return stores[index].lock('staging',ids[index],async guard=>{
    if(typeof guard!=='function')throw denied();guards.push(guard);
    try{return await locked(index+1,action);}finally{guards.pop();}
   });
  }
  const fence=async()=>{await quiet();for(const guard of guards)await guard();};
  return await locked(0,async()=>{
   await fence();let plan=await journal.load();
   if(!plan){
    if(direction!=='forward')throw denied();
    const records=[];for(let i=0;i<ids.length;i++)records.push(row(await stores[i].connection('staging',ids[i])));
    if(records.some((c,i)=>c.environment!=='staging'||c.businessId!==ids[i]||c.status!=='connected'))throw denied();
    // Authenticates every original envelope and validates IDs/material before journaling.
    rekeyCredentialSnapshot(records,fromConfig,toConfig);
    plan={version:1,environment:'staging',rotationId:randomUUID(),fromKeyId:fromConfig.keyId,toKeyId:toConfig.keyId,records};
    await journal.prepare(plan); // Must be durable before the first DB publication.
    const saved=await journal.load();if(JSON.stringify(saved)!==JSON.stringify(plan))throw denied();plan=saved;
   }
   if(!exact(plan,['version','environment','rotationId','fromKeyId','toKeyId','records'])||plan.version!==1||plan.environment!=='staging'||!uuid(plan.rotationId)||plan.fromKeyId!==fromConfig.keyId||plan.toKeyId!==toConfig.keyId||!Array.isArray(plan.records)||plan.records.length!==ids.length||plan.records.some((c,i)=>!exact(c,fields)||c.environment!=='staging'||c.businessId!==ids[i]||c.status!=='connected'))throw denied();
   credentialMaterialDigest(plan.records,fromConfig);
   const target=direction==='forward'?toConfig:fromConfig,targetCipher=createTokenCipher(target);
   function validate(current,original){
    if(current.environment!=='staging'||current.businessId!==original.businessId||current.status!=='connected'||tokenBinding(current)!==tokenBinding(original))throw denied();
    const source=current.envelope?.keyId===fromConfig.keyId?fromConfig:current.envelope?.keyId===toConfig.keyId?toConfig:null;
    if(!source||credentialMaterialDigest([current],source)!==credentialMaterialDigest([original],fromConfig))throw denied();
    return createTokenCipher(source).open(current,current.envelope);
   }
   // Validate the complete set before publishing any member, including a recovery run.
   for(let i=0;i<ids.length;i++)validate(row(await stores[i].connection('staging',ids[i])),plan.records[i]);
   for(let i=0;i<ids.length;i++){
    await fence();let current=row(await stores[i].connection('staging',ids[i]));const material=validate(current,plan.records[i]);
    if(current.envelope.keyId!==target.keyId){
     const envelope=targetCipher.seal(current,material);
     // Existing scoped SQL lease fences publication; acknowledgement loss is recovered by readback.
     await stores[i].refresh(current,envelope);
     await fence();current=row(await stores[i].connection('staging',ids[i]));validate(current,plan.records[i]);
     if(current.envelope.keyId!==target.keyId||!envelopeEqual(current.envelope,envelope))throw denied();
    }
    await journal.record({rotationId:plan.rotationId,direction,businessId:ids[i],state:'verified'});
   }
   await fence();
   for(let i=0;i<ids.length;i++){const c=row(await stores[i].connection('staging',ids[i]));validate(c,plan.records[i]);if(c.envelope.keyId!==target.keyId)throw denied();}
   await journal.record({rotationId:plan.rotationId,direction,state:'rewrapped',count:ids.length});
   return {rotationId:plan.rotationId,environment:'staging',direction,rewrapped:ids.length,targetKeyId:target.keyId,configurationSwitchRequired:true,resumeAllowed:false,providerCalls:0};
  });
 }catch{throw denied();}
}
