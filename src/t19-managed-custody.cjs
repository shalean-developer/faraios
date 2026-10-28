// Explicit isolated custody host. Importing this module starts nothing.
const http=require('node:http');
const net=require('node:net');
const fs=require('node:fs');
const {EventEmitter}=require('node:events');
const HOME='/var/www/vhosts/custody-staging.faraios.com';
const ROOT=HOME+'/app';
const SOCKET='/usr/local/lsws/extapp-sock/APVH_custody-staging.faraios.com:443:_.sock';
const CONFIG=HOME+'/.faraios-t19-custody/custody.json';
const denied=()=>new Error('managed_custody_rejected');
function assertManaged({platform=process.platform,uid=process.getuid?.(),root=require('node:path').resolve(__dirname,'..'),env=process.env,argv=process.argv,lsNode=global.LsNode,serverPrototype=http.Server.prototype}={}){
 if(platform!=='linux'||uid!==10521||root!==ROOT||![ROOT,ROOT+'/'].includes(env.LSNODE_ROOT)
  ||env.LSNODE_STARTUP_FILE!=='_custody.cjs'||env.LSNODE_SOCKET!==SOCKET
  ||argv[1]!=='/usr/local/lsws/fcgi-bin/lsnode.js'||!(lsNode instanceof EventEmitter)
  ||typeof serverPrototype.realListen!=='function')throw denied();
}
function verifyPrimary(server,socket=SOCKET){
 const fd=server?._handle?.fd,actual=net.Server.prototype.address.call(server);
 if(!Number.isInteger(fd)||fd<0||!server.listening||(actual!==null&&actual!==socket))throw denied();
 const stat=fs.fstatSync(fd,{bigint:true});if(!stat.isSocket())throw denied();
 const rows=fs.readFileSync('/proc/self/net/unix','utf8').split('\n').slice(1).map(l=>l.trim().split(/\s+/)).filter(r=>r[6]===String(stat.ino));
 if(rows.length!==1||rows[0].length!==8||rows[0][7]!==socket||rows[0][3]!=='00010000'||rows[0][4]!=='0001'||rows[0][5]!=='01')throw denied();
 if(actual===null){const stdin=fs.fstatSync(0,{bigint:true});if(!stdin.isSocket()||stdin.dev!==stat.dev||stdin.ino!==stat.ino)throw denied();}
}
// The public managed listener is only a cold-start trigger. It never proxies,
// reads credentials from requests, or dispatches an accounting operation.
async function startManagedCustody({load,start,assertContext=assertManaged,verifyListener=verifyPrimary,createPrimary=http.createServer,signals=process}={}){
 assertContext();
 if(typeof load!=='function'||typeof start!=='function')throw denied();
 let ready=false,stopped=false,service,opening,primaryClosing,closing;
 const primary=createPrimary({maxHeaderSize:8192},(req,res)=>{
  res.writeHead(ready&&!stopped?403:503,{'Content-Type':'text/plain','Cache-Control':'no-store','Connection':'close',
   'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});
  res.end('Unavailable');req.resume();
 });
 primary.headersTimeout=5000;primary.requestTimeout=5000;primary.keepAliveTimeout=1;
 const closePrimary=()=>primaryClosing??=new Promise(resolve=>{
  primary.closeAllConnections();if(primary.listening)primary.close(()=>resolve());else resolve();
 });
 const onSignal=()=>{close().catch(()=>{signals.exitCode=1;});};
 const close=()=>closing??=(async()=>{
  stopped=true;ready=false;await closePrimary();
  // A signal during asynchronous startup must also close any late service.
  try{await opening;}catch{}
  try{if(service)await service.close();}finally{
   for(const signal of ['SIGTERM','SIGINT','SIGHUP'])signals.removeListener(signal,onSignal);
   service?.server?.removeListener('close',onServiceEnd);service?.server?.removeListener('error',onServiceEnd);
  }
 })();
 const fail=()=>{signals.exitCode=1;onSignal();};
 const onServiceEnd=()=>{if(!stopped)fail();};
 primary.on('error',fail);
 primary.once('close',()=>{if(!stopped)fail();});
 for(const signal of ['SIGTERM','SIGINT','SIGHUP'])signals.once(signal,onSignal);
 opening=(async()=>{
  await new Promise((resolve,reject)=>{
   const onError=()=>reject(denied());primary.once('error',onError);
   primary.once('listening',()=>{primary.removeListener('error',onError);resolve();});
   try{primary.listen(0);}catch{reject(denied());}
  });
  verifyListener(primary);
  if(stopped)throw denied();
  const config=await load(CONFIG);
  if(stopped)throw denied();
  service=await start(config);
  service?.server?.once('close',onServiceEnd);service?.server?.on('error',onServiceEnd);
  if(stopped)throw denied();
  ready=true;
 })();
 try{await opening;return Object.freeze({primary,close});}
 catch{try{await close();}catch{}throw denied();}
}
module.exports={assertManaged,verifyPrimary,startManagedCustody,CONFIG,ROOT,SOCKET};
