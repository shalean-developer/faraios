-- Commit containment before attempting dependency-sensitive removal.
BEGIN;
SET LOCAL lock_timeout='2s';
GRANT faraios_owner_api TO CURRENT_USER;
UPDATE faraios_owner_directory.owner_access SET enabled=false;
REVOKE EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
