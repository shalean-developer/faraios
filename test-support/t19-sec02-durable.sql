-- T19 SEC-02 synthetic-only durable publication fencing.
-- This file MUST only run in the disposable CI PostgreSQL database.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'faraios_t19_test' OR current_user <> 't19_fixture'
     OR current_setting('faraios.sec02',true) IS DISTINCT FROM 'synthetic'
  THEN RAISE EXCEPTION 'disposable SEC-02 context required'; END IF;
END $$;
CREATE ROLE t19_durable_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE t19_sealer LOGIN PASSWORD 'fake-sealer-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE SCHEMA custody_durable AUTHORIZATION t19_durable_owner;
REVOKE ALL ON SCHEMA custody_durable FROM PUBLIC;
CREATE TYPE custody_durable.binding AS (
 business_id uuid, environment text, provider text, connection_id uuid,
 generation integer, organization_id text, credential_version integer
);
CREATE TABLE custody_durable.connections (
 connection_id uuid PRIMARY KEY,
 business_id uuid NOT NULL, environment text NOT NULL CHECK (environment='synthetic'),
 provider text NOT NULL CHECK(provider='synthetic'), organization_id text NOT NULL,
 generation integer NOT NULL CHECK(generation>0),
 credential_version integer NOT NULL CHECK(credential_version>0),
 reference uuid NOT NULL, enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE custody_durable.operations (
 operation_id uuid PRIMARY KEY,
 connection_id uuid NOT NULL REFERENCES custody_durable.connections(connection_id),
 generation integer NOT NULL, credential_version integer NOT NULL,
 lease_id uuid NOT NULL, lease_until timestamptz NOT NULL,
 phase text NOT NULL CHECK(phase IN ('claimed','dispatched','published','fenced','recovery_required')),
 next_reference uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE custody_durable.prepared_refs (
 reference uuid PRIMARY KEY, operation_id uuid NOT NULL UNIQUE,
 lease_id uuid NOT NULL, business_id uuid NOT NULL, environment text NOT NULL,
 provider text NOT NULL, connection_id uuid NOT NULL, generation integer NOT NULL,
 organization_id text NOT NULL, credential_version integer NOT NULL,
 consumed boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX one_pending_connection_operation ON custody_durable.operations(connection_id)
 WHERE phase IN ('claimed','dispatched','recovery_required');
REVOKE ALL ON ALL TABLES IN SCHEMA custody_durable FROM PUBLIC;
CREATE FUNCTION custody_durable.match_binding(c custody_durable.connections,b custody_durable.binding)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT b.business_id IS NOT NULL AND b.connection_id IS NOT NULL
  AND b.environment='synthetic' AND b.provider='synthetic'
  AND b.organization_id IS NOT NULL AND b.generation>0 AND b.credential_version>0
  AND ROW(c.business_id,c.environment,c.provider,c.connection_id,c.generation,c.organization_id,c.credential_version)
      = ROW(b.business_id,b.environment,b.provider,b.connection_id,b.generation,b.organization_id,b.credential_version)
 $$;
CREATE FUNCTION custody_durable.claim(b custody_durable.binding, op uuid, lease uuid, ttl interval)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  IF op IS NULL OR lease IS NULL OR ttl IS NULL OR ttl<=interval '0 seconds' OR ttl>interval '5 minutes'
    THEN RETURN false; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  -- Never automatically reclaim an already dispatched operation.
  IF EXISTS(SELECT 1 FROM custody_durable.operations o WHERE o.connection_id=c.connection_id
       AND o.phase IN ('claimed','dispatched','recovery_required')) THEN RETURN false; END IF;
  INSERT INTO custody_durable.operations(operation_id,connection_id,generation,credential_version,lease_id,lease_until,phase)
   VALUES(op,c.connection_id,c.generation,c.credential_version,lease,clock_timestamp()+ttl,'claimed');
  RETURN true;
 END $$;
CREATE FUNCTION custody_durable.dispatch(b custody_durable.binding, op uuid, lease uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  UPDATE custody_durable.operations SET phase='dispatched'
   WHERE operation_id=op AND connection_id=c.connection_id AND generation=c.generation
    AND credential_version=c.credential_version AND lease_id=lease AND phase='claimed'
    AND lease_until>clock_timestamp();
  RETURN FOUND;
 END $$;
CREATE FUNCTION custody_durable.prepare(b custody_durable.binding, op uuid, lease uuid, sealed_ref uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_sealer' THEN RAISE EXCEPTION 'sealer identity required' USING ERRCODE='42501'; END IF;
  IF sealed_ref IS NULL THEN RETURN false; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM custody_durable.operations
     WHERE operation_id=op AND connection_id=c.connection_id AND lease_id=lease
       AND phase='dispatched' AND generation=c.generation AND credential_version=c.credential_version
       AND lease_until>clock_timestamp()) THEN RETURN false; END IF;
  INSERT INTO custody_durable.prepared_refs
    (reference,operation_id,lease_id,business_id,environment,provider,connection_id,generation,organization_id,credential_version)
  VALUES(sealed_ref,op,lease,(b).business_id,(b).environment,(b).provider,(b).connection_id,(b).generation,(b).organization_id,(b).credential_version+1);
  RETURN true;
 END $$;
CREATE FUNCTION custody_durable.publish(b custody_durable.binding, op uuid, lease uuid, sealed_ref uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  IF sealed_ref IS NULL THEN RETURN false; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  -- Validate BOTH preconditions under the connection row lock before mutating.
  -- If either fails, return without consuming a reference or changing operation state.
  IF NOT EXISTS (
     SELECT 1 FROM custody_durable.operations
     WHERE operation_id=op AND connection_id=c.connection_id
       AND generation=c.generation AND credential_version=c.credential_version
       AND lease_id=lease AND phase='dispatched' AND lease_until>clock_timestamp()
  ) OR NOT EXISTS (
     SELECT 1 FROM custody_durable.prepared_refs
     WHERE reference=sealed_ref AND operation_id=op AND lease_id=lease
       AND business_id=(b).business_id AND environment=(b).environment
       AND provider=(b).provider AND connection_id=(b).connection_id
       AND generation=(b).generation AND organization_id=(b).organization_id
       AND credential_version=(b).credential_version+1 AND NOT consumed
  ) THEN RETURN false; END IF;
  UPDATE custody_durable.operations SET phase='published',next_reference=sealed_ref
   WHERE operation_id=op AND connection_id=c.connection_id AND generation=c.generation
     AND credential_version=c.credential_version AND lease_id=lease AND phase='dispatched'
     AND lease_until>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'publication operation fence changed' USING ERRCODE='40001'; END IF;
  UPDATE custody_durable.prepared_refs SET consumed=true
   WHERE reference=sealed_ref AND operation_id=op AND lease_id=lease
     AND business_id=(b).business_id AND environment=(b).environment
     AND provider=(b).provider AND connection_id=(b).connection_id
     AND generation=(b).generation AND organization_id=(b).organization_id
     AND credential_version=(b).credential_version+1 AND NOT consumed;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication reference fence changed' USING ERRCODE='40001'; END IF;
  UPDATE custody_durable.connections SET credential_version=credential_version+1,reference=sealed_ref
   WHERE connection_id=c.connection_id;
  RETURN true;
 END $$;
CREATE FUNCTION custody_durable.disconnect(b custody_durable.binding)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  UPDATE custody_durable.operations SET phase=CASE WHEN phase='dispatched' THEN 'recovery_required' ELSE 'fenced' END
   WHERE connection_id=c.connection_id AND phase IN ('claimed','dispatched');
  UPDATE custody_durable.connections SET enabled=false,generation=generation+1
   WHERE connection_id=c.connection_id;
  RETURN true;
 END $$;
CREATE FUNCTION custody_durable.recover(b custody_durable.binding, op uuid, lease uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id FOR UPDATE;
  IF NOT FOUND OR NOT custody_durable.match_binding(c,b) THEN RETURN false; END IF;
  UPDATE custody_durable.operations SET phase=CASE WHEN phase='dispatched' THEN 'recovery_required' ELSE 'fenced' END
   WHERE operation_id=op AND connection_id=c.connection_id AND lease_id=lease
     AND phase IN ('claimed','dispatched') AND lease_until<=clock_timestamp();
  RETURN FOUND;
 END $$;
-- Trusted, scoped metadata read: never grant direct table SELECT to custody login.
CREATE FUNCTION custody_durable.current_reference(b custody_durable.binding)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $
 DECLARE c custody_durable.connections%ROWTYPE;
 BEGIN
  IF session_user <> 't19_custody' THEN RAISE EXCEPTION 'custody identity required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM custody_durable.connections WHERE connection_id=(b).connection_id;
  IF NOT FOUND OR NOT c.enabled OR NOT custody_durable.match_binding(c,b) THEN RETURN NULL; END IF;
  RETURN c.reference;
 END $;
-- The function owner is a dedicated NOLOGIN non-superuser; it owns only this fixture schema.
ALTER TABLE custody_durable.connections OWNER TO t19_durable_owner;
ALTER TABLE custody_durable.operations OWNER TO t19_durable_owner;
ALTER TABLE custody_durable.prepared_refs OWNER TO t19_durable_owner;
ALTER TYPE custody_durable.binding OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.match_binding(custody_durable.connections,custody_durable.binding) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.current_reference(custody_durable.binding) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.claim(custody_durable.binding,uuid,uuid,interval) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.dispatch(custody_durable.binding,uuid,uuid) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.prepare(custody_durable.binding,uuid,uuid,uuid) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.publish(custody_durable.binding,uuid,uuid,uuid) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.disconnect(custody_durable.binding) OWNER TO t19_durable_owner;
ALTER FUNCTION custody_durable.recover(custody_durable.binding,uuid,uuid) OWNER TO t19_durable_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA custody_durable FROM PUBLIC;
GRANT USAGE ON SCHEMA custody_durable TO t19_custody,t19_sealer;
GRANT USAGE ON TYPE custody_durable.binding TO t19_sealer;
GRANT USAGE ON TYPE custody_durable.binding TO t19_custody;
GRANT EXECUTE ON FUNCTION custody_durable.current_reference(custody_durable.binding),
 custody_durable.claim(custody_durable.binding,uuid,uuid,interval),
 custody_durable.dispatch(custody_durable.binding,uuid,uuid),
 custody_durable.publish(custody_durable.binding,uuid,uuid,uuid),
 custody_durable.disconnect(custody_durable.binding),
 custody_durable.recover(custody_durable.binding,uuid,uuid) TO t19_custody;
GRANT EXECUTE ON FUNCTION custody_durable.prepare(custody_durable.binding,uuid,uuid,uuid) TO t19_sealer;
INSERT INTO custody_durable.connections(connection_id,business_id,environment,provider,organization_id,generation,credential_version,reference)
 VALUES('22222222-2222-4222-8222-222222222222','612be091-b1d7-4911-9c3b-143446a9fe27','synthetic','synthetic','synthetic-shalean',1,1,'33333333-3333-4333-8333-333333333333');
COMMIT;
-- No credential material stored; sealed_ref is an opaque synthetic reference.
-- Publication provenance, real refresh dispatch boundary and external credential vault
-- remain unimplemented. This fixture is NOT a production migration.