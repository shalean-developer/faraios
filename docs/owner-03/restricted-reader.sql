-- REVIEW DRAFT ONLY. Not a migration and not applied to any hosted database.
-- Run transactionally in an isolated database first. Do not expose this schema
-- through PostgREST. Provisioning LOGIN/password/TLS is a separate release step.
BEGIN;
CREATE ROLE faraios_owner_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
ALTER ROLE faraios_owner_reader SET default_transaction_read_only=on;
ALTER ROLE faraios_owner_reader SET statement_timeout='3s';
ALTER ROLE faraios_owner_reader SET search_path=pg_catalog;
CREATE SCHEMA faraios_owner_directory;
REVOKE ALL ON SCHEMA faraios_owner_directory FROM PUBLIC, anon, authenticated;

-- Explicitly privileged projections: the view owner reads across businesses, but
-- the reader receives only these derived fields, never access to underlying tables.
-- Do not use security_invoker=true here: that would require raw Auth-table grants.
CREATE VIEW faraios_owner_directory.businesses WITH (security_barrier=true) AS
SELECT b.id, b.created_at AS registered_at, b.name, b.country, b.time_zone,
 CASE WHEN c.business_id IS NULL THEN false
      WHEN jsonb_typeof(c.draft->'items') IS DISTINCT FROM 'array' THEN NULL
      ELSE EXISTS (SELECT 1 FROM jsonb_array_elements(c.draft->'items') item WHERE item->'archived'='false'::jsonb) END AS service_configured,
 EXISTS (SELECT 1 FROM public.business_profiles p WHERE p.business_id=b.id AND p.environment='live') AS profile_saved,
 EXISTS (SELECT 1 FROM public.business_public_pages p WHERE p.business_id=b.id AND p.environment='live') AS published
FROM public.businesses b
LEFT JOIN public.business_service_catalogues c ON c.business_id=b.id AND c.environment='live';

CREATE VIEW faraios_owner_directory.users WITH (security_barrier=true) AS
SELECT u.id, u.created_at AS registered_at, (u.email_confirmed_at IS NOT NULL) AS email_verified,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('business_id',a.business_id,'role',a.role,'active',a.active) ORDER BY a.business_id,a.role)
 FROM (
  SELECT links.business_id, links.role, bool_or(links.active) AS active
  FROM (
   SELECT b.id AS business_id,'owner'::text AS role,true AS active FROM public.businesses b WHERE b.owner_id=u.id
   UNION ALL
   SELECT m.business_id,m.role,m.active FROM public.business_memberships m
   WHERE m.user_id=u.id AND m.environment='live' AND m.role IN ('manager','receptionist','worker')
  ) links GROUP BY links.business_id,links.role ORDER BY links.business_id,links.role LIMIT 101
 ) a),'[]'::jsonb) AS business_associations
FROM auth.users u WHERE u.is_anonymous IS FALSE;

REVOKE ALL ON ALL TABLES IN SCHEMA faraios_owner_directory FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA faraios_owner_directory TO faraios_owner_reader;
GRANT SELECT ON faraios_owner_directory.businesses,faraios_owner_directory.users TO faraios_owner_reader;
-- No raw-table grants, public API grants, write permissions, role memberships or
-- login credentials. Validate inherited PUBLIC privileges against the target DB.
COMMIT;
