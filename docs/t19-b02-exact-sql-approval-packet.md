# T19-B02-QA-SQL-01 — exact synthetic managed-role compatibility test

**Status: SOURCE ONLY — OWNER ACTION-TIME APPROVAL NOT GRANTED.** Target project `xdmfyrsauvqznkloroxg`. New SQL file: `docs/proposals/t19-b02-managed-role-rollback.sql`. No T19 operational SQL, Vault, OAuth, credentials, invoices, runtime or Plesk action.

## Execution contract
- This SQL is meant for **one pinned psql connection**, not independent SQL Editor statements. A connection failure mid-transaction ends the uncommitted transaction; still re-query state. All data changes are confined to scratch roles and schema, concluded by `ROLLBACK`.
- Confirm current project via Supabase control-plane ID outside PostgreSQL. Confirm executor `postgres`, PG17.11, scratch objects absent, and protected business/financial/security baselines outside the transaction.
- Roles: `t19_b02_qa_executor`, `t19_b02_qa_owner` (both NOLOGIN/NOINHERIT); scratch schema: `t19_b02_qa_schema`. Only session's `postgres` gets temporary SET on scratch executor; no preexisting objects altered.
- Expected: unauthorized owner transfer SQLSTATE **42501** captured by a PL/pgSQL subtransaction; temporary grants permit a bounded transfer; grants subsequently revoked; deliberate **55000** exception rolls back its scratch table; final transaction ROLLBACK removes all roles and objects.
- Record command exit, code markers, final leftover counts **0,0,0**; compare before/after protected object and financial row-count/digest baselines. A failed session or missing final result is **UNKNOWN**, requiring read-only catalog comparison before retry.
- **Review caveat:** test uses `RESET ROLE` after `SET LOCAL ROLE` on one SQL session. Managed-role syntax/permission can differ; a failure is NO-GO, not permission to improvise broader privileges. The test proves no Supabase Vault, service identity, machine TLS, Data API or real recovery behavior.

## Separate recovery gate
An isolated archive restore is **not** performed or approved by this SQL. Protected `faraios-restore-test` project `zrlojsvkqipuwkkyfrkn` must NOT be overwritten. A new verified eligible destination plus separate owner authorization and secure backup access are prerequisites. A transaction rollback is not a disaster-recovery proof.

## Stop conditions
Unexpected HTTP exposure, SQLSTATE, managed-role denial, remaining scratch objects, nonzero protected-state difference, unknown restore status, or mismatched Git blob => STOP. Do not apply `database/t19-custody-runtime.sql` until separate exact owner approval.

**Gate B-02 remains partial; T19 In progress; accounting activation NO-GO; T20 Not started.**
