// Server-only orchestration, independent of HTTP routes and imported without I/O.
import {randomUUID} from 'node:crypto';
import {createStandardConnection} from './t19-standard-connection.js';
export async function provisionStandardStaging({input,components,authenticateOwner,resumeDigest}){
 const denied=()=>Error('accounting_private_setup_rejected');
 const field=input&&Object.hasOwn(input,'grantCode')?'grantCode':'refreshToken';
 const keys=['version','environment','businessId','organizationId','ownerEmail','ownerPassword',field];
 if(!input||typeof input!=='object'||Object.keys(input).sort().join()!==keys.sort().join()||input.version!==1||input.environment!=='staging'||components.config.environment!=='staging'
  ||!/^\d{1,30}$/.test(input.organizationId)||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.businessId)
  ||typeof input.ownerEmail!=='string'||!input.ownerEmail.includes('@')||typeof input.ownerPassword!=='string'||!input.ownerPassword
  ||typeof input[field]!=='string'||!input[field]||input[field].length>4096||/[\r\n]/.test(input[field]))throw denied();
 if(resumeDigest!==undefined&&!/^[0-9a-f]{64}$/.test(resumeDigest))throw denied();
 const sessionId=randomUUID();let owner,published;
 try{
  owner=await authenticateOwner({email:input.ownerEmail,password:input.ownerPassword,sessionId});
  const api=createStandardConnection({...components,sessions:owner.sessions});
  const result=resumeDigest===undefined?await api.provision(sessionId,input):await api.resumeProvisioning(sessionId,{businessId:input.businessId,organizationId:input.organizationId,stateDigest:resumeDigest});
  published=result;
  // Exercise the ordinary access path: its first call MUST refresh the encrypted
  // offline grant (provisioning deliberately persisted an expired access token).
  const organization=await api.access(input.businessId,(token,binding)=>components.provider.organization(token,binding.organizationId));
  if(organization.id!==result.organization.id)throw denied();
  return {status:result.status,businessId:result.businessId,organization,automaticRefreshVerified:true};
 }catch{
  if(published)try{
   await components.store.lock('staging',input.businessId,async(guard=async()=>{})=>{
    const c=await components.store.connection('staging',input.businessId);
    if(c?.connectionId===published.connectionId&&c.generation===published.generation&&c.status==='connected'){
     await guard();await components.store.disable(c);
    }
   });
  }catch{/* Operator must review durable state on any reported setup failure. */}
  throw denied();
 }finally{try{await owner?.close();}catch{throw denied();}}
}
