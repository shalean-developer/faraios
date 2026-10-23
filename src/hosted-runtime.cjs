const path=require('node:path');
const http=require('node:http');
const {EventEmitter}=require('node:events');
const {lstatSync}=require('node:fs');
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
exports.assertPrivateSocket=function(server,socketPath){
  const actual=Server.prototype.address.call(server);
  const stat=lstatSync(socketPath),parent=lstatSync(path.dirname(socketPath));
  if(actual!==socketPath||!stat.isSocket()||stat.isSymbolicLink()||(stat.mode&0o007)!==0||
     ![0,process.getuid()].includes(stat.uid)||!parent.isDirectory()||parent.isSymbolicLink()||
     (parent.mode&0o002)!==0||![0,process.getuid()].includes(parent.uid))throw new Error('Hosted staging requires a private Unix socket');
};
