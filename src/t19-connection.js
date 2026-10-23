import {createServer} from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
import {exchangeCode,verifyInvoice,T19Error} from './t19-provider.js';
import {operatorPage,operatorScript} from './t19-page.js';

export const origin='http://127.0.0.1:3102';
const callback=origin+'/oauth/callback';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const id=v=>typeof v==='string'&&/^[0-9]{1,30}$/.test(v);
const nonempty=v=>typeof v==='string'&&v.trim().length>0&&v.length<500;
const fail=code=>{throw new T19Error(code);};
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const fields=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===names.length&&names.every(n=>Object.hasOwn(o,n));
export function validateManifest(m,{execution=false,now=Date.now()}={}){
 if(!m||!uuid(m.businessId)||!id(m.organizationId)||!nonempty(m.identity)||!id(m.zohoUserId)||m.apiDomain!=='https://www.zohoapis.com'||m.environment!=='staging'||!/^[A-Z]{3}$/.test(m.currency))fail('configuration');
 if(execution){
  const f=m.fixture;
  if(m.approved!==true||!nonempty(m.approvalReference)||!nonempty(m.operator)||!nonempty(m.custodian)||!nonempty(m.reviewer)||!nonempty(m.probeSha)||!nonempty(m.clientId)||m.redirectUri!==callback||!Number.isSafeInteger(m.startsAt)||!Number.isSafeInteger(m.endsAt)||m.endsAt<=now||m.startsAt>now||m.endsAt-m.startsAt>3600000||m.endsAt<=m.startsAt||!f||!id(f.invoiceId)||!id(f.customerId)||!nonempty(f.number)||!nonempty(f.reference)||!nonempty(f.status)||!Number.isSafeInteger(f.totalCents)||f.totalCents<0||!nonempty(m.fixtureEvidence)||!nonempty(m.identityEvidence)||!nonempty(m.cleanupReference))fail('approval_required');
 }
 return structuredClone(m);
}
const pin=m=>({businessId:m.businessId,organizationId:m.organizationId,apiDomain:m.apiDomain,currency:m.currency,identity:m.identity,zohoUserId:m.zohoUserId,environment:'staging',provider:'zoho_books',region:'US'});
const context=c=>JSON.stringify([c.binding,c.id,c.generation]);

// Independent of legacy sync and synthetic Stage B. No provider call at startup.
export function createConnectionService({vault,sessions,manifest,execution=false,fetchImpl,now=()=>Date.now()}){
 const m=validateManifest(manifest),binding=pin(m),approvalDigest=createHash('sha256').update(JSON.stringify(m)).digest('hex'),states=new Map(),csrf=new Map();let queue=Promise.resolve();
 const locked=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
 const gate=()=>{if(!execution)fail('approval_required');validateManifest(m,{execution:true,now:now()});};
 const owner=async sid=>{const u=await sessions.read(sid);if(!u?.businessIds.includes(m.businessId)||!u.memberships.some(x=>x.businessId===m.businessId&&x.role==='owner'&&x.status==='active'))fail('forbidden');return u;};
 const load=async()=>{const db=await vault.read();if(!db||!db.connections||Array.isArray(db.connections))fail('storage');const c=db.connections[m.businessId];if(c&&(JSON.stringify(c.binding)!==JSON.stringify(binding)||c.clientId!==m.clientId||c.approvalDigest!==approvalDigest||!uuid(c.id)||!Number.isSafeInteger(c.generation)||c.generation<1))fail('binding');return {db,c};};
 const save=async(db,c)=>{db.connections[m.businessId]=c;await vault.write(db);};
 const audit=(c,event)=>{c.events??=[];c.events.push({event,time:now(),generation:c.generation});};
 async function guard(sid,expected){gate();await owner(sid);return locked(async()=>{const {c}=await load();if(!c||context(c)!==expected||c.status!=='authenticated'||!c.credentials||c.credentials.expiresAt<=now())fail('stale');return c;});}
 const service={
  async status(sid){await owner(sid);return locked(async()=>{const {c}=await load();return c?{connectionId:c.id,generation:c.generation,status:c.status,cleanupPending:Boolean(c.cleanup),verified:Boolean(c.evidence),binding:c.binding}:{status:'unconfigured',binding};});},
  async authorise(sid){gate();const user=await owner(sid);return locked(async()=>{
   const {db,c:old}=await load();if(old)fail('already_attempted');
   const client=db.clients?.[m.clientId];if(!client?.clientSecret||client.businessId!==m.businessId||client.organizationId!==m.organizationId)fail('credentials');
   const c={id:randomUUID(),generation:1,binding,clientId:m.clientId,approvalDigest,status:'authorising',approvalReference:m.approvalReference,events:[]};audit(c,'consent_started');await save(db,c);
   const state=randomBytes(32).toString('hex');states.set(state,{sid,userId:user.userId,context:context(c),expires:Math.min(now()+300000,m.endsAt)});
   const url=new URL('https://accounts.zoho.com/oauth/v2/auth');url.search=new URLSearchParams({client_id:m.clientId,response_type:'code',redirect_uri:callback,scope:'ZohoBooks.settings.READ,ZohoBooks.invoices.READ',access_type:'offline',state}).toString();return {authorizationUrl:url.href};
  });},
  async callback(sid,state,code){
   gate();const pending=states.get(state);states.delete(state);
   if(!pending||pending.sid!==sid||pending.expires<=now()||!nonempty(code))fail('oauth_state');
   const user=await owner(sid);if(user.userId!==pending.userId)fail('oauth_state');
   const clientSecret=await locked(async()=>{const {db,c}=await load();if(!c||context(c)!==pending.context||c.status!=='authorising')fail('stale');c.status='exchanging';c.cleanup={unknownOutcome:true};audit(c,'exchange_dispatched');await save(db,c);return db.clients[m.clientId].clientSecret;});
   let creds;
   try{creds=await exchangeCode({clientId:m.clientId,clientSecret,code,redirectUri:callback,fetchImpl,now});}
   catch(e){await locked(async()=>{const {db,c}=await load();if(c){c.status='disabled';c.generation++;c.cleanup={unknownOutcome:true};audit(c,'exchange_failed_cleanup_review');await save(db,c);}});throw e;}
   let allowed=true;try{gate();await owner(sid);}catch{allowed=false;}
   return locked(async()=>{const {db,c}=await load();if(!c)fail('storage');
    if(!allowed||context(c)!==pending.context||c.status!=='exchanging'){c.cleanup={...creds,accessToken:undefined};audit(c,'late_grant_cleanup_required');await save(db,c);fail('stale');}
    c.credentials={...creds,context:context(c)};delete c.cleanup;c.status='authenticated';c.provenance={kind:'attended',identity:m.identity,zohoUserId:m.zohoUserId,evidence:m.identityEvidence,actor:user.userId,at:now()};audit(c,'grant_stored');await save(db,c);return {status:c.status,connectionId:c.id,generation:c.generation};
   });
  },
  async verify(sid){gate();await owner(sid);const c=await locked(async()=>{const {db,c}=await load();if(!c||c.status!=='authenticated'||c.verificationAttempted||c.credentials?.context!==context(c)||c.credentials.expiresAt<=now())fail('credentials');c.verificationAttempted=true;audit(c,'verification_started');await save(db,c);return c;});const expected=context(c);
   try{const evidence=await verifyInvoice({binding,fixture:m.fixture,accessToken:c.credentials.accessToken,fetchImpl,guard:()=>guard(sid,expected)});await guard(sid,expected);return await locked(async()=>{const {db,c:current}=await load();if(!current||context(current)!==expected||current.status!=='authenticated')fail('stale');current.evidence=evidence;audit(current,'verified');await save(db,current);return {status:'verified',evidence};});}
   catch(e){await locked(async()=>{const {db,c:current}=await load();if(current&&context(current)===expected){current.status='disabled';current.generation++;current.cleanup={refreshToken:current.credentials?.refreshToken};delete current.credentials;delete current.evidence;audit(current,'verification_failed_disabled');await save(db,current);}});throw e;}
  },
  async disable(sid){await owner(sid);return locked(async()=>{const {db,c}=await load();if(!c)return {status:'unconfigured'};c.generation++;c.status='disabled';if(c.credentials)c.cleanup={refreshToken:c.credentials.refreshToken};delete c.credentials;delete c.evidence;for(const [s,p] of states)if(p.sid===sid)states.delete(s);audit(c,'locally_disabled');await save(db,c);return {status:'disabled',generation:c.generation,providerRevoked:false,cleanupPending:Boolean(c.cleanup)};});}
 };
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   if(req.headers.host!=='127.0.0.1:3102')return send(403,{error:'host'});
   const url=new URL(req.url,origin),sid=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('t19_session='))?.slice(12);
   if(url.pathname==='/oauth/callback'&&req.method==='GET'){
    try{if([...url.searchParams.keys()].some(k=>!['state','code','location','accounts-server'].includes(k))||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length!==1)fail('oauth_state');await service.callback(sid,url.searchParams.get('state'),url.searchParams.get('code'));}catch{/* No auth code or provider error is reflected into a browser response. */}
    res.writeHead(303,{'Location':'/','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end();
   }
   if(url.search)return send(400,{error:'request'});
   if(req.method==='GET'&&['/','/operator.js'].includes(url.pathname)){res.writeHead(200,{'Content-Type':url.pathname==='/'?'text/html; charset=utf-8':'application/javascript','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});return res.end(url.pathname==='/'?operatorPage(m.businessId):operatorScript(m.businessId));}
   if(req.method==='GET'&&url.pathname===`/connections/${m.businessId}`)return send(200,await service.status(sid));
   if(req.method!=='POST')return send(405,{error:'method'});
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return send(403,{error:'origin'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return send(413,{error:'size'});}let data;try{data=JSON.parse(body);}catch{return send(400,{error:'json'});}
   if(url.pathname==='/login'){
    if(!fields(data,['email','password']))return send(400,{error:'fields'});const session=await sessions.login(data.email,data.password);const token=randomBytes(32).toString('hex');csrf.set(session.id,token);res.setHeader('Set-Cookie',`t19_session=${session.id}; HttpOnly; SameSite=Lax; Path=/`);return send(200,{csrf:token});
   }
   if(!equal(req.headers['x-csrf-token'],csrf.get(sid)))return send(403,{error:'csrf'});
   if(!fields(data,[]))return send(400,{error:'fields'});
   const actions={authorise:service.authorise,verify:service.verify,disable:service.disable};const action=url.pathname.split('/').at(-1);
   if(url.pathname!==`/connections/${m.businessId}/${action}`||!Object.hasOwn(actions,action))return send(404,{error:'route'});
   return send(200,await actions[action](sid));
  }catch(e){const code=e instanceof T19Error?e.code:'unavailable';send(['forbidden','csrf'].includes(code)?403:code==='approval_required'?409:400,{error:code});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return {server,service};
}
