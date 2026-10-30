// Pure route preparation. Existing guarded SQL changes only in result telemetry.
import {operationalCommitPackage} from './t19-operational-commit-package.mjs';
import {sha} from './t19-provisioning-package.mjs';
const candidate="SELECT current_setting('faraios.t19_commit_baseline') AS candidate_committed_baseline;";
const fresh="SELECT current_setting('faraios.t19_fresh_baseline') AS fresh_committed_baseline;";
export function sqlEditorCommitPackage(input,contracts,now=Date.now()){
 const base=operationalCommitPackage(input,contracts,now);
 if(base.sql.split(candidate).length!==2||base.postCommitSQL.split(fresh).length!==2)
  throw Error('T19_SQL_EDITOR_ROUTE_REFUSED');
 const sql=base.sql.replace(candidate,()=>candidate.slice(0,-1)+', pg_backend_pid() AS execution_backend_pid;');
 const postCommitSQL=base.postCommitSQL.replace(fresh,()=>fresh.slice(0,-1)+', pg_backend_pid() AS verification_backend_pid;');
 return Object.freeze({...base,purpose:'review-only-sql-editor-stage-commit-candidate',
  route:'supabase-sql-editor-with-independent-readback',baseSqlSha256:base.sqlSha256,
  basePostCommitSha256:base.postCommitSha256,independentBackendRequired:true,
  sqlSha256:sha(sql),postCommitSha256:sha(postCommitSQL),sql,postCommitSQL});
}
export function editorPacketFromVerifiedHistory(original,approvedOriginalHash,input,contracts,now=Date.now()){
 if(!original||typeof approvedOriginalHash!=='string'||!/^[a-f0-9]{64}$/.test(approvedOriginalHash)||
 !input||original.stage!==input.stage||original.projectRef!==input.projectRef||
 original.baselineSha256!==input.baselineSha256||original.rehearsalEvidenceSha256!==input.rehearsalEvidenceSha256||
 original.nonce===input.nonce||input.issuedAt<=original.issuedAt)throw Error('T19_EDITOR_HISTORY_BINDING_REFUSED');
 const old=operationalCommitPackage({projectRef:original.projectRef,stage:original.stage,sql:input.sql,
  baselineSha256:original.baselineSha256,nonce:original.nonce,rehearsalEvidenceSha256:original.rehearsalEvidenceSha256,
  issuedAt:original.issuedAt,expiresAt:original.expiresAt},contracts,original.issuedAt);
 const {sql,postCommitSQL,...binding}=old;
 if(Object.keys(original).sort().join(',')!==Object.keys(binding).sort().join(',')||
 Object.keys(binding).some(k=>original[k]!==binding[k])||old.sqlSha256!==approvedOriginalHash)
  throw Error('T19_EDITOR_HISTORY_BINDING_REFUSED');
 return Object.freeze({...sqlEditorCommitPackage(input,contracts,now),
  originalPacketSqlSha256:approvedOriginalHash,historyEvidenceRoute:'owner-reported-local-byte-verification'});
}
export function assessEditorReadback(candidateRow,freshRow){
 const c=candidateRow,f=freshRow;
 if(!c||!f||!Number.isSafeInteger(c.execution_backend_pid)||c.execution_backend_pid<=0||
 !Number.isSafeInteger(f.verification_backend_pid)||f.verification_backend_pid<=0||
 typeof c.candidate_committed_baseline!=='string'||!/^[a-f0-9]{64}$/.test(c.candidate_committed_baseline)||
 c.candidate_committed_baseline!==f.fresh_committed_baseline||c.execution_backend_pid===f.verification_backend_pid)
  return Object.freeze({status:'READBACK_REQUIRES_REVIEW',activationAuthorized:false,retryAuthorized:false});
 return Object.freeze({status:'INDEPENDENT_BACKEND_FINGERPRINT_MATCH',activationAuthorized:false,retryAuthorized:false});
}
