// T19 Gate 2 single execution boundary. Source-only, NEVER a CLI.
// The sole path toward the lifecycle engine; authorization, replay storage and
// independently trusted signer must all be verified before mutation.
// No production grant issuer or mutation adapter is wired here.
import {verifyExactRun} from './t19-gate2-authorization.mjs';
import {runDisposable} from './t19-gate2-operational-engine.mjs';
import {makeRestrictedDocker} from './t19-gate2-restricted-docker.mjs';
import {executeGate2} from './t19-gate2-integrated.mjs';
export async function gate2Execute({approval,scriptBytes,nonceStore,trust,processRunner,journal,sqlIntegrity}={}){
 // V2 ignores every caller-supplied trust/runner/SQL dependency. Host-installed
 // independent public keys and signed exact bundle/operation scope are required.
 if(approval?.receipt?.version===2)return executeGate2(approval);
 const reject=(reason)=>({status:'NO_GO',reason,mutationAttempted:false});
 if(!approval||!scriptBytes)return reject('MISSING_EXACT_RUN_RECEIPT');
 if(typeof trust?.resolveApprovedPublicKey!=='function')return reject('INDEPENDENT_KEY_CUSTODY_MISSING');
 const publicKeyPem=await trust.resolveApprovedPublicKey(approval.receipt);
 if(!publicKeyPem)return reject('UNTRUSTED_SIGNER');
 const verdict=await verifyExactRun({...approval,publicKeyPem,scriptBytes});
 if(verdict.signatureValid!==true)return reject('SIGNATURE_OR_SCOPE_INVALID');
 if(typeof nonceStore?.consumeOnce!=='function')return reject('DURABLE_REPLAY_FENCE_MISSING');
 if(typeof processRunner!=='function'||typeof journal?.createIntent!=='function'||
 typeof sqlIntegrity!=='function')return reject('INTEGRATED_EXECUTION_DEPENDENCIES_MISSING');
 // Current signature verifier deliberately cannot authorize. The grant must be
 // authenticated and durably consumed by a separately reviewed implementation.
 if(verdict.authorized!==true)return reject('SIGNED_BUT_EXECUTION_NOT_AUTHORIZED');
 // Keep future wiring visible for review; this branch is unreachable while the
 // trusted exact-run verifier returns authorized:false.
 const consumed=await nonceStore.consumeOnce(approval.receipt.nonce);
 if(consumed!==true)return reject('NONCE_ALREADY_USED_OR_UNCERTAIN');
 const grant=Object.freeze({consumed:true,scope:approval.receipt.scope,
  nonce:approval.receipt.nonce,digest:approval.receipt.scriptSha256});
 const docker=makeRestrictedDocker({run:processRunner,nonce:grant.nonce,
  image:approval.receipt.image,name:approval.receipt.containerName,grant});
 // SQL must be inside this authorized gateway, not caller-selected live SQL.
 const restricted=Object.freeze({...docker,runSyntheticSql:sqlIntegrity});
 return runDisposable({docker:restricted,journal,grant,
  expectedImage:approval.receipt.image,expectedName:approval.receipt.containerName});
}
