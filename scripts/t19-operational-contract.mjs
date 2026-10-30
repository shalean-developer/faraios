// Complete private projection plus the four public API wrappers; read-only.
import {runtimeContractSQL} from './t19-runtime-contract.mjs';
const wrappers=`(SELECT coalesce(jsonb_agg(jsonb_build_array(p.proname,pg_get_function_identity_arguments(p.oid),
 pg_get_userbyid(p.proowner),p.prosecdef,p.proconfig,
 encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
 (SELECT jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),g.rolname,a.privilege_type,a.is_grantable)
 ORDER BY coalesce(r.rolname,'PUBLIC'),g.rolname,a.privilege_type,a.is_grantable)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 LEFT JOIN pg_roles r ON r.oid=a.grantee JOIN pg_roles g ON g.oid=a.grantor))
 ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('t19_accounting_status','t19_enqueue_invoice','t19_disconnect','t19_reconcile'))`;
export const operationalContractSQL=runtimeContractSQL.replace(/ AS contract;$/,
 ` || jsonb_build_object('publicWrappers',${wrappers}) AS contract;`);
