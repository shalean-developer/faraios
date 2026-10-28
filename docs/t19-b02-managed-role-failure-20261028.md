# T19 B02 managed-role rehearsal: failure and bounded correction

## Observed hosted result

The owner ran the original exact SQL (SHA-256 `71bee1ed911666a59e696bcae7427092080b6e4d380a87dc76a947e08313d973`) through an authenticated, certificate/hostname-verified staging session pooler. PostgreSQL 17.11 reported a non-superuser `postgres` with CREATEROLE and BYPASSRLS. Both TLS legs were observed as TLS 1.3.

The pre-execution protected snapshot matched the saved baseline. The SQL stopped at the abort probe's `CREATE TABLE t19_b02_qa_schema.abort_probe` with permission denied after `RESET ROLE`. Process exit was 3. The fresh after-session comparison matched the protected before-state across the 21 selected tables and captured catalog metadata. Scratch roles, schema and functions were all zero. This is a failed test with verified bounded cleanup, not a compatibility PASS or operational restore proof. No retry is inferred from cleanup.

## Correction

The original SQL remains byte-identical. New `docs/proposals/t19-b02-managed-role-rollback-v2.sql` switches locally to the existing scratch executor/schema owner for the abort probe and resets the role before the transaction-wide ROLLBACK. It adds observed SQLSTATE notices inside the existing 42501 and 55000 handlers. It adds no grants or persistent objects and does not alter custody, Vault, tenant or financial data.

Corrected SQL SHA-256: `95f601d541bf6c9b8022722178b2afa77ee9b0774909540f528d077315303e36`.

The legacy Node runner and its original SQL identity pins are unchanged. They must not be used to execute v2. The intended route remains one pinned psql session with ON_ERROR_STOP, exact-byte verification, explicit transaction rollback, protected before-state reconfirmation and an independent fresh after-session snapshot, including after failure.

## Validation and remaining acceptance

All 32 affected B02 local tests pass. The new embedded PostgreSQL regression reproduces the original abort's 42501 under a non-superuser session, verifies scratch owner SET authority, observes the corrected 55000 notice and verifies the aborted table is absent. This is bounded embedded-engine evidence, not a complete hosted v2 run. Hosted v2 execution and full current-head CI are pending at preparation time.

Keep the owner's evidence directory private (`/root/t19-b02-djBr95UI`); do not publish financial fingerprints, credentials or raw rows. A new attempt must preserve the original exit/stdout and snapshots, refuse any scratch collision, recheck current protected state and capture both exact SQLSTATE notices plus final zero counts. Concurrent drift is inconclusive and must not be normalized away.

Current-scope operational restore evidence remains outstanding. Do not overwrite the protected restore project, provision operational custody, activate accounting or move T20 payment implementation into this rehearsal. T19 remains in progress.
