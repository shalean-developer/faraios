// Pure packet generation. No connection, credentials, file writes or execution.
import {createHash} from 'node:crypto';
import {catalogSQL} from './t19-operational-rehearsal.mjs';
export const PROJECT='xdmfyrsauvqznkloroxg';
export const PINS=Object.freeze({runtime:'5797da30b84c2a09de30c0b024cb62fe123d6eed610a6ca24867badb7f295f65',oauth:'45a4f0a3bfa8010bcf02ff0a5a28f49d40779fc82855c860ff826a29b981a05a',api:'5939789b9da7d37531394f403a5ca45d1db25609c0fa202b39c5bdd3b2419ba2'}); // ggignore: public SQL SHA256 integrity pins, never credentials.
export const sha=s=>createHash('sha256').update(s).digest('hex');
const check=(yes)=>{if(!yes)throw Error('PROVISIONING_PACKET_REFUSED');};
const hashSQL=s=>`encode(pg_catalog.sha256(pg_catalog.convert_to((${s})::text,'UTF8')),'hex')`;
export const identitySQL=`IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 OR NOT EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND rolcreaterole) OR NOT coalesce((SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()),false) THEN RAISE EXCEPTION 'T19_PROVISIONING_IDENTITY_TLS_REFUSED'; END IF;`;
// Native values are hashed in PostgreSQL, including sequence text. No JS bigint
// conversion, raw financial rows or decrypted Vault material cross the wire.
const snapshot=`DECLARE t record; n bigint; item jsonb; records jsonb:='[]'; catalog jsonb; digest text;
BEGIN
 ${identitySQL}
 IF EXISTS(SELECT FROM vault.secrets) OR NOT EXISTS(SELECT FROM pg_roles WHERE rolname='t19_hosted_custody' AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls) THEN RAISE EXCEPTION 'T19_INACTIVE_PREREQUISITE_FAILED'; END IF;
 ${catalogSQL.replace(/;\s*$/,'').replace('SELECT jsonb_build_object(', 'SELECT jsonb_build_object(').replace(/\)\s*$/,' ) INTO catalog')};
 FOR t IN SELECT n.nspname,c.relname,c.relkind FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','audit','auth','storage','supabase_migrations','private_t19_custody','vault') AND c.relkind IN ('r','p','m','S') ORDER BY n.nspname,c.relname LOOP
  IF t.relkind='S' THEN
   EXECUTE format('SELECT jsonb_build_object(''last_value'',last_value::text,''is_called'',is_called) FROM %I.%I',t.nspname,t.relname) INTO item;
  ELSE
   EXECUTE format('SELECT count(*) FROM %I.%I',t.nspname,t.relname) INTO n;
   IF t.nspname='private_t19_custody' AND n<>0 THEN RAISE EXCEPTION 'T19_CUSTODY_NOT_EMPTY'; END IF;
   IF n>100000 THEN RAISE EXCEPTION 'T19_BASELINE_TABLE_BOUND'; END IF;
   EXECUTE format('SELECT jsonb_build_object(''count'',count(*)::text,''hash'',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(x)::text,''UTF8'')),''hex''),''|'' ORDER BY encode(sha256(convert_to(to_jsonb(x)::text,''UTF8'')),''hex'')),''''),''UTF8'')),''hex'')) FROM %I.%I x',t.nspname,t.relname) INTO item;
  END IF;
  records:=records||jsonb_build_array(jsonb_build_array(t.nspname,t.relname,t.relkind,item));
 END LOOP;
 digest:=${hashSQL("jsonb_build_object('catalog',catalog,'data',records,'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,c.relname,tr.tgname,tr.tgenabled,tr.tgisinternal,pg_get_triggerdef(tr.oid,true)) ORDER BY n.nspname,c.relname,tr.tgname),'[]'::jsonb) FROM pg_trigger tr JOIN pg_class c ON c.oid=tr.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','audit','auth','storage','supabase_migrations','private_t19_custody','vault')))")};`;
export const nativeSnapshotSQL=snapshot;
export function captureSQL(){return `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout='60s';\nSET LOCAL search_path=pg_catalog;\nDO $t19_capture$ ${snapshot}\nPERFORM pg_catalog.set_config('faraios.t19_native_baseline',digest,true); RAISE NOTICE 'T19_NATIVE_BASELINE_SHA256 %',digest; END $t19_capture$;\nSELECT pg_catalog.current_setting('faraios.t19_native_baseline') AS baseline_sha256;\nCOMMIT;\n`;}
export function rehearsalPackage(input,now=Date.now()){
 check(input&&Object.keys(input).sort().join(',')==='baselineSha256,expiresAt,issuedAt,projectRef,sql,stage');
 const {projectRef,stage,sql,baselineSha256,issuedAt,expiresAt}=input;
 check(projectRef===PROJECT&&typeof stage==='string'&&Object.hasOwn(PINS,stage)&&typeof sql==='string'&&sha(sql)===PINS[stage]);
 check(typeof baselineSha256==='string'&&/^[a-f0-9]{64}$/.test(baselineSha256)&&Number.isSafeInteger(now)&&Number.isSafeInteger(issuedAt)&&Number.isSafeInteger(expiresAt)&&issuedAt<=now&&expiresAt>now&&expiresAt-issuedAt>0&&expiresAt-issuedAt<=900000);
 check((sql.match(/^begin;$/gim)||[]).length===1&&(sql.match(/^commit;\s*$/gim)||[]).length===1);
 const before=`DO $t19_before$ ${snapshot}
 IF clock_timestamp()<to_timestamp(${issuedAt}/1000.0) OR clock_timestamp()>=to_timestamp(${expiresAt}/1000.0) THEN RAISE EXCEPTION 'T19_PACKET_EXPIRED'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r')<>${{runtime:3,oauth:8,api:10}[stage]} OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody')<>${{runtime:0,oauth:7,api:9}[stage]} THEN RAISE EXCEPTION 'T19_STAGE_SEQUENCE_REFUSED'; END IF;
 IF digest<>'${baselineSha256}' THEN RAISE EXCEPTION 'T19_BASELINE_CHANGED'; END IF; END $t19_before$;`;
 const expectedTables=stage==='runtime'?8:10,expectedFunctions={runtime:7,oauth:9,api:11}[stage];
 const after=`DO $t19_after$ DECLARE x record; present boolean; BEGIN
 ${identitySQL}
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r')<>${expectedTables} OR
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody' AND pg_get_userbyid(p.proowner)='t19_runtime_owner')<>${expectedFunctions} OR
 (SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls) FROM pg_roles WHERE rolname IN ('t19_runtime_owner','t19_hosted_custody')) IS NOT TRUE OR
 pg_has_role(current_user,'t19_runtime_owner','SET') OR has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE') THEN RAISE EXCEPTION 'T19_STAGE_POSTCONDITION_FAILED'; END IF;
 FOR x IN SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r' LOOP
  IF NOT x.relrowsecurity THEN RAISE EXCEPTION 'T19_STAGE_RLS_FAILED'; END IF;
  EXECUTE format('SELECT EXISTS(SELECT FROM private_t19_custody.%I)',x.relname) INTO present;
  IF present THEN RAISE EXCEPTION 'T19_CUSTODY_NOT_EMPTY'; END IF;
 END LOOP;
 RAISE NOTICE 'T19_${stage.toUpperCase()}_REHEARSAL_POSTCONDITIONS_PASS'; END $t19_after$;`;
 const wrapped=sql.replace(/^begin;$/im,()=>`BEGIN ISOLATION LEVEL SERIALIZABLE;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\nSET LOCAL idle_in_transaction_session_timeout='60s';\nSET LOCAL search_path=pg_catalog;\n${before}\nSET LOCAL faraios.t19_runtime_review='approved-source-test';`).replace(/^commit;\s*$/im,()=>after+'\nROLLBACK;');
 const packet={version:1,purpose:'hosted-operational-rollback-rehearsal-only',projectRef,stage,sourceSha256:PINS[stage],baselineSha256,issuedAt,expiresAt,sqlSha256:sha(wrapped),commitAuthorized:false,sql:wrapped};
 return Object.freeze(packet);
}
