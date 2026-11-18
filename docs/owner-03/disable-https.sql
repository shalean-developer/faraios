-- Commit containment before attempting dependency-sensitive removal.
BEGIN;
SET LOCAL lock_timeout='2s';
GRANT faraios_owner_api TO CURRENT_USER;
UPDATE faraios_owner_directory.owner_access SET enabled=false;
REVOKE EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
DO $$ BEGIN
 IF to_regprocedure('public.platform_owner_overview_read(uuid[],uuid[])') IS NOT NULL THEN
  REVOKE EXECUTE ON FUNCTION public.platform_owner_overview_read(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
  REVOKE EXECUTE ON FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
 END IF;
 IF to_regprocedure('public.platform_owner_directory_read(text,integer,text,text)') IS NOT NULL THEN
  REVOKE EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
  REVOKE EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
 END IF;
END $$;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
