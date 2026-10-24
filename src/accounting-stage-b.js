// Offline Stage B only. Deliberately not imported by staging.mjs or the Zoho adapter.
import {createServer} from 'node:http';
import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';

const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const org=v=>typeof v==='string'&&/^synthetic-[a-z0-9-]{1,40}$/.test(v);
const vaults=new WeakSet(),providers=new WeakSet();
const fail=()=>{throw new Error('Synthetic accounting boundary rejected');};
function context(c){
 if(!c||!uuid(c.id)||!uuid(c.business_id)||!Number.isSafeInteger(c.generation)||c.generation<1||!org(c.organization_id)||c.provider!=='synthetic'||c.environment!=='synthetic'||c.region!=='local')fail();
 return Object.freeze({connection_id:c.id,business_id:c.business_id,generation:c.generation,organization_id:c.organization_id,environment:c.environment,provider:c.provider,region:c.region});
}
const aad=c=>JSON.stringify([c.environment,c.business_id,c.connection_id,c.generation,c.organization_id]);

// No caller-supplied secrets, filesystem, environment or network access. The key
// and synthetic envelopes exist only in memory; this is NOT a production vault.
export function createSyntheticVault({now=()=>Date.now()}={}){
 const key=randomBytes(32),envelopes=new Map(),cache=new Map(),flights=new Map();let refreshes=0;
 const api={
  provision(connection,{broad=false}={}){
   const c=context(connection),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);
   cipher.setAAD(Buffer.from(aad(c)));
   const value=JSON.stringify({kind:'synthetic',organizations:broad?['synthetic-a','synthetic-b']: [c.organization_id]});
   envelopes.set(aad(c),{nonce,body:Buffer.concat([cipher.update(value),cipher.final()]),tag:cipher.getAuthTag()});
  },
  async access(c){
   const k=aad(c),cached=cache.get(k);if(cached&&cached.expires>now()+1000)return cached.value;
   if(flights.has(k))return flights.get(k);
   const flight=Promise.resolve().then(()=>{
    const e=envelopes.get(k);if(!e)fail();
    const decipher=createDecipheriv('aes-256-gcm',key,e.nonce);decipher.setAAD(Buffer.from(k));decipher.setAuthTag(e.tag);
    let value;try{value=JSON.parse(Buffer.concat([decipher.update(e.body),decipher.final()]).toString());}catch{fail();}
    refreshes++;cache.set(k,{value,expires:now()+60000});return value;
   }).finally(()=>flights.delete(k));flights.set(k,flight);return flight;
  },
  invalidate(connection){const k=aad(context(connection));cache.delete(k);envelopes.delete(k);},
  // Synthetic fault injection: copying ciphertext must not cross its AAD binding.
  copyEnvelopeForTest(from,to){envelopes.set(aad(context(to)),envelopes.get(aad(context(from))));},
  get refreshes(){return refreshes;}
 };vaults.add(api);return api;
}

export function createSyntheticProvider(){
 const records=new Map(),calls=[];let fault=null;
 function check(c,token){if(token?.kind!=='synthetic'||!token.organizations.includes(c.organization_id))fail();}
 const api={
  setFaultForTest(value){if(![null,'lost_response','mismatch','missing','duplicates'].includes(value))fail();fault=value;},
  async create(c,token,operation,intent){
   check(c,token);calls.push({action:'create',organization_id:c.organization_id,operation_id:operation.id});
   // Deliberately no fake-provider deduplication: the durable worker must prevent it.
   const receipt={business_id:c.business_id,connection_id:c.connection_id,generation:c.generation,organization_id:c.organization_id,
    operation_id:operation.id,local_id:intent.id,amount_cents:intent.amount_cents,currency:intent.currency,remote_id:'synthetic-'+randomUUID()};
   const k=c.organization_id+':'+operation.id;records.set(k,[...(records.get(k)??[]),receipt]);
   if(fault==='lost_response')throw new Error('Synthetic transport failure');
   return fault==='mismatch'?{...receipt,organization_id:'synthetic-foreign'}:receipt;
  },
  async find(c,token,operation){
   check(c,token);calls.push({action:'read',organization_id:c.organization_id,operation_id:operation.id});
   const result=records.get(c.organization_id+':'+operation.id)??[];
   return fault==='missing'?[]:fault==='duplicates'?[...result,...result]:structuredClone(result);
  },
  get calls(){return structuredClone(calls);}
 };providers.add(api);return api;
}

export function createSyntheticAccountingWorker({store,vault,provider}){
 if(!vaults.has(vault)||!providers.has(provider))fail();
 return {async run(businessId,operationId,{beforeDispatch,afterDispatch}={}){
  if(!uuid(businessId)||!uuid(operationId))fail();
  const claim=await store.worker('claim',[businessId,operationId]);
  const {operation:o,intent:i,connection,mode}=claim,c=context(connection);
  if(c.business_id!==businessId||o.business_id!==businessId||o.id!==operationId||o.connection_id!==c.connection_id||o.generation!==c.generation||i.business_id!==businessId||i.id!==o.local_id||!['create','reconcile'].includes(mode))fail();
  const token=await vault.access(c);
  await beforeDispatch?.();
  // This transaction is the linearisation point: a later disconnect cannot recall
  // already-authorised work. Finish records a late result without claiming success.
  await store.worker('dispatch',[businessId,operationId,o.attempt_id]);
  let result='uncertain',receipt=null;
  try{
   await afterDispatch?.();
   if(mode==='create')receipt=await provider.create(c,token,o,i);
   else {const matches=await provider.find(c,token,o);if(matches.length===1)receipt=matches[0];else if(matches.length>1)result='mismatch';}
   if(receipt)result='verified';
  }catch{ /* A dispatched request is uncertain even if no response was received. */ }
  return store.worker('finish',[businessId,operationId,o.attempt_id,result,receipt]);
 }};
}

const shapes={connect:['organization_id'],reauthorise:['connection_id','generation'],disconnect:['connection_id','generation'],intent:['local_id','amount_cents'],enqueue:['connection_id','generation','local_id']};
// The host supplies a trusted session verifier and a role-scoped store. The HTTP
// caller cannot supply auth.uid(), a role, a provider URL or a worker command.
export function createAccountingStageBApi({resolveSession,store,origin}){
 if(typeof resolveSession!=='function'||!origin?.startsWith('http://127.0.0.1:'))fail();
 return createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   const user=await resolveSession(req);if(!uuid(user))return send(401,{error:'Unauthenticated'});
   const url=new URL(req.url,origin),match=url.pathname.match(/^\/accounting\/([0-9a-f-]+)\/(connections|operations|events|connect|reauthorise|disconnect|intent|enqueue)$/i);
   if(!match||url.search)return send(400,{error:'Invalid request'});
   const [,business,action]=match;if(!uuid(business))return send(400,{error:'Invalid request'});
   if(!await store.allowed(user,business))return send(403,{error:'Accounting access denied'});
   if(req.method==='GET'&&['connections','operations','events'].includes(action))return send(200,await store.read(user,business,action));
   if(req.method!=='POST'||!Object.hasOwn(shapes,action))return send(405,{error:'Method unavailable'});
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return send(403,{error:'Request origin or type rejected'});
   let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>2048)return send(413,{error:'Request too large'});}
   let data;try{data=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
   if(!data||Array.isArray(data)||Object.keys(data).length!==shapes[action].length||Object.keys(data).some(k=>!shapes[action].includes(k)))return send(400,{error:'Unexpected fields'});
   if('organization_id'in data&&!org(data.organization_id)||'connection_id'in data&&!uuid(data.connection_id)||'local_id'in data&&!uuid(data.local_id)||'generation'in data&&(!Number.isSafeInteger(data.generation)||data.generation<1)||'amount_cents'in data&&(!Number.isSafeInteger(data.amount_cents)||data.amount_cents<0||data.amount_cents>2147483647))return send(400,{error:'Invalid fields'});
   const params=action==='connect'?[business,data.organization_id]:action==='intent'?[business,data.local_id,data.amount_cents]:action==='enqueue'?[business,data.connection_id,data.generation,data.local_id]:[business,data.connection_id,data.generation,action];
   const name=action==='intent'?'register_intent':['disconnect','reauthorise'].includes(action)?'change_connection':action;
   return send(200,{result:await store.user(user,name,params)});
  }catch(error){const status=error.code==='42501'?403:['40001','23505','55000'].includes(error.code)?409:['22023','23514','23503','22P02'].includes(error.code)?400:500;send(status,{error:'Accounting request rejected'});}
 });
}
