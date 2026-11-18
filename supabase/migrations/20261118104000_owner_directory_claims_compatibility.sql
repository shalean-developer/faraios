-- Managed Auth schema grants cannot be delegated by hosted postgres.
-- Read the same PostgREST-verified request claims directly; no raw Auth grants.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT faraios_owner_api TO CURRENT_USER;
CREATE OR REPLACE FUNCTION faraios_owner_directory.read_https(p_resource text,p_page integer,p_search text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog SET lock_timeout='500ms' AS $$
DECLARE claims jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb; uid uuid; sid uuid; pattern text; result jsonb;
BEGIN
 IF claims->>'role' IS DISTINCT FROM 'authenticated' OR COALESCE(claims->>'sub','') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  OR COALESCE(claims->>'session_id','') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  OR COALESCE(claims->>'exp','') !~ '^[0-9]{1,12}$' THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
 END IF;
 uid:=(claims->>'sub')::uuid;
 sid:=(claims->>'session_id')::uuid;
 IF (claims->>'exp')::numeric<=extract(epoch FROM now()) OR NOT EXISTS(
  SELECT 1 FROM faraios_owner_directory.owner_access a
  JOIN faraios_owner_directory.session_gate s ON s.user_id=a.user_id
  WHERE a.user_id=uid AND a.enabled AND s.session_id=sid AND s.eligible
   AND (s.not_after IS NULL OR s.not_after>now())
 ) THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501'; END IF;
 IF p_resource IS NULL OR p_resource NOT IN ('businesses','users') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 9999
  OR p_search IS NULL OR octet_length(p_search)>100 OR p_search ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Invalid directory filters' USING ERRCODE='22023';
 END IF;
 pattern:='%'||replace(replace(replace(btrim(p_search),'!','!!'),'%','!%'),'_','!_')||'%';
 IF p_resource='businesses' THEN
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.registered_at DESC,r.id DESC),'[]'::jsonb) INTO result FROM (
   SELECT id,registered_at,name,country,time_zone,service_configured,profile_saved,published
   FROM faraios_owner_directory.businesses WHERE name ILIKE pattern ESCAPE '!' OR id::text ILIKE pattern ESCAPE '!'
   ORDER BY registered_at DESC,id DESC LIMIT 26 OFFSET ((p_page-1)*25)
  ) r;
 ELSE
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.registered_at DESC,r.id DESC),'[]'::jsonb) INTO result FROM (
   SELECT id,registered_at,email_verified,business_associations FROM faraios_owner_directory.users
   WHERE id::text ILIKE pattern ESCAPE '!' ORDER BY registered_at DESC,id DESC LIMIT 26 OFFSET ((p_page-1)*25)
  ) r;
 END IF;
 RETURN jsonb_build_object('rows',result,'observed_at',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'));
END $$;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
