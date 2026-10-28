// Credential-free instrumentation only. Never imports accounting or a provider.
const http=require('node:http');
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {EventEmitter}=require('node:events');
const HOME='/var/www/vhosts/custody-staging.faraios.com';
const ROOT=HOME+'/t19-lifecycle-probe';
const PRIVATE=HOME+'/.faraios-t19-custody';
const UID=10521;
function denied(){throw Error('T19_LIFECYCLE_PROBE_REFUSED');}
// LiteSpeed concatenates appRoot + startupFile and supplies a trailing slash.
// Accept that one equivalent spelling; keep all foreign/traversal paths denied.
function assertManaged({platform=process.platform,uid=process.getuid?.(),argv=process.argv,env=process.env,lsNode=global.LsNode,root=__dirname}={}){
 if(platform!=='linux'||uid!==UID||root!==ROOT||![ROOT,ROOT+'/'].includes(env.LSNODE_ROOT)||env.LSNODE_STARTUP_FILE!=='probe.cjs'
  ||argv[1]!=='/usr/local/lsws/fcgi-bin/lsnode.js'||!(lsNode instanceof EventEmitter)
  ||typeof http.Server.prototype.realListen!=='function'||typeof env.LSNODE_SOCKET!=='string'
  ||!path.isAbsolute(env.LSNODE_SOCKET)||/[\0\r\n]/.test(env.LSNODE_SOCKET))denied();
}
function verifyUnixListener(server,socketPath){
 const fd=server?._handle?.fd;
 if(!Number.isInteger(fd)||fd<0||!server.listening)denied();
 const actual=net.Server.prototype.address.call(server);
 if(actual!==null&&actual!==socketPath)denied();
 const stat=fs.fstatSync(fd,{bigint:true});if(!stat.isSocket())denied();
 const rows=fs.readFileSync('/proc/self/net/unix','utf8').split('\n').slice(1).map(l=>l.trim().split(/\s+/)).filter(r=>r[6]===String(stat.ino));
 if(rows.length!==1||rows[0].length!==8||rows[0][7]!==socketPath||rows[0][3]!=='00010000'||rows[0][4]!=='0001'||rows[0][5]!=='01')denied();
 if(actual===null){const stdin=fs.fstatSync(0,{bigint:true});if(!stdin.isSocket()||stdin.dev!==stat.dev||stdin.ino!==stat.ino)denied();}
}
function privateJournal(directory,nonce){
 // Every parent must be root/this account owned and not group/other writable.
 if(fs.realpathSync(directory)!==directory)denied();
 for(let p=directory;;p=path.dirname(p)){
  const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||![0,process.getuid()].includes(s.uid)||(s.mode&0o022))denied();
  if(p===directory&&(s.uid!==process.getuid()||(s.mode&0o077)))denied();
  if(path.dirname(p)===p)break;
 }
 if(!/^[a-f0-9-]{36}$/.test(nonce))denied();
 const file=path.join(directory,'lifecycle-'+nonce+'.jsonl');
 const fd=fs.openSync(file,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_APPEND|fs.constants.O_NOFOLLOW,0o600);
 const inode=fs.fstatSync(fd);let bytes=0,closed=false;
 return {file,append(event){
  if(closed)denied();const current=fs.lstatSync(file),stat=fs.fstatSync(fd);
  if(current.isSymbolicLink()||current.ino!==inode.ino||current.dev!==inode.dev||stat.nlink!==1
   ||current.uid!==process.getuid()||(current.mode&0o077))denied();
  const line=JSON.stringify(event)+'\n';bytes+=Buffer.byteLength(line);if(bytes>65536)denied();
  const bytesToWrite=Buffer.from(line);let written=0;
  while(written<bytesToWrite.length){const n=fs.writeSync(fd,bytesToWrite,written,bytesToWrite.length-written);if(n<1)denied();written+=n;}
  fs.fsyncSync(fd);
 },close(){if(!closed){closed=true;fs.closeSync(fd);}}};
}
function createProbe({journal,nonce=randomUUID(),durationMs=120000,heartbeatMs=10000,onExit=()=>{},verify=()=>{},processInfo={pid:process.pid,uid:process.getuid?.()}}){
 if(!journal||typeof journal.append!=='function'||!Number.isInteger(durationMs)||durationMs<1||durationMs>180000
  ||!Number.isInteger(heartbeatMs)||heartbeatMs<1||heartbeatMs>30000)denied();
 let deadline,heartbeat,closing=false,ready=false;
 const record=event=>journal.append({event,nonce,...processInfo,at:Date.now()});
 const server=http.createServer({maxHeaderSize:8192},(req,res)=>{
  // No request path, headers, body, cookie or host metadata enters the journal.
  res.writeHead(403,{'Content-Type':'text/plain','Cache-Control':'no-store','Connection':'close','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});
  res.end('Unavailable');req.resume();
 });
 server.headersTimeout=5000;server.requestTimeout=5000;server.keepAliveTimeout=1;
 const close=(reason='stop',exitCode=0)=>{
  if(closing)return;closing=true;clearTimeout(deadline);clearInterval(heartbeat);
  try{record(reason);}catch{exitCode=1;}server.closeAllConnections();
  const finish=()=>{journal.close();onExit(exitCode);};if(server.listening)server.close(finish);else finish();
 };
 server.once('listening',()=>{
  try{verify(server);ready=true;record('ready');}catch{close('listener_refused',1);}
 });
 server.once('error',()=>close('listener_error',1));
 try{record('start');}catch(error){journal.close();throw error;}
 deadline=setTimeout(()=>close('deadline'),durationMs);
 heartbeat=setInterval(()=>{try{if(ready)record('heartbeat');}catch{close('journal_error',1);}},heartbeatMs);
 return {server,close,nonce};
}
function startupFailure(stage,{directory=PRIVATE,uid=process.getuid?.(),context={}}={}){
 // Fixed fields only: never serialize errors, argv, environment or requests.
 const permitted=['managed_context','journal','process_identity','listener_setup'];
 const event={event:'startup_refused',stage:permitted.includes(stage)?stage:'unknown',at:Date.now(),
  context:{expectedUid:uid===UID,expectedRoot:context.root===ROOT,
   expectedManagedRoot:context.managedRoot===ROOT,expectedStartup:context.startup==='probe.cjs',
   expectedLoader:context.loader==='/usr/local/lsws/fcgi-bin/lsnode.js'}};
 console.error('T19_LIFECYCLE_PROBE_REFUSED '+JSON.stringify(event));
 if(uid!==UID)return false;
 let journal;
 try{journal=privateJournal(directory,randomUUID());journal.append(event);return true;}
 catch{return false;}finally{journal?.close();}
}
function main(){
 let stage='managed_context';
 try{
 assertManaged();stage='journal';const nonce=randomUUID(),journal=privateJournal(PRIVATE,nonce);
 stage='process_identity';
 const stat=fs.readFileSync('/proc/self/stat','utf8'),startTicks=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19];
 stage='listener_setup';
 const probe=createProbe({journal,nonce,processInfo:{pid:process.pid,ppid:process.ppid,uid:process.getuid(),startTicks,socketPath:process.env.LSNODE_SOCKET},
  verify:server=>verifyUnixListener(server,process.env.LSNODE_SOCKET),onExit:code=>process.exit(code)});
 for(const signal of ['SIGTERM','SIGINT','SIGHUP'])process.once(signal,()=>probe.close(signal));
 // LiteSpeed redirects this HTTP listener to its managed private Unix socket.
 // No TCP, database, accounting, provider, child process or scheduler is started.
 try{probe.server.listen(0);}catch{probe.close('listen_refused',1);}
 }catch{
  startupFailure(stage,{context:{root:__dirname,managedRoot:process.env.LSNODE_ROOT,
   startup:process.env.LSNODE_STARTUP_FILE,loader:process.argv[1]}});
  process.exitCode=1;
 }
}
module.exports={assertManaged,verifyUnixListener,privateJournal,createProbe,startupFailure};
if(require.main===module||process.argv[1]==='/usr/local/lsws/fcgi-bin/lsnode.js'){
 try{main();}catch{console.error('T19_LIFECYCLE_PROBE_REFUSED');process.exitCode=1;}
}
