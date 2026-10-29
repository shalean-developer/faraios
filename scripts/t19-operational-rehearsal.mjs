// Pure plan and orchestration. External SQL, archives and credentials are not inputs.
import {createPublicKey,verify} from 'node:crypto';
import {canonical,digest,requireTrue,validNonce,PHASES} from './t19-bootstrap-engine.mjs';
export const OPERATIONAL_SCOPE='t19-owner-synthetic-operational-sql-v1';
export const FOUNDATIONS=[...['identity-draft','audit-draft','business-settings-draft','catalogue-draft','customers-draft','bookings-draft','bookings-context-hardening-draft','cleaning-profiles-draft','cleaning-assessments-draft','cleaning-assessment-review-hardening-draft','staff-teams-draft','availability-draft','recurring-draft','quotes-draft','quote-acceptance-actor-draft','invoices-draft','earnings-rules-draft'].map(x=>'database/'+x+'.sql'),'supabase/migrations/20261021223123_business_vat_settings.sql'];
export function validateOperationalApproval(approval,bindings,key,now=Date.now()){
 const r=approval?.receipt;
 requireTrue(r&&canonical(Object.keys(r).sort())===canonical(['scope','version','nonce','issuedAt','expiresAt',...Object.keys(bindings)].sort())&&r.scope===OPERATIONAL_SCOPE&&r.version===1,'APPROVAL_SHAPE');
 validNonce(r.nonce);requireTrue(Object.entries(bindings).every(([k,v])=>r[k]===v),'APPROVAL_BINDING');
 requireTrue(Number.isSafeInteger(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.issuedAt<=now&&r.expiresAt>now&&r.expiresAt>r.issuedAt&&r.expiresAt-r.issuedAt<=900000,'APPROVAL_EXPIRED');
 const pub=createPublicKey(key);requireTrue(pub.asymmetricKeyType==='ed25519','OWNER_KEY_TYPE');
 requireTrue(typeof approval.ownerSignature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(approval.ownerSignature)&&verify(null,Buffer.from(canonical(r)),pub,Buffer.from(approval.ownerSignature,'base64')),'OWNER_SIGNATURE');return r;
}
export function operationalStages(manifest,contents){
 requireTrue(manifest.version===1&&manifest.purpose==='reviewed-operational-sql-sha256'&&canonical(manifest.files.map(f=>f.path))===canonical(['runtime','oauth','api'].map(s=>'database/t19-custody-'+s+'.sql')),'SQL_MANIFEST_SHAPE');
 return manifest.files.map(f=>{
  const sql=contents.get(f.path);requireTrue(typeof sql==='string'&&digest(sql)===f.sha256,'SQL_SOURCE_PIN');
  requireTrue((sql.match(/^begin;$/gim)||[]).length===1&&(sql.match(/^commit;$/gim)||[]).length===1,'SQL_TRANSACTION_SHAPE');
  return {stage:f.path.match(/t19-custody-(runtime|oauth|api)\.sql$/)[1],sha256:f.sha256,sql,
   abortSQL:sql.replace(/^commit;\s*$/im,()=>"DO $$BEGIN RAISE EXCEPTION 'T19_SYNTHETIC_PRECOMMIT_ABORT' USING ERRCODE='55000';END$$;\nCOMMIT;")};
 });
}
export async function runOperationalRehearsal(platform){
 const stages=[];let reason=null,cleanupVerified=false;
 try{
  await platform.preflight();
  for(const phase of [...PHASES,'stopServices','syntheticFoundation','operationalSQL','operationalBoundaries']){
   await platform[phase]();stages.push(phase);await platform.record('operational-phase',{phase,status:'PASS'});
  }
 }catch(e){reason=/^[A-Z0-9_]+$/.test(e.message)?e.message:'OPERATIONAL_REHEARSAL_FAILURE';}
 finally{try{cleanupVerified=await platform.cleanup()===true;}catch{cleanupVerified=false;}}
 const result={status:!cleanupVerified?'QUARANTINE':reason?'FAIL':'SYNTHETIC_OPERATIONAL_SQL_PASS',stages,reason,cleanupVerified,checkpointUsed:false,restoreAttempted:false,hostedOperationalCustodyInstalled:false,authenticatedCustodyLoginVerified:false};
 try{await platform.record('operational-result',result);}catch{result.status='QUARANTINE';result.reason='JOURNAL_FAILURE';}
 return result;
}
export const identityGuard="DO $$BEGIN IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 OR NOT EXISTS(SELECT FROM pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole) THEN RAISE EXCEPTION 'T19_SYNTHETIC_MANAGED_ACTOR_REFUSED';END IF;END$$;\n";
export const reviewSetting="SET faraios.t19_runtime_review='approved-source-test';\n";
export const identifier=s=>'"'+s.replaceAll('"','""')+'"';
// OIDs stay inside the disposable candidate; no cross-cluster/OID equivalence claim.
export const catalogSQL=`SELECT jsonb_build_object(
 'roles',(SELECT jsonb_agg(to_jsonb(x) ORDER BY rolname) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles) x),
 'memberships',(SELECT jsonb_agg(to_jsonb(x) ORDER BY roleid,member,grantor) FROM pg_auth_members x),
 'schemas',(SELECT jsonb_agg(to_jsonb(x) ORDER BY oid) FROM pg_namespace x WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),
 'relations',(SELECT jsonb_agg(jsonb_build_array(c.oid,c.relname,c.relnamespace,c.relkind,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'defaults',(SELECT jsonb_agg(to_jsonb(x) ORDER BY oid) FROM pg_attrdef x),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid,p.proowner,p.proacl,pg_get_functiondef(p.oid)) ORDER BY p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prokind<>'a'),
 'policies',(SELECT jsonb_agg(to_jsonb(x) ORDER BY schemaname,tablename,policyname) FROM pg_policies x),
 'constraints',(SELECT jsonb_agg(to_jsonb(x) ORDER BY oid) FROM pg_constraint x),
 'indexes',(SELECT jsonb_agg(to_jsonb(x) ORDER BY indexrelid) FROM pg_index x),
 'defaultACL',(SELECT jsonb_agg(to_jsonb(x) ORDER BY oid) FROM pg_default_acl x));`;
export const objectsSQL=`SELECT jsonb_build_object(
 'tables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r'),
 'ownedFunctions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody' AND pg_get_userbyid(p.proowner)='t19_runtime_owner'),
 'allRLS',(SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r'),
 'rolesRestricted',(SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls) FROM pg_roles WHERE rolname IN ('t19_runtime_owner','t19_hosted_custody')),
 'canSet',pg_has_role(current_user,'t19_runtime_owner','SET'),
 'canCreate',has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE'),
 'authUsage',has_schema_privilege('t19_runtime_owner','auth','USAGE'),
 'vaultEmpty',(SELECT count(*)=0 FROM vault.secrets));`;
