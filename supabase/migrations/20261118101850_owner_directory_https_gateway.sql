-- Draft, NOT installed. Depends on 20261118092848 private projections.
-- No owner is enrolled by this migration. The empty allowlist fails closed.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
CREATE ROLE faraios_owner_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE TABLE faraios_owner_directory.owner_access(user_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT false);
ALTER TABLE faraios_owner_directory.owner_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON faraios_owner_directory.owner_access FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA faraios_owner_directory,auth TO faraios_owner_api;
GRANT SELECT ON faraios_owner_directory.owner_access,faraios_owner_directory.businesses,faraios_owner_directory.users TO faraios_owner_api;
CREATE POLICY executor_reads_allowlist ON faraios_owner_directory.owner_access FOR SELECT TO faraios_owner_api USING (true);
CREATE VIEW faraios_owner_directory.session_gate WITH (security_barrier=true) AS
 SELECT s.id AS session_id,s.user_id,s.not_after,
 (u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS FALSE AND u.deleted_at IS NULL
 AND (u.banned_until IS NULL OR u.banned_until<=now())) AS eligible
 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id;
REVOKE ALL ON faraios_owner_directory.session_gate FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON faraios_owner_directory.session_gate TO faraios_owner_api;

CREATE FUNCTION faraios_owner_directory.read_https(p_resource text,p_page integer,p_search text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog SET lock_timeout='500ms' AS $$
DECLARE claims jsonb:=auth.jwt(); uid uuid:=auth.uid(); sid uuid; pattern text; result jsonb;
BEGIN
 IF claims->>'role' IS DISTINCT FROM 'authenticated' OR uid IS NULL
  OR COALESCE(claims->>'session_id','') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  OR COALESCE(claims->>'exp','') !~ '^[0-9]{1,12}$' THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
 END IF;
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
-- Temporary CREATE permits ownership transfer, then is removed in this transaction.
GRANT CREATE ON SCHEMA faraios_owner_directory TO faraios_owner_api;
ALTER FUNCTION faraios_owner_directory.read_https(text,integer,text) OWNER TO faraios_owner_api;
REVOKE CREATE ON SCHEMA faraios_owner_directory FROM faraios_owner_api;
REVOKE ALL ON FUNCTION faraios_owner_directory.read_https(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA faraios_owner_directory TO authenticated;
GRANT EXECUTE ON FUNCTION faraios_owner_directory.read_https(text,integer,text) TO authenticated;
-- Exposed wrapper is INVOKER. All authorization is inside the private helper,
-- so calling the helper directly cannot skip the same allowlist/session gate.
CREATE FUNCTION public.platform_owner_directory_read(p_resource text,p_page integer,p_search text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $$ SELECT faraios_owner_directory.read_https(p_resource,p_page,p_search) $$;
REVOKE ALL ON FUNCTION public.platform_owner_directory_read(text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_owner_directory_read(text,integer,text) TO authenticated;
COMMIT;
