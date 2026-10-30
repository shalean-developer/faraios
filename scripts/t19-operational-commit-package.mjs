// Offline staged preparation only. Does not execute SQL or authorize operations.
import {rehearsalPackage,nativeSnapshotSQL,identitySQL,sha} from './t19-provisioning-package.mjs';
import {CONTRACT_SHA256 as RUNTIME_CONTRACT_SHA256} from './t19-runtime-commit-package.mjs';
import {operationalContractSQL} from './t19-operational-contract.mjs';
export const CONTRACT_PINS=Object.freeze({runtime:RUNTIME_CONTRACT_SHA256,
 oauth:'b20ca727955c3fb46621cc60e2480813dbd9db15181c502351265a978511a4b0',
 api:'8c109b208a530943c0a4e7de378fec9a28475f9a4868bc5b669bc6f3c9952791'}); // ggignore: public synthetic catalog integrity hashes.
const refuse=()=>{throw Error('T19_OPERATIONAL_COMMIT_PACKAGE_REFUSED');};
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const prior={oauth:'runtime',api:'oauth'};
const dataHash="encode(sha256(convert_to((SELECT coalesce(jsonb_agg(e ORDER BY e->>0,e->>1),'[]'::jsonb) FROM jsonb_array_elements(records) e WHERE e->>0<>'private_t19_custody')::text,'UTF8')),'hex')";
export function operationalContractGuard(stage,text){
 if(typeof stage!=='string'||!Object.hasOwn(CONTRACT_PINS,stage)||typeof text!=='string'||sha(text)!==CONTRACT_PINS[stage])refuse();
 const expected=stage==='runtime'?JSON.stringify({...JSON.parse(text),publicWrappers:[]}):text;
 return `DO $t19_operational_contract$ DECLARE actual jsonb; expected jsonb:=${literal(expected)}::jsonb; BEGIN ${identitySQL}
${operationalContractSQL.replace(/ AS contract;$/, ' INTO actual;')}
IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'T19_OPERATIONAL_EXACT_CONTRACT_MISMATCH' USING DETAIL=(SELECT string_agg(k,',' ORDER BY k) FROM jsonb_object_keys(expected) k WHERE actual->k IS DISTINCT FROM expected->k); END IF; END $t19_operational_contract$;`;
}
export function operationalCommitPackage(input,contracts,now=Date.now()){
 if(!input||Object.keys(input).sort().join(',')!=='baselineSha256,expiresAt,issuedAt,nonce,projectRef,rehearsalEvidenceSha256,sql,stage'||
 !Object.hasOwn(prior,input.stage)||typeof input.nonce!=='string'||!/^[a-f0-9]{32}$/.test(input.nonce)||
 typeof input.rehearsalEvidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(input.rehearsalEvidenceSha256)||
 !contracts||Object.keys(contracts).sort().join(',')!=='after,before')refuse();
 const {nonce,rehearsalEvidenceSha256,...base}=input;
 const rehearsal=rehearsalPackage(base,now);
 const before=operationalContractGuard(prior[input.stage],contracts.before);
 const after=operationalContractGuard(input.stage,contracts.after);
 if(rehearsal.sql.split('END $t19_before$;').length!==2||!rehearsal.sql.endsWith('ROLLBACK;'))refuse();
 const ending=`${after}
DO $t19_commit_candidate$ ${nativeSnapshotSQL}
IF ${dataHash} IS DISTINCT FROM current_setting('faraios.t19_commit_before_data') THEN RAISE EXCEPTION 'T19_PROTECTED_DATA_CHANGED'; END IF;
IF clock_timestamp()>=to_timestamp(${input.expiresAt}/1000.0) THEN RAISE EXCEPTION 'T19_PACKET_EXPIRED'; END IF;
PERFORM set_config('faraios.t19_commit_baseline',digest,true); END $t19_commit_candidate$;
SELECT current_setting('faraios.t19_commit_baseline') AS candidate_committed_baseline;
COMMIT;
`;
 const sql=`-- ${input.stage} commit candidate ${nonce}; rehearsal evidence ${rehearsalEvidenceSha256}.\n`+
 rehearsal.sql.replace('SET LOCAL search_path=pg_catalog;',"SET LOCAL search_path=pg_catalog;\nSET LOCAL standard_conforming_strings=on;")
 .replace('END $t19_before$;',()=>`PERFORM set_config('faraios.t19_commit_before_data',${dataHash},true); END $t19_before$;\n${before}`)
 .slice(0,-'ROLLBACK;'.length)+ending;
 const postCommitSQL=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL idle_in_transaction_session_timeout='60s';
SET LOCAL search_path=pg_catalog;
SET LOCAL standard_conforming_strings=on;
${after}
DO $t19_fresh$ ${nativeSnapshotSQL}
PERFORM set_config('faraios.t19_fresh_baseline',digest,true); END $t19_fresh$;
SELECT current_setting('faraios.t19_fresh_baseline') AS fresh_committed_baseline;
COMMIT;
`;
 return Object.freeze({version:1,purpose:'review-only-operational-stage-commit-candidate',projectRef:input.projectRef,
 stage:input.stage,priorStage:prior[input.stage],nonce,sourceSha256:rehearsal.sourceSha256,
 baselineSha256:input.baselineSha256,beforeContractSha256:CONTRACT_PINS[prior[input.stage]],
 contractSha256:CONTRACT_PINS[input.stage],rehearsalEvidenceSha256,issuedAt:input.issuedAt,expiresAt:input.expiresAt,
 sqlSha256:sha(sql),postCommitSha256:sha(postCommitSQL),executionAuthorized:false,activationAuthorized:false,sql,postCommitSQL});
}
