-- Disposable T19-02 privilege and C1 isolation acceptance.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE t19_review_web LOGIN PASSWORD 'fake-review-web-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
INSERT INTO private_t19_custody.connections(connection_id,business_id,environment,provider,organization_id,generation,credential_version,sealed_reference,enabled)
VALUES
('22222222-2222-4222-8222-222222222222','612be091-b1d7-4911-9c3b-143446a9fe27','staging','zoho','synthetic-shalean',1,1,'33333333-3333-4333-8333-333333333333',true),
('88888888-8888-4888-8888-888888888888','99999999-9999-4999-8999-999999999999','staging','zoho','synthetic-bokkie',1,1,'77777777-7777-4777-8777-777777777777',true);
COMMIT;
-- SET SESSION AUTHORIZATION is available only to disposable superuser harness.
SET SESSION AUTHORIZATION t19_hosted_custody;
DO $verify$
DECLARE v uuid;
BEGIN
 SELECT private_t19_custody.current_reference('612be091-b1d7-4911-9c3b-143446a9fe27','22222222-2222-4222-8222-222222222222','staging','synthetic-shalean',1,1) INTO v;
 IF v IS DISTINCT FROM '33333333-3333-4333-8333-333333333333'::uuid THEN RAISE EXCEPTION 'tenant A denied'; END IF;
 SELECT private_t19_custody.current_reference('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1) INTO v;
 IF v IS DISTINCT FROM '77777777-7777-4777-8777-777777777777'::uuid THEN RAISE EXCEPTION 'tenant B denied'; END IF;
 SELECT private_t19_custody.current_reference('99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222','staging','synthetic-shalean',1,1) INTO v;
 IF v IS NOT NULL THEN RAISE EXCEPTION 'foreign business bypass'; END IF;
 SELECT private_t19_custody.current_reference('612be091-b1d7-4911-9c3b-143446a9fe27','22222222-2222-4222-8222-222222222222','staging','synthetic-shalean',2,1) INTO v;
 IF v IS NOT NULL THEN RAISE EXCEPTION 'stale generation bypass'; END IF;
 SELECT private_t19_custody.current_reference('612be091-b1d7-4911-9c3b-143446a9fe27','22222222-2222-4222-8222-222222222222','staging','synthetic-shalean',1,2) INTO v;
 IF v IS NOT NULL THEN RAISE EXCEPTION 'stale credential version bypass'; END IF;
END $verify$;
RESET SESSION AUTHORIZATION;
UPDATE private_t19_custody.connections SET enabled=false WHERE organization_id='synthetic-shalean';
SET SESSION AUTHORIZATION t19_hosted_custody;
DO $verify$
BEGIN
 IF private_t19_custody.current_reference('612be091-b1d7-4911-9c3b-143446a9fe27','22222222-2222-4222-8222-222222222222','staging','synthetic-shalean',1,1) IS NOT NULL
 THEN RAISE EXCEPTION 'disabled connection bypass'; END IF;
END $verify$;
RESET SESSION AUTHORIZATION;
-- Independent second business remains active. Claim/dispatch/hold is atomic and scoped.
SET SESSION AUTHORIZATION t19_hosted_custody;
DO $ops$
DECLARE claimed boolean;
BEGIN
 SELECT private_t19_custody.claim_operation('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',interval '1 minute') INTO claimed;
 IF NOT claimed THEN RAISE EXCEPTION 'claim failed'; END IF;
 IF private_t19_custody.claim_operation('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd',interval '1 minute') THEN RAISE EXCEPTION 'duplicate claim'; END IF;
 IF NOT private_t19_custody.mark_dispatched('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN RAISE EXCEPTION 'dispatch failed'; END IF;
 IF private_t19_custody.mark_dispatched('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN RAISE EXCEPTION 'duplicate dispatch'; END IF;
 IF NOT private_t19_custody.quarantine_operation('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN RAISE EXCEPTION 'quarantine failed'; END IF;
 IF private_t19_custody.claim_operation('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd',interval '1 minute') THEN RAISE EXCEPTION 'quarantine bypass'; END IF;
END $ops$;
RESET SESSION AUTHORIZATION;
\echo T19_02_DURABLE_CLAIM_DISPATCH_QUARANTINE_PASS
\echo T19_02_TWO_BUSINESS_C1_DENIAL_PASS
