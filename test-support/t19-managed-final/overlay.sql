-- Synthetic-only metadata overlay; never apply to a hosted database.
DO $t19$
DECLARE
 before_function jsonb;
 before_relations jsonb;
 after_relations jsonb;
BEGIN
 IF current_setting('faraios.t19_bootstrap',true) IS DISTINCT FROM 'synthetic-only'
    OR current_user<>'supabase_admin' OR current_database()<>'postgres'
    OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
    OR to_regnamespace('private_t19_custody') IS NOT NULL THEN
  RAISE EXCEPTION 'T19_MANAGED_OVERLAY_CONTEXT';
 END IF;
 IF NOT EXISTS(SELECT FROM pg_proc WHERE oid='pgbouncer.get_auth(text)'::regprocedure
   AND proowner='supabase_admin'::regrole AND prosecdef
   AND proconfig=ARRAY['search_path=""']::text[]
   AND pg_get_functiondef(oid)=$before$CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$function$
$before$) THEN
  RAISE EXCEPTION 'T19_PGBOUNCER_INITIAL_STATE';
 END IF;
 SELECT jsonb_build_array(oid,proowner,proacl,proconfig,prosecdef) INTO before_function
 FROM pg_proc WHERE oid='pgbouncer.get_auth(text)'::regprocedure;
 IF (SELECT count(*) FROM pg_class WHERE oid IN ('storage.buckets'::regclass,'storage.objects'::regclass)
     AND relowner='supabase_storage_admin'::regrole AND relkind='r' AND relrowsecurity AND NOT relforcerowsecurity)<>2
    OR EXISTS(SELECT FROM storage.buckets) OR EXISTS(SELECT FROM storage.objects)
    OR (SELECT count(*) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
        WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass)
        AND a.grantee='supabase_storage_admin'::regrole
        AND a.grantor='supabase_storage_admin'::regrole AND NOT a.is_grantable)<>16 THEN
  RAISE EXCEPTION 'T19_STORAGE_OWNER_INITIAL_STATE';
 END IF;
 SELECT jsonb_agg(jsonb_build_array(c.oid,c.relowner,c.relrowsecurity,c.relforcerowsecurity,
   (SELECT jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
    ORDER BY a.grantor,a.grantee,a.privilege_type) FROM aclexplode(c.relacl) a
    WHERE a.grantee<>'supabase_storage_admin'::regrole)) ORDER BY c.oid)
 INTO before_relations FROM pg_class c WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass);
 EXECUTE $definition$CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $function$
;$definition$;
 GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN
 ON storage.buckets,storage.objects TO supabase_storage_admin WITH GRANT OPTION;
 IF before_function IS DISTINCT FROM (SELECT jsonb_build_array(oid,proowner,proacl,proconfig,prosecdef)
    FROM pg_proc WHERE oid='pgbouncer.get_auth(text)'::regprocedure)
    OR (SELECT pg_get_functiondef('pgbouncer.get_auth(text)'::regprocedure))<>$expected$CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $function$
$expected$ THEN
  RAISE EXCEPTION 'T19_PGBOUNCER_POST_STATE';
 END IF;
 SELECT jsonb_agg(jsonb_build_array(c.oid,c.relowner,c.relrowsecurity,c.relforcerowsecurity,
   (SELECT jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
    ORDER BY a.grantor,a.grantee,a.privilege_type) FROM aclexplode(c.relacl) a
    WHERE a.grantee<>'supabase_storage_admin'::regrole)) ORDER BY c.oid)
 INTO after_relations FROM pg_class c WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass);
 IF before_relations IS DISTINCT FROM after_relations
    OR (SELECT count(*) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
        WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass)
        AND a.grantee='supabase_storage_admin'::regrole
        AND a.grantor='supabase_storage_admin'::regrole AND a.is_grantable)<>16 THEN
  RAISE EXCEPTION 'T19_STORAGE_OWNER_POST_STATE';
 END IF;
END;
$t19$;
