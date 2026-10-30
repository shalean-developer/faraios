// Credential-free host preflight; never creates state, reads secrets or runs SQL.
import {lookup} from 'node:dns/promises';
import {connect} from 'node:net';
import https from 'node:https';
const pooler='aws-0-eu-west-1.pooler.supabase.com';
const probeTCP=(host,port,family)=>new Promise(resolve=>{
 const socket=connect({host,port,family});let done=false;
 const finish=value=>{if(done)return;done=true;socket.destroy();resolve({host,port,family,...value});};
 socket.setTimeout(8000);socket.once('connect',()=>finish({status:'reachable'}));socket.once('timeout',()=>finish({status:'timeout'}));socket.once('error',e=>finish({status:'unavailable',code:e.code??'unknown'}));
});
const probeHTTPS=host=>new Promise(resolve=>{
 const req=https.get({hostname:host,path:'/',timeout:8000,rejectUnauthorized:true},res=>{const verified=res.socket.authorized;res.resume();resolve({host,status:res.statusCode,tlsVerified:verified});});
 req.once('timeout',()=>req.destroy(Error('timeout')));req.once('error',()=>resolve({host,status:'unavailable',tlsVerified:false}));
});
const direct='db.xdmfyrsauvqznkloroxg.supabase.co';
const results={node:process.version,pooler:await probeTCP(pooler,5432,4),directIPv6:await probeTCP(direct,5432,6),https:await Promise.all(['accounts.zoho.com','www.zohoapis.com','xdmfyrsauvqznkloroxg.supabase.co'].map(probeHTTPS))};
try{results.poolerDNS=await lookup(pooler,{all:true,family:4});}catch{results.poolerDNS=[];}
console.log(JSON.stringify(results));
if(results.pooler.status!=='reachable'||results.https.some(r=>!r.tlsVerified))process.exitCode=1;
