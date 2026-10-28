-- READ-ONLY DISCOVERY, not installation or operational acceptance.
-- Verify control-plane project xdmfyrsauvqznkloroxg separately BEFORE running.
-- Use only an approved authenticated SQL route; no SQL Editor fallback inferred.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT current_user AS executor, session_user AS session_executor,
       current_setting('server_version') AS server_version,
       current_setting('transaction_read_only') AS read_only;
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb,
       rolreplication, rolbypassrls, rolinherit
FROM pg_roles WHERE rolname IN
 ('t19_hosted_custody','t19_runtime_owner','anon','authenticated','service_role')
ORDER BY rolname;
SELECT n.nspname, pg_get_userbyid(n.nspowner) AS owner,
       c.relname, c.relkind::text, c.relrowsecurity, c.relforcerowsecurity
FROM pg_namespace n LEFT JOIN pg_class c ON c.relnamespace=n.oid
WHERE n.nspname='private_t19_custody' ORDER BY c.relname;
SELECT r.rolname, n.nspname,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS schema_usage,
       has_schema_privilege(r.oid,n.oid,'CREATE') AS schema_create
FROM pg_roles r CROSS JOIN pg_namespace n
WHERE r.rolname IN ('anon','authenticated','service_role','t19_hosted_custody','t19_runtime_owner')
AND n.nspname IN ('private_t19_custody','vault') ORDER BY r.rolname,n.nspname;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,
       p.proacl::text AS explicit_acl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='private_t19_custody' ORDER BY p.proname,p.oid;
SELECT member.rolname AS member, parent.rolname AS granted_role,
       m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member
JOIN pg_roles parent ON parent.oid=m.roleid
WHERE member.rolname LIKE 't19_%' OR parent.rolname LIKE 't19_%'
ORDER BY member.rolname,parent.rolname;
SELECT pg_get_userbyid(d.defaclrole) AS grantor,n.nspname,
       d.defaclobjtype::text,d.defaclacl::text
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
WHERE n.nspname IN ('private_t19_custody','vault') OR d.defaclnamespace=0
ORDER BY grantor,n.nspname,d.defaclobjtype;
SELECT extname,extversion FROM pg_extension
WHERE extname IN ('supabase_vault','pgcrypto','pgsodium') ORDER BY extname;
SELECT rolname AS scratch_role FROM pg_roles
WHERE rolname IN ('t19_b02_qa_executor','t19_b02_qa_owner');
SELECT nspname AS scratch_schema FROM pg_namespace
WHERE nspname='t19_b02_qa_schema';
ROLLBACK;
