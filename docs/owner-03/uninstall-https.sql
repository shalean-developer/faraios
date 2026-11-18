-- First disable application transport and commit disable-https.sql.
BEGIN;
SET LOCAL lock_timeout='2s';
GRANT faraios_owner_api TO CURRENT_USER;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM faraios_owner_directory.owner_access WHERE enabled)
 OR has_function_privilege('authenticated','public.platform_owner_directory_read(text,integer,text)','EXECUTE')
 OR has_function_privilege('authenticated','faraios_owner_directory.read_https(text,integer,text)','EXECUTE')
 OR COALESCE(has_function_privilege('authenticated',to_regprocedure('public.platform_owner_directory_read(text,integer,text,text)'),'EXECUTE'),false)
 OR COALESCE(has_function_privilege('authenticated',to_regprocedure('faraios_owner_directory.read_https(text,integer,text,text)'),'EXECUTE'),false)
 THEN RAISE EXCEPTION 'Disable HTTPS gateway first'; END IF;
END $$;
DROP FUNCTION IF EXISTS public.platform_owner_directory_read(text,integer,text,text) RESTRICT;
DROP FUNCTION IF EXISTS faraios_owner_directory.read_https(text,integer,text,text) RESTRICT;
DROP FUNCTION public.platform_owner_directory_read(text,integer,text) RESTRICT;
DROP FUNCTION faraios_owner_directory.read_https(text,integer,text) RESTRICT;
DROP VIEW faraios_owner_directory.session_gate RESTRICT;
DROP TABLE faraios_owner_directory.owner_access RESTRICT;
REVOKE SELECT ON faraios_owner_directory.businesses,faraios_owner_directory.users FROM faraios_owner_api;
REVOKE USAGE ON SCHEMA faraios_owner_directory,auth FROM faraios_owner_api;
REVOKE USAGE ON SCHEMA faraios_owner_directory FROM authenticated;
DROP ROLE faraios_owner_api;
COMMIT;
-- Base projection removal, if desired, is separate and follows original rollback.
