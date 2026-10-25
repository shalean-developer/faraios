-- Synthetic-only SEC-02 state transition regression. Use a disposable session.
\set ON_ERROR_STOP on
SET SESSION AUTHORIZATION t19_custody;
DO $test$
DECLARE
 b custody_durable.binding := ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1);
 bad custody_durable.binding := ROW('99999999-9999-4999-8999-999999999999'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1);
 op uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 lease uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 ref uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 BEGIN
 IF custody_durable.claim(bad,op,lease,interval '1 minute') THEN RAISE EXCEPTION 'foreign claim'; END IF;
 IF NOT custody_durable.claim(b,op,lease,interval '1 minute') THEN RAISE EXCEPTION 'claim'; END IF;
 IF custody_durable.claim(b,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',interval '1 minute') THEN RAISE EXCEPTION 'double claim'; END IF;
 IF custody_durable.publish(b,op,lease,ref) THEN RAISE EXCEPTION 'pre-dispatch publication'; END IF;
 IF custody_durable.dispatch(bad,op,lease) THEN RAISE EXCEPTION 'foreign dispatch'; END IF;
 IF NOT custody_durable.dispatch(b,op,lease) THEN RAISE EXCEPTION 'dispatch'; END IF;
 IF custody_durable.publish(b,op,'00000000-0000-4000-8000-000000000000',ref) THEN RAISE EXCEPTION 'wrong lease'; END IF;
 IF custody_durable.publish(b,op,lease,ref) THEN RAISE EXCEPTION 'unprepared publication'; END IF;
 END $test$;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION t19_sealer;
SELECT custody_durable.prepare(row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid);
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION t19_custody;
DO $test$
DECLARE
 b custody_durable.binding := ROW('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1);
 op uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 lease uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 ref uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 BEGIN
 IF NOT custody_durable.publish(b,op,lease,ref) THEN RAISE EXCEPTION 'publish'; END IF;
 IF custody_durable.publish(b,op,lease,ref) THEN RAISE EXCEPTION 'publication replay'; END IF;
 IF custody_durable.claim(b,'ffffffff-ffff-4fff-8fff-ffffffffffff',lease,interval '1 minute') THEN RAISE EXCEPTION 'stale version'; END IF;
 b.credential_version:=2;
 IF NOT custody_durable.claim(b,'11111111-aaaa-4111-8111-111111111111','22222222-bbbb-4222-8222-222222222222',interval '1 minute') THEN RAISE EXCEPTION 'second claim'; END IF;
 IF NOT custody_durable.dispatch(b,'11111111-aaaa-4111-8111-111111111111','22222222-bbbb-4222-8222-222222222222') THEN RAISE EXCEPTION 'second dispatch'; END IF;
 IF NOT custody_durable.disconnect(b) THEN RAISE EXCEPTION 'disconnect'; END IF;
 IF custody_durable.disconnect(b) THEN RAISE EXCEPTION 'duplicate disconnect'; END IF;
 IF custody_durable.publish(b,'11111111-aaaa-4111-8111-111111111111','22222222-bbbb-4222-8222-222222222222',ref) THEN RAISE EXCEPTION 'late completion'; END IF;
 END $test$;
RESET SESSION AUTHORIZATION;
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM custody_durable.connections WHERE generation=2 AND credential_version=2 AND NOT enabled
 AND reference='cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN RAISE EXCEPTION 'state mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM custody_durable.operations WHERE operation_id='11111111-aaaa-4111-8111-111111111111' AND phase='recovery_required')
 THEN RAISE EXCEPTION 'dispatched uncertainty lost'; END IF;
END $test$;
\echo T19_SEC02_DURABLE_FENCE_PASS
