-- SEC-02 disposable-only transactional evidence consumption (not a hosted migration).
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_database() <> 'faraios_t19_test' OR current_user <> 't19_fixture'
 OR current_setting('faraios.sec02',true) IS DISTINCT FROM 'synthetic'
 THEN RAISE EXCEPTION 'disposable-only context required'; END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE t19_evidence_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE t19_evidence_consumer LOGIN PASSWORD 'fake-consumer-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE t19_invoice_worker LOGIN PASSWORD 'fake-worker-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE t19_app_worker LOGIN PASSWORD 'fake-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE SCHEMA evidence_guard AUTHORIZATION t19_evidence_owner;
REVOKE ALL ON SCHEMA evidence_guard FROM PUBLIC;
CREATE TABLE evidence_guard.publication_keys (
 key_id text PRIMARY KEY,
 secret text NOT NULL
);
INSERT INTO evidence_guard.publication_keys(key_id,secret)
 VALUES('test-key','synthetic-verifier-key-keep-out-of-real-systems');
REVOKE ALL ON evidence_guard.publication_keys FROM PUBLIC;
CREATE TABLE evidence_guard.receipts (
 signer_fingerprint text NOT NULL, purpose text NOT NULL,
 nonce text NOT NULL, operation_id text NOT NULL,
 c1_key text NOT NULL, lease text NOT NULL,
 consumed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (signer_fingerprint,purpose,nonce)
);
CREATE TABLE evidence_guard.operations (
 operation_id text PRIMARY KEY, c1_key text NOT NULL,
 lease text NOT NULL, state text NOT NULL DEFAULT 'dispatched'
 CHECK(state IN ('dispatched','verified','recovery_required'))
);
CREATE FUNCTION evidence_guard.consume_verified(
 fingerprint text,purpose text,nonce text,operation_id text,c1_key text,lease text,proof text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE current_op evidence_guard.operations%ROWTYPE;
DECLARE expected_proof text;
BEGIN
 IF session_user <> 't19_evidence_consumer' THEN RAISE EXCEPTION 'restricted consumer only' USING ERRCODE='42501'; END IF;
 IF proof IS NULL OR length(proof)<>64 OR fingerprint IS NULL OR length(fingerprint)<16 OR purpose NOT IN ('provider_result','sealed_reference')
    OR nonce IS NULL OR length(nonce)<1 OR operation_id IS NULL OR c1_key IS NULL OR lease IS NULL
 THEN RETURN false; END IF;
 SELECT encode(public.hmac(convert_to(
   array_to_string(ARRAY[fingerprint,purpose,nonce,operation_id,c1_key,lease], E'\\x1f'),'UTF8'),
   convert_to(secret,'UTF8'),'sha256'),'hex') INTO expected_proof
 FROM evidence_guard.publication_keys WHERE key_id='test-key';
 IF expected_proof IS NULL OR proof IS DISTINCT FROM expected_proof THEN
   RAISE EXCEPTION 'unauthenticated publication' USING ERRCODE='42501';
 END IF;
 SELECT * INTO current_op FROM evidence_guard.operations
  WHERE operations.operation_id=consume_verified.operation_id FOR UPDATE;
 IF NOT FOUND OR current_op.c1_key<>consume_verified.c1_key OR current_op.lease<>consume_verified.lease
  OR current_op.state<>'dispatched' THEN RETURN false; END IF;
 INSERT INTO evidence_guard.receipts(signer_fingerprint,purpose,nonce,operation_id,c1_key,lease)
 VALUES(fingerprint,purpose,nonce,operation_id,c1_key,lease)
 ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE evidence_guard.operations SET state='verified' WHERE operations.operation_id=consume_verified.operation_id
  AND state='dispatched';
 IF NOT FOUND THEN RAISE EXCEPTION 'evidence transition fence failed' USING ERRCODE='40001'; END IF;
 RETURN true;
END $$;
ALTER TABLE evidence_guard.publication_keys OWNER TO t19_evidence_owner;
ALTER TABLE evidence_guard.receipts OWNER TO t19_evidence_owner;
ALTER TABLE evidence_guard.operations OWNER TO t19_evidence_owner;
ALTER FUNCTION evidence_guard.consume_verified(text,text,text,text,text,text,text) OWNER TO t19_evidence_owner;
REVOKE ALL ON ALL TABLES IN SCHEMA evidence_guard FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA evidence_guard FROM PUBLIC;
GRANT USAGE ON SCHEMA evidence_guard TO t19_evidence_consumer;
GRANT EXECUTE ON FUNCTION evidence_guard.consume_verified(text,text,text,text,text,text,text) TO t19_evidence_consumer;
INSERT INTO evidence_guard.operations(operation_id,c1_key,lease)
 VALUES('op-one','synthetic-seven-field-binding','lease-one');
COMMIT;
-- Caller must verify cryptographic signature BEFORE calling restricted RPC.
-- Actual machine authentication, provider origin and durable service integration unimplemented.
