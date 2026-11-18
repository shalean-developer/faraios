-- Run ONLY after disable-reader.sql committed and no reader sessions remain.
-- Deliberately no CASCADE, DROP OWNED or touching business/auth tables.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='faraios_owner_reader' AND rolcanlogin)
 OR EXISTS (SELECT 1 FROM pg_stat_activity WHERE usename='faraios_owner_reader') THEN
  RAISE EXCEPTION 'Disable reader and close its sessions before uninstall';
 END IF;
 IF has_table_privilege('faraios_owner_reader','faraios_owner_directory.businesses','SELECT')
 OR has_table_privilege('faraios_owner_reader','faraios_owner_directory.users','SELECT') THEN
  RAISE EXCEPTION 'Reader access has not been revoked';
 END IF;
END $guard$;
DROP VIEW faraios_owner_directory.users RESTRICT;
DROP VIEW faraios_owner_directory.businesses RESTRICT;
DROP SCHEMA faraios_owner_directory RESTRICT;
DROP ROLE faraios_owner_reader;
COMMIT;
