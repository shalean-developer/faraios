-- T19-02 staging CANDIDATE. REVIEW ONLY: do not deploy without approval.
-- Test with disposable PostgreSQL fixture. No secrets/real connections.
BEGIN;
DO $review_guard$ BEGIN
  IF current_database() <> 'faraios_t19_review_test' OR current_user <> 'postgres'
  THEN RAISE EXCEPTION 'disposable review database only'; END IF;
END $review_guard$;
CREATE ROLE t19_hosted_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE t19_hosted_custody NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA private_t19_custody AUTHORIZATION t19_hosted_owner;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC;
CREATE TABLE private_t19_custody.connections (
  connection_id uuid PRIMARY KEY, business_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment='staging'),
  provider text NOT NULL CHECK(provider='zoho'),
  organization_id text NOT NULL, generation integer NOT NULL CHECK(generation>0),
  credential_version integer NOT NULL CHECK(credential_version>0),
  sealed_reference uuid, enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE private_t19_custody.operations (
  operation_id uuid PRIMARY KEY, connection_id uuid NOT NULL REFERENCES private_t19_custody.connections(connection_id),
  generation integer NOT NULL, credential_version integer NOT NULL,
  lease_id uuid NOT NULL, lease_expires_at timestamptz NOT NULL,
  phase text NOT NULL CHECK(phase IN ('claimed','dispatched','prepared','published','recovery_required','fenced'))
);
CREATE UNIQUE INDEX custody_one_active_op ON private_t19_custody.operations(connection_id)
  WHERE phase IN ('claimed','dispatched','prepared','recovery_required');
CREATE FUNCTION private_t19_custody.current_reference(
  p_business uuid,p_connection uuid,p_environment text,p_organization text,p_generation integer,p_version integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE result uuid;
BEGIN
 IF session_user <> 't19_hosted_custody' THEN
   RAISE EXCEPTION 'restricted custody identity required' USING ERRCODE='42501';
 END IF;
 SELECT sealed_reference INTO result FROM private_t19_custody.connections
 WHERE connection_id=p_connection AND business_id=p_business AND environment=p_environment
 AND organization_id=p_organization AND generation=p_generation
 AND credential_version=p_version AND enabled;
 RETURN result;
END $function$;
ALTER TABLE private_t19_custody.connections OWNER TO t19_hosted_owner;
ALTER TABLE private_t19_custody.operations OWNER TO t19_hosted_owner;
ALTER FUNCTION private_t19_custody.current_reference(uuid,uuid,text,text,integer,integer) OWNER TO t19_hosted_owner;
REVOKE ALL ON ALL TABLES IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC;
GRANT USAGE ON SCHEMA private_t19_custody TO t19_hosted_custody;
GRANT EXECUTE ON FUNCTION private_t19_custody.current_reference(uuid,uuid,text,text,integer,integer) TO t19_hosted_custody;
COMMIT;
-- IMPORTANT: role NOLOGIN deliberately prevents activation; identity provisioning separate.
-- No vault grants, keys, service credentials or hosted execution included.
