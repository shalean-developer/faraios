-- Read-only source/candidate reconciliation. No keys, financial rows or hashes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object(
 'roleConforms',EXISTS(SELECT FROM pg_roles WHERE rolname='t19_hosted_custody'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole
  AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls
  AND rolconnlimit=-1 AND rolconfig IS NULL AND rolvaliduntil IS NULL),
 'membershipConforms',(
  SELECT count(*)=1 AND coalesce(bool_and(
   pg_get_userbyid(m.roleid)='t19_hosted_custody'
   AND pg_get_userbyid(m.member)='postgres' AND pg_get_userbyid(m.grantor)='supabase_admin' AND m.grantor=10
   AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option),false)
  FROM pg_auth_members m WHERE m.roleid=(SELECT oid FROM pg_roles WHERE rolname='t19_hosted_custody')
    OR m.member=(SELECT oid FROM pg_roles WHERE rolname='t19_hosted_custody')),
 'tableCounts',jsonb_build_object(
  'connections',(SELECT count(*) FROM private_t19_custody.connections),
  'operations',(SELECT count(*) FROM private_t19_custody.operations),
  'prepared_references',(SELECT count(*) FROM private_t19_custody.prepared_references)),
 'runtimeOwnerAbsent',NOT EXISTS(SELECT FROM pg_roles WHERE rolname='t19_runtime_owner'),
 'indexesValidReady',(SELECT count(*)=6 AND coalesce(bool_and(i.indisvalid AND i.indisready),false)
  FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody'),
 'restoreAttempted',false
) AS custody_recovery_readback;
COMMIT;
