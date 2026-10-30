// No custody process, loopback listener, TLS client certificate or Vault dependency.
// Store methods must provide durable atomic consume, CAS and cross-process locks.
import {createHash,randomBytes,randomUUID} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createStandardConnection({config,cipher,provider,store,sessions,now=Date.now}){
 const fail=()=>new Error('accounting_connection_denied');
 async function owner(sid,businessId){
  const u=await sessions.read(sid);
  if(!u?.userId||!u.businessIds.includes(businessId)||!u.memberships.some(m=>m.businessId===businessId&&m.role==='owner'))throw fail();
  return u.userId;
 }
 function binding(c){
  if(c.environment!==config.environment||c.apiDomain!==config.apiDomain||c.clientId!==config.clientId)throw fail();return c;
 }
 async function current(businessId){return binding(await store.connection(config.environment,businessId));}
 return Object.freeze({
  async begin(sid,{businessId,organizationId}){
   const actor=await owner(sid,businessId);
   if(!/^\d{1,30}$/.test(organizationId))throw fail();
   const existing=await store.connection(config.environment,businessId);
   if(existing&&existing.status!=='disconnected')throw fail();
   const state=randomBytes(32).toString('hex');
   await store.begin({digest:hash(state),sessionDigest:hash(sid),actor,businessId,organizationId,environment:config.environment,expiresAt:now()+300000});
   return {authorizationUrl:provider.consent(state)};
  },
  async callback(sid,{state,code}){
   if(!/^[0-9a-f]{64}$/.test(state??'')||typeof code!=='string'||!code||code.length>4096)throw fail();
   const pending=await store.state(hash(state));
   if(!pending||pending.sessionDigest!==hash(sid)||pending.environment!==config.environment||pending.expiresAt<=now()||await owner(sid,pending.businessId)!==pending.actor)throw fail();
   // Consumption commits before provider exchange. No code replay after a crash.
   await store.consume(hash(state),pending.actor,hash(sid),now());
   return store.lock(config.environment,pending.businessId,async()=>{
    const previous=await store.connection(config.environment,pending.businessId);
    if(previous?.status==='connected'||previous?.status==='revocation_pending')throw fail();
    const c={environment:config.environment,businessId:pending.businessId,connectionId:previous?.connectionId??randomUUID(),generation:(previous?.generation??0)+1,organizationId:pending.organizationId,apiDomain:config.apiDomain,clientId:config.clientId};
    if(pending.expiresAt<=now()||await owner(sid,pending.businessId)!==pending.actor)throw fail();
    const tokens=await provider.exchange(code);
    if(typeof tokens.refresh_token!=='string'||!tokens.refresh_token)throw fail();
    // Persist encrypted grant before verification so failures remain revocable.
    const secret={refreshToken:tokens.refresh_token,accessToken:tokens.access_token,expiresAt:now()+tokens.expires_in*1000};
    await store.save({...c,status:'revocation_pending',envelope:cipher.seal(c,secret)},previous?.generation??0);
    const organization=await provider.organization(tokens.access_token,c.organizationId);
    if(await owner(sid,c.businessId)!==pending.actor||pending.expiresAt<=now())throw fail();
    await store.publish(c,organization);await store.resolve(hash(state));return {status:'connected',businessId:c.businessId,organization};
   });
  },
  async access(businessId,operation){
   return store.lock(config.environment,businessId,async()=>{
    const c=await current(businessId);if(c.status!=='connected')throw fail();
    let secret=cipher.open(c,c.envelope);
    if(secret.expiresAt<=now()+60000){
     const t=await provider.refresh(secret.refreshToken);
     secret={refreshToken:t.refresh_token??secret.refreshToken,accessToken:t.access_token,expiresAt:now()+t.expires_in*1000};
     await store.refresh(c,cipher.seal(c,secret));
    }
    // The operation executes under the same cross-process connection lock.
    return operation(secret.accessToken,Object.freeze({...c,envelope:undefined}));
   });
  },
  async disconnect(sid,{businessId}){
   await owner(sid,businessId);
   return store.lock(config.environment,businessId,async()=>{
    const c=await current(businessId);
    if(c.status==='disconnected')return {status:'disconnected',providerRevoked:true};
    await owner(sid,businessId);
    await store.disable(c); // Commit local fence before external revocation.
    try{
     const secret=cipher.open(c,c.envelope);await provider.revoke(secret.refreshToken);
     await store.revoked(c);return {status:'disconnected',providerRevoked:true};
    }catch{return {status:'revocation_pending',providerRevoked:false};}
   });
  },
  async status(sid,{businessId}){
   await owner(sid,businessId);const c=await store.connection(config.environment,businessId);
   return c?{status:c.status,organization:c.organization??null,environment:c.environment}:{status:'disconnected',environment:config.environment};
  }
 });
}
