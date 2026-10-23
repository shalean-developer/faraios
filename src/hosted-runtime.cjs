const path=require('node:path');
const http=require('node:http');
const {EventEmitter}=require('node:events');
const {lstatSync,fstatSync,readFileSync,readlinkSync}=require('node:fs');
const {Server}=require('node:net');
const root=path.resolve(__dirname,'..');
const hosting=Object.freeze(require('../config/hosting-staging.json'));

// The ordinary marker is trusted only behind the reviewed web-server rules.
exports.httpsRules='RewriteEngine On\nRewriteCond %{HTTPS} !^on$ [NC]\nRewriteRule ^ - [F,L]\nRequestHeader unset X-FaraiOS-Staging-HTTPS\nRequestHeader set X-FaraiOS-Staging-HTTPS "on"\n';
exports.detectHostedRuntime=function({passenger=global.PhusionPassenger,lsNode=global.LsNode,env=process.env,argv=process.argv,serverPrototype=http.Server.prototype}={}){
  if(passenger&&typeof passenger.configure==='function')return 'passenger';
  if(process.platform==='linux'&&lsNode instanceof EventEmitter&&typeof serverPrototype.realListen==='function'&&
     argv[1]==='/usr/local/lsws/fcgi-bin/lsnode.js'&&
     env.LSNODE_SOCKET===hosting.socketPath&&
     typeof env.LSNODE_ROOT==='string'&&path.resolve(env.LSNODE_ROOT)===root&&
     env.LSNODE_STARTUP_FILE==='_passenger.cjs')return 'litespeed';
  throw new Error('Hosted staging requires a verified Passenger or LiteSpeed runtime');
};
exports.assertInheritedUnixSocket=function(server,socketPath){
  // Node 24's public address() does not retain the path for an inherited fd.
  // Prove the actual listener's kernel identity; never infer Unix from null.
  if(typeof socketPath!=='string'||!path.isAbsolute(socketPath)||/[\0\r\n]/.test(socketPath))throw new Error('Inherited Unix path refused');
  const fd=server?._handle?.fd;
  if(process.platform!=='linux'||!Number.isInteger(fd)||fd<0||!server.listening)throw new Error('Inherited Unix listener unavailable');
  const stat=fstatSync(fd,{bigint:true});
  const stdin=fstatSync(0,{bigint:true}),link='socket:['+stat.ino.toString()+']';
  if(!stat.isSocket()||!stdin.isSocket()||stat.dev!==stdin.dev||stat.ino!==stdin.ino||readlinkSync('/proc/self/fd/'+fd)!==link||readlinkSync('/proc/self/fd/0')!==link)throw new Error('Inherited Unix listener mismatch');
  const matches=readFileSync('/proc/self/net/unix','utf8').split('\n').slice(1).map(l=>l.trim().split(/\s+/)).filter(a=>a[6]===stat.ino.toString());
  if(matches.length!==1)throw new Error('Inherited Unix listener ambiguous');
  const row=matches[0];
  if(row.length!==8||row[7]!==socketPath||row[3]!=='00010000'||row[4]!=='0001'||row[5]!=='01')throw new Error('Inherited Unix listener not approved');
};
// POSIX ACL named-entry permissions are capped by the group-class mask,
// represented by the group mode bits. No group/other write means no
// non-owner connect or pathname replacement, even with extended access ACLs.
exports.assertSocketComponent=function(stat,{directory=false,socketPath,appUid=process.getuid(),verifiedLiteSpeed=false}={}){
  const owners=[0,appUid];
  if(verifiedLiteSpeed&&socketPath===hosting.socketPath)owners.push(hosting.webServerUid);
  if(stat.isSymbolicLink()||!(directory?stat.isDirectory():stat.isSocket())||
     (stat.mode&0o022)!==0||!owners.includes(stat.uid))throw new Error('Hosted staging requires a private Unix socket');
};
exports.assertPrivateSocket=function(server,socketPath){
  if(typeof socketPath!=='string'||!path.isAbsolute(socketPath)||path.normalize(socketPath)!==socketPath||/[\0\r\n]/.test(socketPath))throw new Error('Hosted staging requires a private Unix socket');
  const verifyListener=()=>{
    const actual=Server.prototype.address.call(server);
    if(!server.listening||(actual!==socketPath&&actual!==null))throw new Error('Hosted staging requires a private Unix socket');
    if(actual===null)exports.assertInheritedUnixSocket(server,socketPath);
  };
  verifyListener();
  let verifiedLiteSpeed=false;
  if(socketPath===hosting.socketPath){
    try{verifiedLiteSpeed=exports.detectHostedRuntime()==='litespeed';}catch{}
  }
  const entries=[];
  for(let current=socketPath;;current=path.dirname(current)){
    const stat=lstatSync(current),directory=current!==socketPath;
    exports.assertSocketComponent(stat,{directory,socketPath,verifiedLiteSpeed});
    entries.push({current,stat});
    if(current===path.parse(current).root)break;
  }
  // Fail closed if ownership, permissions, type or identity changed during proof.
  for(const {current,stat} of entries){
    const after=lstatSync(current);
    if(['dev','ino','uid','gid','mode','ctimeMs'].some(key=>after[key]!==stat[key]))throw new Error('Hosted staging requires a private Unix socket');
  }
  verifyListener();
};

// Private startup diagnostics contain host metadata, never credentials.
exports.describePrivateSocket=function(server,socketPath){
  let serviceOwner=false;
  try{serviceOwner=socketPath===hosting.socketPath&&exports.detectHostedRuntime()==='litespeed';}catch{}
  const owners=[0,process.getuid(),...(serviceOwner?[hosting.webServerUid]:[])];
  const result={listening:server.listening,addressMatches:false,inheritedVerified:false,socketPresent:false,socketType:false,socketPermissions:false,socketOwner:false,parentType:false,parentPermissions:false,parentOwner:false};
  try{result.addressMatches=Server.prototype.address.call(server)===socketPath;}catch{}
  try{exports.assertInheritedUnixSocket(server,socketPath);result.inheritedVerified=true;}catch{}
  try{const s=lstatSync(socketPath);result.socketPresent=true;result.socketType=s.isSocket()&&!s.isSymbolicLink();result.socketPermissions=(s.mode&0o022)===0;result.socketOwner=owners.includes(s.uid);}catch{}
  try{const s=lstatSync(path.dirname(socketPath));result.parentType=s.isDirectory()&&!s.isSymbolicLink();result.parentPermissions=(s.mode&0o022)===0;result.parentOwner=owners.includes(s.uid);}catch{}
  result.access=result.inheritedVerified?require('./socket-access.cjs').inspectSocketAccess(socketPath):{complete:false,failure:'kernel-identity-unverified'};
  return result;
};
