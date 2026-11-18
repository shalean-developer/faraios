-- Feature-only rollback. Restore previous navigation/application files first.
-- Retains OWNER-03/04/05 directory functions, owner enrollment and data.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT faraios_owner_api TO CURRENT_USER;
REVOKE ALL ON FUNCTION public.platform_owner_overview_read(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.platform_owner_overview_read(uuid[],uuid[]) RESTRICT;
DROP FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) RESTRICT;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
