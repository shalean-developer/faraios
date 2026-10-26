// DEPLOY-153: pure release evidence validator. Does not deploy or contact hosts.
import {hostedSourceFingerprint} from './hosted-source-fingerprint.mjs';

export function verifyReleaseEvidence({release,health,expectedSha,computedFingerprint}){
  const hex40=/^[a-f0-9]{40}$/;const hex64=/^[a-f0-9]{64}$/;
  if(!hex40.test(expectedSha??'')||release?.commit!==expectedSha)
    throw new Error('RELEASE_COMMIT_MISMATCH');
  if(release?.environment!=='staging'||release?.startup!=='_passenger.cjs'||
     release?.approvedCI!==true||release?.rollbackReady!==true||
     !hex64.test(release?.sourceFingerprint??'')||release.sourceFingerprint!==computedFingerprint)
    throw new Error('RELEASE_NOT_APPROVED');
  if(health?.environment!=='staging'||health?.projectRef!=='xdmfyrsauvqznkloroxg'||
     health?.sourceFingerprint!==computedFingerprint||
     !['passenger','litespeed'].includes(health?.transport)||
     health?.appPaymentDispatch!=='disabled'||
     health?.appNotificationDispatch!=='disabled'||
     health?.accountingWorker!=='disabled')
    throw new Error('RELEASE_HEALTH_MISMATCH');
  return {result:'PASS',commit:expectedSha,sourceFingerprint:computedFingerprint};
}
export async function verifyLocalSourceEvidence({release,health,expectedSha}){
  return verifyReleaseEvidence({release,health,expectedSha,
    computedFingerprint:await hostedSourceFingerprint()});
}
