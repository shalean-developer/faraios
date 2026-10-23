const path=require('node:path');
const http=require('node:http');
const {EventEmitter}=require('node:events');
const {lstatSync,fstatSync,readFileSync,readlinkSync}=require('node:fs');
const {Server}=require('node:net');
const root=path.resolve(__dirname,'..');

// The ordinary marker is trusted only behind the reviewed web-server rules.
exports.httpsRules='RewriteEngine On\nRewriteCond %{HTTPS} !^on$ [NC]\nRewriteRule ^ - [F,L]\nRequestHeader unset X-FaraiOS-Staging-HTTPS\nRequestHeader set X-FaraiOS-Staging-HTTPS "on"\n';
exports.detectHostedRuntime=function({passenger=global.PhusionPassenger,lsNode=global.LsNode,env=process.env,argv=process.argv,serverPrototype=http.Server.prototype}={}){
  if(passenger&&typeof passenger.configure==='function')return 'passenger';
  if(lsNode instanceof EventEmitter&&typeof serverPrototype.realListen==='function'&&
     argv[1]==='/usr/local/lsws/fcgi-bin/lsnode.js'&&
     typeof env.LSNODE_SOCKET==='string'&&path.isAbsolute(env.LSNODE_SOCKET)&&
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
exports.assertPrivateSocket=function(server,socketPath){
  const actual=Server.prototype.address.call(server);
  const stat=lstatSync(socketPath),parent=lstatSync(path.dirname(socketPath));
  if(actual===null)exports.assertInheritedUnixSocket(server,socketPath);
  if((actual!==socketPath&&actual!==null)||!stat.isSocket()||stat.isSymbolicLink()||(stat.mode&0o007)!==0||
     ![0,process.getuid()].includes(stat.uid)||!parent.isDirectory()||parent.isSymbolicLink()||
     (parent.mode&0o002)!==0||![0,process.getuid()].includes(parent.uid))throw new Error('Hosted staging requires a private Unix socket');
};
