-- Run only after the disposable fixture. Assertions compare ALL custody tables.
\set ON_ERROR_STOP on
-- Use session authorization for actual independent role privileges, not SET ROLE.
SET SESSION AUTHORIZATION t19_custody;
SELECT custody_durable.claim(
 ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',
 '22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding,
 'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,interval '10 seconds');
SELECT custody_durable.dispatch(
 ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',
 '22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding,
 'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid);
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION t19_sealer;
SELECT custody_durable.prepare(
 ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',
 '22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding,
 'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
 'ccccdddd-cccc-4ccc-8ccc-cccccccccccc'::uuid);
RESET SESSION AUTHORIZATION;
-- Expire the dispatched operation AFTER preparation. This used to consume the reference despite returning false.
UPDATE custody_durable.operations SET lease_until=clock_timestamp()-interval '1 second'
 WHERE operation_id='aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
CREATE TEMP TABLE t19_pub_before AS SELECT
 (SELECT md5(coalesce(string_agg(row_to_json(c)::text, '|' ORDER BY connection_id),'')) FROM custody_durable.connections c) AS conn,
 (SELECT md5(coalesce(string_agg(row_to_json(o)::text, '|' ORDER BY operation_id),'')) FROM custody_durable.operations o) AS ops,
 (SELECT md5(coalesce(string_agg(row_to_json(p)::text, '|' ORDER BY reference),'')) FROM custody_durable.prepared_refs p) AS refs;
SET SESSION AUTHORIZATION t19_custody;
DO $test$
DECLARE b custody_durable.binding := ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',
 '22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1);
BEGIN
 IF custody_durable.publish(b,'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'ccccdddd-cccc-4ccc-8ccc-cccccccccccc'::uuid) THEN RAISE EXCEPTION 'expired publication accepted'; END IF;
 IF custody_durable.publish(b,'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'eeeeffff-eeee-4eee-8eee-eeeeeeeeeeee'::uuid) THEN RAISE EXCEPTION 'unprepared publication accepted'; END IF;
 IF custody_durable.publish(b,'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
  'ccccdddd-cccc-4ccc-8ccc-cccccccccccc'::uuid) THEN RAISE EXCEPTION 'wrong lease accepted'; END IF;
END $test$;
RESET SESSION AUTHORIZATION;
DO $test$
DECLARE prior record; actual record;
BEGIN
 SELECT * INTO prior FROM t19_pub_before;
 SELECT (SELECT md5(coalesce(string_agg(row_to_json(c)::text, '|' ORDER BY connection_id),'')) FROM custody_durable.connections c),
        (SELECT md5(coalesce(string_agg(row_to_json(o)::text, '|' ORDER BY operation_id),'')) FROM custody_durable.operations o),
        (SELECT md5(coalesce(string_agg(row_to_json(p)::text, '|' ORDER BY reference),'')) FROM custody_durable.prepared_refs p)
 INTO actual;
 IF ROW(prior.conn,prior.ops,prior.refs) IS DISTINCT FROM ROW(actual.conn,actual.ops,actual.refs)
 THEN RAISE EXCEPTION 'rejected publication changed protected state'; END IF;
END $test$;
\echo T19_SEC02_REJECTED_PUBLICATION_UNCHANGED_PASS
