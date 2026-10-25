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
-- Disposable-only durable claim. Provider egress and credential publication are NOT wired.
CREATE FUNCTION private_t19_custody.claim_operation(
 p_business uuid,p_connection uuid,p_environment text,p_organization text,
 p_generation integer,p_version integer,p_operation uuid,p_lease uuid,p_ttl interval
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $claim$
DECLARE c private_t19_custody.connections%ROWTYPE;
BEGIN
 IF session_user <> 't19_hosted_custody' THEN RAISE EXCEPTION 'restricted custody identity required' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR p_lease IS NULL OR p_ttl IS NULL OR p_ttl<=interval '0 seconds' OR p_ttl>interval '5 minutes' THEN RETURN false; END IF;
 SELECT * INTO c FROM private_t19_custody.connections WHERE connection_id=p_connection FOR UPDATE;
 IF NOT FOUND OR NOT c.enabled OR c.business_id IS DISTINCT FROM p_business
 OR c.environment IS DISTINCT FROM p_environment OR c.organization_id IS DISTINCT FROM p_organization
 OR c.generation IS DISTINCT FROM p_generation OR c.credential_version IS DISTINCT FROM p_version THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM private_t19_custody.operations WHERE connection_id=p_connection
 AND phase IN ('claimed','dispatched','prepared','recovery_required')) THEN RETURN false; END IF;
 INSERT INTO private_t19_custody.operations(operation_id,connection_id,generation,credential_version,lease_id,lease_expires_at,phase)
 VALUES(p_operation,p_connection,p_generation,p_version,p_lease,clock_timestamp()+p_ttl,'claimed');
 RETURN true;
END $claim$;
CREATE FUNCTION private_t19_custody.mark_dispatched(p_operation uuid,p_lease uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $dispatch$
DECLARE c private_t19_custody.connections%ROWTYPE;
BEGIN
 IF session_user <> 't19_hosted_custody' THEN RAISE EXCEPTION 'restricted custody identity required' USING ERRCODE='42501'; END IF;
 SELECT c0.* INTO c FROM private_t19_custody.connections c0 JOIN private_t19_custody.operations o ON o.connection_id=c0.connection_id
 WHERE o.operation_id=p_operation FOR UPDATE OF c0;
 IF NOT FOUND OR NOT c.enabled THEN RETURN false; END IF;
 UPDATE private_t19_custody.operations SET phase='dispatched'
 WHERE operation_id=p_operation AND connection_id=c.connection_id AND lease_id=p_lease
 AND generation=c.generation AND credential_version=c.credential_version
 AND lease_expires_at>clock_timestamp() AND phase='claimed';
 RETURN FOUND;
END $dispatch$;
CREATE FUNCTION private_t19_custody.quarantine_operation(p_operation uuid,p_lease uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $quarantine$
BEGIN
 IF session_user <> 't19_hosted_custody' THEN RAISE EXCEPTION 'restricted custody identity required' USING ERRCODE='42501'; END IF;
 UPDATE private_t19_custody.operations SET phase='recovery_required'
 WHERE operation_id=p_operation AND lease_id=p_lease AND phase='dispatched';
 RETURN FOUND;
END $quarantine$;
ALTER TABLE private_t19_custody.connections OWNER TO t19_hosted_owner;
ALTER TABLE private_t19_custody.operations OWNER TO t19_hosted_owner;
ALTER FUNCTION private_t19_custody.current_reference(uuid,uuid,text,text,integer,integer) OWNER TO t19_hosted_owner;
ALTER FUNCTION private_t19_custody.claim_operation(uuid,uuid,text,text,integer,integer,uuid,uuid,interval) OWNER TO t19_hosted_owner;
ALTER FUNCTION private_t19_custody.mark_dispatched(uuid,uuid) OWNER TO t19_hosted_owner;
ALTER FUNCTION private_t19_custody.quarantine_operation(uuid,uuid) OWNER TO t19_hosted_owner;
REVOKE ALL ON ALL TABLES IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC;
GRANT USAGE ON SCHEMA private_t19_custody TO t19_hosted_custody;
GRANT EXECUTE ON FUNCTION private_t19_custody.current_reference(uuid,uuid,text,text,integer,integer) TO t19_hosted_custody;
GRANT EXECUTE ON FUNCTION private_t19_custody.claim_operation(uuid,uuid,text,text,integer,integer,uuid,uuid,interval), private_t19_custody.mark_dispatched(uuid,uuid), private_t19_custody.quarantine_operation(uuid,uuid) TO t19_hosted_custody;
COMMIT;
-- IMPORTANT: role NOLOGIN deliberately prevents activation; identity provisioning separate.
-- No vault grants, keys, service credentials or hosted execution included.
