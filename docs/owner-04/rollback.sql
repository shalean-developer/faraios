-- Restore the OWNER-03 PHP files before removing the additive filter overload.
BEGIN;
SET LOCAL lock_timeout='2s';
REVOKE EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text,text) FROM authenticated;
DROP FUNCTION public.platform_owner_directory_read(text,integer,text,text);
DROP FUNCTION faraios_owner_directory.read_https(text,integer,text,text);
COMMIT;
-- Original three-argument functions, owner enrollment and business data are retained.
