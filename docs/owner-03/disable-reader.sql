-- CONTAINMENT ONLY. Requires explicit installation/rollback authorization.
-- Stop application callers / disable private config first. No business writes.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
ALTER ROLE faraios_owner_reader NOLOGIN;
REVOKE SELECT ON faraios_owner_directory.businesses,faraios_owner_directory.users FROM faraios_owner_reader;
REVOKE USAGE ON SCHEMA faraios_owner_directory FROM faraios_owner_reader;
COMMIT;
-- NOLOGIN does not terminate existing connections. An operator must separately
-- review pg_stat_activity for this exact usename, then terminate only those reader
-- sessions if immediate containment is necessary. Never terminate other roles.
