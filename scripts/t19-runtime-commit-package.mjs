// Offline preparation only; neither this module nor its CLI executes SQL.
import {rehearsalPackage,nativeSnapshotSQL,identitySQL,sha} from './t19-provisioning-package.mjs';
import {runtimeContractSQL} from './t19-runtime-contract.mjs';
export const CONTRACT_SHA256='06737ade20ebea9b7b595d31c984fbc0d00910fcb40c682dc640c237bda6019b'; // ggignore: public contract integrity hash.
const reject=()=>{throw Error('RUNTIME_COMMIT_PACKAGE_REFUSED');};
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const dataHash="encode(sha256(convert_to((SELECT coalesce(jsonb_agg(e ORDER BY e->>0,e->>1),'[]'::jsonb) FROM jsonb_array_elements(records) e WHERE e->>0<>'private_t19_custody')::text,'UTF8')),'hex')";
export function runtimeContractGuard(expectedText){
 if(typeof expectedText!=='string'||sha(expectedText)!==CONTRACT_SHA256)reject();
 return `DO $t19_contract$ DECLARE actual jsonb; expected jsonb:=${literal(expectedText)}::jsonb; BEGIN ${identitySQL}\n${runtimeContractSQL.replace(/ AS contract;$/, ' INTO actual;')}\nIF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'T19_RUNTIME_EXACT_CONTRACT_MISMATCH' USING DETAIL=(SELECT string_agg(k,',' ORDER BY k) FROM jsonb_object_keys(expected) k WHERE actual->k IS DISTINCT FROM expected->k); END IF; END $t19_contract$;`;
}
export function runtimeCommitPackage(input,expectedText,now=Date.now()){
 if(!input||Object.keys(input).sort().join(',')!=='baselineSha256,expiresAt,issuedAt,nonce,projectRef,rehearsalEvidenceSha256,sql,stage'||input.stage!=='runtime'||typeof input.nonce!=='string'||!/^[a-f0-9]{32}$/.test(input.nonce)||typeof input.rehearsalEvidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(input.rehearsalEvidenceSha256))reject();
 const {nonce,rehearsalEvidenceSha256,...base}=input;
 const rehearsal=rehearsalPackage(base,now),contract=runtimeContractGuard(expectedText);
 const captureBefore=`PERFORM set_config('faraios.t19_commit_before_data',${dataHash},true);`;
 const ending=`${contract}\nDO $t19_commit_candidate$ ${nativeSnapshotSQL}\nIF ${dataHash} IS DISTINCT FROM current_setting('faraios.t19_commit_before_data') THEN RAISE EXCEPTION 'T19_PROTECTED_DATA_CHANGED'; END IF;\nIF clock_timestamp()>=to_timestamp(${input.expiresAt}/1000.0) THEN RAISE EXCEPTION 'T19_PACKET_EXPIRED'; END IF;\nPERFORM set_config('faraios.t19_commit_baseline',digest,true); END $t19_commit_candidate$;\nSELECT current_setting('faraios.t19_commit_baseline') AS candidate_committed_baseline;\nCOMMIT;\n`;
 if(rehearsal.sql.split('END $t19_before$;').length!==2||!rehearsal.sql.endsWith('ROLLBACK;'))reject();
 const sql=`-- Runtime commit candidate ${nonce}; rehearsal evidence ${rehearsalEvidenceSha256}.\n`+rehearsal.sql.replace("SET LOCAL search_path=pg_catalog;","SET LOCAL search_path=pg_catalog;\nSET LOCAL standard_conforming_strings=on;").replace('END $t19_before$;',captureBefore+' END $t19_before$;').slice(0,-'ROLLBACK;'.length)+ending;
 const postCommitSQL=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout='60s';\nSET LOCAL search_path=pg_catalog;\nSET LOCAL standard_conforming_strings=on;\n${contract}\nDO $t19_fresh$ ${nativeSnapshotSQL}\nPERFORM set_config('faraios.t19_fresh_baseline',digest,true); END $t19_fresh$;\nSELECT current_setting('faraios.t19_fresh_baseline') AS fresh_committed_baseline;\nCOMMIT;\n`;
 return Object.freeze({version:1,purpose:'review-only-runtime-commit-candidate',projectRef:input.projectRef,stage:'runtime',nonce,sourceSha256:rehearsal.sourceSha256,baselineSha256:input.baselineSha256,contractSha256:CONTRACT_SHA256,rehearsalEvidenceSha256,issuedAt:input.issuedAt,expiresAt:input.expiresAt,sqlSha256:sha(sql),postCommitSha256:sha(postCommitSQL),executionAuthorized:false,activationAuthorized:false,sql,postCommitSQL});
}
