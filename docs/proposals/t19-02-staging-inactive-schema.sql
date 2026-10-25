-- T19-02 STAGING MIGRATION PROPOSAL ONLY. DO NOT EXECUTE WITHOUT SEPARATE OWNER APPROVAL.
-- Target: FaraiOS faraios-staging (xdmfyrsauvqznkloroxg), PostgreSQL 17.
-- Deliberately additive and INACTIVE: no login credentials, Vault grants, Zoho grants, or worker activation.
-- Requires pre-application validation of active project, exact review SHA, grants, and restore checkpoint.
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'postgres'
   OR current_setting('faraios.t19_02_approved_project_ref', true)
      IS DISTINCT FROM 'xdmfyrsauvqznkloroxg'
 THEN RAISE EXCEPTION 'T19-02 staging approval/project guard not satisfied';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private_t19_custody')
 THEN RAISE EXCEPTION 'custody schema already exists: audit rather than overwrite';
 END IF;
END $guard$;
CREATE ROLE t19_hosted_custody NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
-- Retain schema/table ownership with the migration executor (Supabase-managed postgres).
-- Do NOT assign owner to a new NOLOGIN role: managed postgres lacks SET ROLE to that role.
-- This remains an inactive schema; later SECURITY DEFINER ownership needs separate review.
CREATE SCHEMA private_t19_custody;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC;
CREATE TABLE private_t19_custody.connections (
  connection_id uuid PRIMARY KEY,
  business_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment='staging'),
  provider text NOT NULL CHECK (provider='zoho'),
  organization_id text NOT NULL,
  generation bigint NOT NULL CHECK(generation>0),
  credential_version bigint NOT NULL CHECK(credential_version>0),
  sealed_reference uuid,
  enabled boolean NOT NULL DEFAULT false,
  UNIQUE (business_id,environment,provider,organization_id,connection_id)
);
CREATE TABLE private_t19_custody.operations (
  operation_id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES private_t19_custody.connections(connection_id),
  generation bigint NOT NULL,
  credential_version bigint NOT NULL,
  lease_id uuid NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  phase text NOT NULL CHECK(phase IN ('claimed','dispatched','prepared','published','recovery_required','fenced'))
);
CREATE UNIQUE INDEX t19_one_open_operation ON private_t19_custody.operations(connection_id)
 WHERE phase IN ('claimed','dispatched','prepared','recovery_required');
CREATE TABLE private_t19_custody.prepared_references (
  reference uuid PRIMARY KEY,
  operation_id uuid UNIQUE NOT NULL REFERENCES private_t19_custody.operations(operation_id),
  lease_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES private_t19_custody.connections(connection_id),
  business_id uuid NOT NULL,
  generation bigint NOT NULL,
  credential_version bigint NOT NULL,
  consumed boolean NOT NULL DEFAULT false
);
REVOKE ALL ON ALL TABLES IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA private_t19_custody FROM PUBLIC;
-- NO EXECUTE OR TABLE GRANTS to any runtime identity in this phase.
-- The custody role cannot LOGIN; no grants are given to it yet.
-- Migration-executor owner remains privileged: independent effective-grants review is mandatory.
COMMIT;
-- Approval gate 2 (separate): exact RPC implementation and grants after independent review.
-- Approval gate 3 (separate): encrypted Vault material and authenticated machine identity.
-- No migration history was recorded by creating this text file.
