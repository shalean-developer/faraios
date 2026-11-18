-- Existing owner boundary and private projections; no new table grants or enrollment.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT faraios_owner_api TO CURRENT_USER;
CREATE FUNCTION faraios_owner_directory.overview_https(p_test_businesses uuid[],p_test_users uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b jsonb;u jsonb;
BEGIN
 -- Reuse the installed per-request owner/session/expiry gate, including revocation.
 PERFORM faraios_owner_directory.read_https('businesses',1,'');
 IF p_test_businesses IS NULL OR p_test_users IS NULL OR cardinality(p_test_businesses)>100 OR cardinality(p_test_users)>100
 OR array_position(p_test_businesses,NULL) IS NOT NULL OR array_position(p_test_users,NULL) IS NOT NULL THEN
 RAISE EXCEPTION 'Invalid overview scope' USING ERRCODE='22023'; END IF;
 WITH facts AS (
 SELECT id,id=ANY(p_test_businesses) AS test,
 CASE WHEN published IS TRUE THEN 'published' WHEN published IS NULL THEN 'unknown' WHEN profile_saved IS TRUE THEN 'draft' WHEN profile_saved IS NULL THEN 'unknown' WHEN service_configured IS TRUE THEN 'in_progress' WHEN service_configured IS FALSE THEN 'not_started' ELSE 'unknown' END AS stage
 FROM faraios_owner_directory.businesses
 ), cohorts AS (SELECT unnest(ARRAY['all','known_test','other']) AS cohort)
 SELECT jsonb_object_agg(cohort,counts) INTO b FROM (
 SELECT cohort,jsonb_build_object('total',count(f.id),'published',count(f.id) FILTER(WHERE stage='published'),'draft',count(f.id) FILTER(WHERE stage='draft'),'in_progress',count(f.id) FILTER(WHERE stage='in_progress'),'not_started',count(f.id) FILTER(WHERE stage='not_started'),'unknown',count(f.id) FILTER(WHERE stage='unknown')) counts
 FROM cohorts LEFT JOIN facts f ON cohort='all' OR (cohort='known_test' AND f.test) OR (cohort='other' AND NOT f.test) GROUP BY cohort
 ) q;
 WITH facts AS (
 SELECT id,id=ANY(p_test_users) AS test,email_verified,business_associations='[]'::jsonb AS no_business FROM faraios_owner_directory.users
 ), cohorts AS (SELECT unnest(ARRAY['all','known_test','other']) AS cohort)
 SELECT jsonb_object_agg(cohort,counts) INTO u FROM (
 SELECT cohort,jsonb_build_object('total',count(f.id),'verified',count(f.id) FILTER(WHERE email_verified IS TRUE),'unverified',count(f.id) FILTER(WHERE email_verified IS FALSE),'no_business',count(f.id) FILTER(WHERE no_business)) counts
 FROM cohorts LEFT JOIN facts f ON cohort='all' OR (cohort='known_test' AND f.test) OR (cohort='other' AND NOT f.test) GROUP BY cohort
 ) q;
 RETURN jsonb_build_object('observed_at',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'businesses',b,'users',u);
END $$;
GRANT CREATE ON SCHEMA faraios_owner_directory TO faraios_owner_api;
ALTER FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) OWNER TO faraios_owner_api;
REVOKE CREATE ON SCHEMA faraios_owner_directory FROM faraios_owner_api;
REVOKE ALL ON FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION faraios_owner_directory.overview_https(uuid[],uuid[]) TO authenticated;
CREATE FUNCTION public.platform_owner_overview_read(p_test_businesses uuid[],p_test_users uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT faraios_owner_directory.overview_https(p_test_businesses,p_test_users) $$;
REVOKE ALL ON FUNCTION public.platform_owner_overview_read(uuid[],uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_owner_overview_read(uuid[],uuid[]) TO authenticated;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
