// T19 exact-run approval verifier. Verification only; never starts Docker.
// Approval must be signed by independently held private key. No key provisioned in repo.
import {verify,createPublicKey,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const IMAGE='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const SHA=/^[a-f0-9]{64}$/;const NONCE=/^[a-f0-9]{32}$/;
export async function verifyExactRun({receipt,signature,publicKeyPem,scriptBytes,now=Date.now()}={}){
 const deny=reason=>({authorized:false,reason});
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return deny('RECEIPT_INVALID');
 if(!publicKeyPem||!signature||!scriptBytes)return deny('APPROVAL_MISSING');
 const keys=['version','scriptSha256','image','containerName','nonce','expiresAt','scope'];
 if(Object.keys(receipt).sort().join(',')!==keys.sort().join(','))return deny('RECEIPT_FIELDS');
 if(receipt.version!==1||!SHA.test(receipt.scriptSha256??'')||!NONCE.test(receipt.nonce??'')||
 receipt.image!==IMAGE||receipt.containerName!=='faraios-t19-managed-qa'||
 receipt.scope!=='local-disposable-postgres-startup-only'||!Number.isSafeInteger(receipt.expiresAt)||
 receipt.expiresAt<=now||receipt.expiresAt>now+15*60*1000)return deny('RECEIPT_CONSTRAINTS');
 if(createHash('sha256').update(scriptBytes).digest('hex')!==receipt.scriptSha256)return deny('SCRIPT_CHANGED');
 try{
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519')return deny('KEY_TYPE');
  const data=Buffer.from(JSON.stringify(Object.fromEntries(keys.map(k=>[k,receipt[k]]))));
  const raw=Buffer.from(signature,'base64');
  if(raw.length!==64||!verify(null,data,key,raw))return deny('SIGNATURE_INVALID');
 }catch{return deny('SIGNATURE_INVALID');}
 // Signature only: nonce replay fencing and owner grant custody must be independently implemented.
 return {authorized:false,signatureValid:true,reason:'NONCE_CONSUMPTION_AND_APPROVAL_CUSTODY_NOT_IMPLEMENTED'};
}
export async function scriptDigest(path){return createHash('sha256').update(await readFile(path)).digest('hex');}
