import {Server} from 'node:net';
import {validateManagedTransport,wakeManagedCustody} from './t19-managed-wakeup.js';
// Explicit staging composition only. Importing this module performs no I/O.
import {readFile,lstat,realpath,open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,relative,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {request} from 'node:https';
import {connectCustodyPostgres} from './t19-custody-postgres.js';
import {createRestrictedAccountingService} from './t19-accounting-service.js';
import {createAccountingUserClientFactory} from './t19-accounting-sessions.js';
import {createAccountingProxy} from './t19-accounting-proxy.js';
import {stagingOrigin,stagingDatabase} from './hosted-staging.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const denied=()=>new Error('accounting_deployment_rejected');
function exact(v,keys){if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).sort().join()!==[...keys].sort().join())throw denied();}
function endpoint(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw denied();return u.href;}
const sameIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&a.mode===b.mode;
const sameFile=(a,b)=>sameIdentity(a,b)&&a.nlink===b.nlink&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
async function protectedAncestors(path){
 const result=[];
 for(let dir=dirname(path);;dir=dirname(dir)){
  const s=await lstat(dir);
  if(s.isSymbolicLink()||!s.isDirectory())throw denied();
  if(process.platform!=='win32'){
   const stickyRoot=s.uid===0&&(s.mode&0o1000)!==0;
   if(![0,process.getuid()].includes(s.uid)||(s.mode&0o022)!==0&&!stickyRoot)throw denied();
  }
  if(await lstat(join(dir,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw denied();
  result.push([dir,s]);if(dirname(dir)===dir)break;
 }
 return result;
}
async function protectedFile(path){
 if(typeof path!=='string'||!isAbsolute(path))throw denied();
 const normalized=resolve(path),canonical=await realpath(path),rel=relative(root,canonical);
 if(canonical!==normalized||!rel||!rel.startsWith('..')&&!isAbsolute(rel))throw denied();
 const ancestors=await protectedAncestors(normalized);
 const before=await lstat(normalized);
 if(before.isSymbolicLink()||!before.isFile())throw denied();
 const handle=await open(normalized,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));
 try{
  const s=await handle.stat();
  if(!sameFile(before,s)||!s.isFile()||s.nlink!==1||s.size>65536
   ||process.platform!=='win32'&&((s.mode&0o077)!==0||![0,process.getuid()].includes(s.uid)))throw denied();
  // Read a bounded descriptor, not a second pathname lookup. Appends cannot
  // turn the size precheck into an unbounded credential read.
  const bytes=Buffer.alloc(65537);let length=0;
  while(length<bytes.length){const r=await handle.read(bytes,length,bytes.length-length,null);if(!r.bytesRead)break;length+=r.bytesRead;}
  if(length>65536||!sameFile(s,await handle.stat())||!sameFile(s,await lstat(normalized))
    ||await realpath(normalized)!==normalized)throw denied();
  for(const [dir,identity] of ancestors)if(!sameIdentity(identity,await lstat(dir)))throw denied();
  return bytes.subarray(0,length).toString('utf8');
 }finally{await handle.close();}
}
// This is deployment source, not a URL, request field, environment variable or
// credential. A changed path requires an ordinary reviewed source deployment.
export function accountingWebConfigPath(settings){
 exact(settings,['version','webConfigFile']);
 if(settings.version!==1||typeof settings.webConfigFile!=='string'||!isAbsolute(settings.webConfigFile))throw denied();
 return settings.webConfigFile;
}
export async function loadAccountingWebDeployment(){
 try{
  const settings=JSON.parse(await readFile(new URL('../config/t19-hosting.json',import.meta.url),'utf8'));
  const c=await loadAccountingDeployment(accountingWebConfigPath(settings));
  if(c.mode!=='web')throw denied();return c;
 }catch{throw denied();}
}
export async function loadAccountingDeployment(path){
 try{
  const c=JSON.parse(await protectedFile(path));
  const common=['version','mode','enabled','tls'];
  if(c.mode==='custody')exact(c,[...common,'port','database','publishableKey']);
  else if(['web','scheduler'].includes(c.mode))exact(c,[...common,'endpoint',...(Object.hasOwn(c,'transport')?['transport']:[])]);else throw denied();
  if(c.version!==1||typeof c.enabled!=='boolean')throw denied();
  exact(c.tls,['caFile','certFile','keyFile']);
  const tls={ca:await protectedFile(c.tls.caFile),cert:await protectedFile(c.tls.certFile),key:await protectedFile(c.tls.keyFile)};
  if(Object.values(tls).some(v=>!v.trim()))throw denied();
  if(c.mode!=='custody'){
   validateManagedTransport(c.transport,c.endpoint);
   return Object.freeze({mode:c.mode,enabled:c.enabled,endpoint:endpoint(c.endpoint),tls,...(c.transport?{transport:c.transport}:{})});
  }
  exact(c.database,['host','port','passwordFile','caFile']);
  if(!Number.isInteger(c.port)||c.port<1024||c.port>65535||typeof c.database.host!=='string'||!c.database.host
   ||!Number.isInteger(c.database.port)||c.database.port<1||c.database.port>65535)throw denied();
  // The user-client factory validates the publishable/anon key, never service_role.
  const createUserClient=createAccountingUserClientFactory({url:stagingDatabase,publishableKey:c.publishableKey});
  const password=(await protectedFile(c.database.passwordFile)).trim();if(!password)throw denied();
  return Object.freeze({mode:c.mode,enabled:c.enabled,port:c.port,tls,createUserClient,
   database:{host:c.database.host,port:c.database.port,database:'postgres',password,ca:await protectedFile(c.database.caFile)}});
 }catch{throw denied();}
}
function enabled(c,mode){if(c?.enabled!==true||c.mode!==mode)throw denied();}
export function deploymentProxy(c){enabled(c,'web');return createAccountingProxy(c);}
export async function startAccountingCustody(c,{connect=connectCustodyPostgres,createService=createRestrictedAccountingService,inspectListener=server=>Server.prototype.address.call(server)}={}){
 enabled(c,'custody');let db,server;
 try{
  db=await connect(c.database);
  server=createService({database:db.database,query:db.query,createUserClient:c.createUserClient,fetchImpl:globalThis.fetch,
   origin:stagingOrigin,sessionCookie:'__Host-faraios_staging',tls:c.tls});
  server.headersTimeout=15000;server.requestTimeout=30000;server.keepAliveTimeout=5000;
  server.listen(c.port,'127.0.0.1');await once(server,'listening');
  const address=inspectListener(server);
  if(address?.address!=='127.0.0.1'||address.family!=='IPv4'||address.port!==c.port)throw denied();
  let closing;
  const close=()=>closing??=(async()=>{
   // Drain accepted operations before DB shutdown. Never erase uncertain jobs.
   const timer=setTimeout(()=>server.closeAllConnections(),30000);timer.unref();
   try{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}finally{clearTimeout(timer);await db.close();}
  })();
  return Object.freeze({server,close});
 }catch{if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}if(db)await db.close();throw denied();}
}
export async function runAccountingPass(c,{wake=wakeManagedCustody}={}){
 enabled(c,'scheduler');
 validateManagedTransport(c.transport,c.endpoint);
 if(c.transport){try{await wake();}catch{throw new Error('accounting_pass_unconfirmed');}}
 // A scheduler timeout never triggers automatic retransmission. Durable jobs own recovery.
 return new Promise((resolve,reject)=>{
  let timer;const fail=()=>{clearTimeout(timer);reject(new Error('accounting_pass_unconfirmed'));};
  const req=request(new URL('/custody/run',endpoint(c.endpoint)),{method:'POST',...c.tls,rejectUnauthorized:true,minVersion:'TLSv1.2',
   headers:{'Content-Type':'application/json','Content-Length':2}},res=>{
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>16384){req.destroy();fail();}else chunks.push(chunk);});
   res.on('error',fail);res.on('end',()=>{
    clearTimeout(timer);
    try{
     if(res.statusCode!==200)throw denied();const rows=JSON.parse(Buffer.concat(chunks).toString('utf8'));
     if(!Array.isArray(rows)||rows.length>20||rows.some(r=>!r||Object.keys(r).sort().join()!=='operationId,status'
      ||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(r.operationId)
      ||!['matched','failed','review_required','recovery_required'].includes(r.status)))throw denied();
     resolve(Object.freeze({processed:rows.length,held:rows.filter(r=>r.status!=='matched').length}));
    }catch{fail();}
   });
  });
  timer=setTimeout(()=>{req.destroy();fail();},600000);req.on('error',fail);req.end('{}');
 }).catch(()=>{throw new Error('accounting_pass_unconfirmed');});
}
