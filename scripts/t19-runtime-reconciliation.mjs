// Read-only outcome reconciliation. Never executes SQL or authorizes a retry.
import {runtimeCommitPackage,CONTRACT_SHA256} from './t19-runtime-commit-package.mjs';
import {nativeSnapshotSQL,sha} from './t19-provisioning-package.mjs';
import {runtimeContractSQL} from './t19-runtime-contract.mjs';
const refuse=()=>{throw Error('T19_RUNTIME_RECONCILIATION_REFUSED');};
const literal=s=>"'"+s.replaceAll("'","''")+"'";
export function runtimeReconciliationSQL(packet,source,contractText,candidate=null){
 if(!packet||typeof packet!=='object'||Array.isArray(packet)||
    candidate!==null&&(typeof candidate!=='string'||!/^[a-f0-9]{64}$/.test(candidate)))refuse();
 // Reconstruct at issuance: expiry prohibits execution, not later inspection.
 const expected=runtimeCommitPackage({projectRef:packet.projectRef,stage:packet.stage,
  sql:source,baselineSha256:packet.baselineSha256,nonce:packet.nonce,
  rehearsalEvidenceSha256:packet.rehearsalEvidenceSha256,
  issuedAt:packet.issuedAt,expiresAt:packet.expiresAt},contractText,packet.issuedAt);
 const {sql,postCommitSQL,...binding}=expected;
 if(Object.keys(packet).sort().join(',')!==Object.keys(binding).sort().join(',')||
    Object.keys(binding).some(k=>packet[k]!==binding[k])||sha(contractText)!==CONTRACT_SHA256)refuse();
 return `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL idle_in_transaction_session_timeout='60s';
SET LOCAL search_path=pg_catalog;
SET LOCAL standard_conforming_strings=on;
DO $t19_reconcile$ ${nativeSnapshotSQL}
 DECLARE actual_contract jsonb; status text;
 BEGIN
 ${runtimeContractSQL.replace(/ AS contract;$/, ' INTO actual_contract;')}
 IF digest=${literal(packet.baselineSha256)} THEN
  status:='ORIGINAL_BASELINE_VERIFIED_NO_INSTALLATION';
 ELSIF actual_contract IS NOT DISTINCT FROM ${literal(contractText)}::jsonb
       AND ${candidate===null?'false':`digest=${literal(candidate)}`} THEN
  status:='EXPECTED_COMMITTED_STATE_VERIFIED';
 ELSE
  status:='QUARANTINE_REQUIRES_REVIEW';
 END IF;
 PERFORM set_config('faraios.t19_reconciliation',jsonb_build_object(
  'status',status,'baselineSha256',digest,'packetSqlSha256',${literal(packet.sqlSha256)},
  'candidateProvided',${candidate!==null},'retryAuthorized',false,
  'activationAuthorized',false)::text,true);
 END;
END $t19_reconcile$;
SELECT current_setting('faraios.t19_reconciliation')::jsonb AS reconciliation;
COMMIT;
`;
}
