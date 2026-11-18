-- OWNER-04: additive required-argument overload; existing three-argument callers remain valid.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT faraios_owner_api TO CURRENT_USER;
CREATE FUNCTION faraios_owner_directory.read_https(p_resource text,p_page integer,p_search text,p_stage text)
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
  OR p_stage IS NULL OR p_stage NOT IN ('all','published','draft','in_progress','not_started','unknown') OR (p_resource='users' AND p_stage<>'all')
  OR p_search IS NULL OR octet_length(p_search)>100 OR p_search ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Invalid directory filters' USING ERRCODE='22023';
 END IF;
 pattern:='%'||replace(replace(replace(btrim(p_search),'!','!!'),'%','!%'),'_','!_')||'%';
 IF p_resource='businesses' THEN
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.registered_at DESC,r.id DESC),'[]'::jsonb) INTO result FROM (
   SELECT id,registered_at,name,country,time_zone,service_configured,profile_saved,published
   FROM faraios_owner_directory.businesses WHERE (name ILIKE pattern ESCAPE '!' OR id::text ILIKE pattern ESCAPE '!')
    AND (p_stage='all' OR CASE WHEN published IS TRUE THEN 'published' WHEN published IS NULL THEN 'unknown' WHEN profile_saved IS TRUE THEN 'draft' WHEN profile_saved IS NULL THEN 'unknown' WHEN service_configured IS TRUE THEN 'in_progress' WHEN service_configured IS FALSE THEN 'not_started' ELSE 'unknown' END=p_stage)
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

GRANT CREATE ON SCHEMA faraios_owner_directory TO faraios_owner_api;
ALTER FUNCTION faraios_owner_directory.read_https(text,integer,text,text) OWNER TO faraios_owner_api;
REVOKE CREATE ON SCHEMA faraios_owner_directory FROM faraios_owner_api;
REVOKE ALL ON FUNCTION faraios_owner_directory.read_https(text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text,text) TO authenticated;
CREATE FUNCTION public.platform_owner_directory_read(p_resource text,p_page integer,p_search text,p_stage text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT faraios_owner_directory.read_https(p_resource,p_page,p_search,p_stage) $$;
REVOKE ALL ON FUNCTION public.platform_owner_directory_read(text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text,text) TO authenticated;
REVOKE faraios_owner_api FROM CURRENT_USER;
COMMIT;
