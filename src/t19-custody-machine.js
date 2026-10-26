// Restricted service TLS peer verification. No keys, CA configuration or listener.
import {TLSSocket} from 'node:tls';
import {createHash} from 'node:crypto';
const denied=()=>Object.assign(new Error('custody_denied'),{code:'custody_denied'});
export function createCustodyMachineAuthenticator({findMachineByFingerprint}){
 if(typeof findMachineByFingerprint!=='function')throw denied();
 return async function authenticateMachine(socket){
  try{
   // Trust the direct TLS connection only, never forwarded certificate headers.
   if(!(socket instanceof TLSSocket)||socket.encrypted!==true||socket.authorized!==true||socket.destroyed)throw denied();
   const raw=socket.getPeerCertificate()?.raw;
   if(!Buffer.isBuffer(raw)||raw.length===0)throw denied();
   const fingerprint=createHash('sha256').update(raw).digest('hex');
   const record=await findMachineByFingerprint(fingerprint);
   if(socket.destroyed||!record||record.active!==true||record.fingerprint256!==fingerprint
     ||typeof record.id!=='string'||!record.id||record.id.length>120)throw denied();
   return Object.freeze({id:record.id,active:true});
  }catch{throw denied();}
 };
}
