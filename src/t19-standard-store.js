// pg Pool adapter. Requires direct/session-pooler transport; transaction pooling
// is unsuitable for these session advisory locks. Each lock holder uses its own
// client for all autocommitted statements; waiting locks cannot starve its queries.
import {AsyncLocalStorage} from 'node:async_hooks';
export function createStandardStore(pool){
 const context=new AsyncLocalStorage();
 const query=async(sql,args)=>{
  const current=context.getStore();
  if(current?.lost)throw Error('accounting_lock_lost');
  const result=await (current?.client??pool).query(sql,args);
  if(current?.lost)throw Error('accounting_lock_lost');
  return result;
 };
 const connection=async(environment,businessId)=>{
  const r=await query(`select environment,business_id as "businessId",connection_id as "connectionId",generation,organization_id as "organizationId",api_domain as "apiDomain",client_id as "clientId",status,envelope,organization from private_t19_standard.connections where environment=$1 and business_id=$2`,[environment,businessId]);return r.rows[0]??null;
 };
 const changed=r=>{if(r.rowCount!==1)throw Error('accounting_state_conflict');};
 const scoped=(c)=>[c.environment,c.businessId,c.generation];
 return Object.freeze({connection,
  async lock(environment,businessId,action){
   const client=await pool.connect();let locked=false,discard=false;
   const current={client,lost:false},lost=()=>{current.lost=true;discard=true;};
   client.on?.('error',lost);client.on?.('end',lost);
   try{
    await client.query('select pg_advisory_lock(hashtextextended($1,19))',[environment+':'+businessId]);locked=true;
    if(current.lost)throw Error('accounting_lock_lost');
    return await context.run(current,action);
   }finally{
    if(locked&&!current.lost){try{
     const r=await client.query('select pg_advisory_unlock(hashtextextended($1,19)) as unlocked',[environment+':'+businessId]);
     if(r?.rows?.[0]?.unlocked===false)discard=true;
    }catch{discard=true;}}
    client.removeListener?.('error',lost);client.removeListener?.('end',lost);
    client.release(discard);
   }
  },
  async begin(s){
   await query(`update private_t19_standard.oauth_states set resolved=true where environment=$1 and business_id=$2 and not consumed and expires_at<=$3`,[s.environment,s.businessId,Date.now()]);
   await query(`insert into private_t19_standard.oauth_states(digest,session_digest,actor,business_id,environment,organization_id,expires_at) values($1,$2,$3,$4,$5,$6,$7)`,[s.digest,s.sessionDigest,s.actor,s.businessId,s.environment,s.organizationId,s.expiresAt]);},
  async state(d){return (await query(`select session_digest as "sessionDigest",actor,business_id as "businessId",environment,organization_id as "organizationId",expires_at::float8 as "expiresAt" from private_t19_standard.oauth_states where digest=$1 and not consumed`,[d])).rows[0];},
  async resolve(d){changed(await query(`update private_t19_standard.oauth_states set resolved=true where digest=$1 and consumed and not resolved`,[d]));},
  async consume(d,a,s,n){changed(await query(`update private_t19_standard.oauth_states set consumed=true where digest=$1 and actor=$2 and session_digest=$3 and expires_at>$4 and not consumed`,[d,a,s,n]));},
  async save(c,previous){changed(await query(`insert into private_t19_standard.connections(environment,business_id,connection_id,generation,organization_id,api_domain,client_id,status,envelope) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(environment,business_id) do update set generation=excluded.generation,organization_id=excluded.organization_id,api_domain=excluded.api_domain,client_id=excluded.client_id,status=excluded.status,envelope=excluded.envelope,organization=null where private_t19_standard.connections.generation=$10 and private_t19_standard.connections.status='disconnected'`,[c.environment,c.businessId,c.connectionId,c.generation,c.organizationId,c.apiDomain,c.clientId,c.status,c.envelope,previous]));},
  async publish(c,o){changed(await query(`update private_t19_standard.connections set status='connected',organization=$4 where environment=$1 and business_id=$2 and generation=$3 and status='revocation_pending'`,[...scoped(c),o]));},
  async refresh(c,e){changed(await query(`update private_t19_standard.connections set envelope=$4 where environment=$1 and business_id=$2 and generation=$3 and status='connected'`,[...scoped(c),e]));},
  async disable(c){changed(await query(`update private_t19_standard.connections set status='revocation_pending' where environment=$1 and business_id=$2 and generation=$3 and envelope is not null`,scoped(c)));},
  async revoked(c){changed(await query(`update private_t19_standard.connections set status='disconnected',envelope=null where environment=$1 and business_id=$2 and generation=$3 and status='revocation_pending'`,scoped(c)));}
 });
}
