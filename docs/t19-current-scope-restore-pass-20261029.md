# T19 current-scope isolated recovery evidence

29 October 2026. **PASS for the bounded owner-host restore rehearsal and post-run evidence check. T19 remains In progress; accounting activation remains NO-GO; T20 remains excluded.**

## Provenance

The owner executed the freshly signed local restore from staging source b9ac811dc146e4830cd647f80374cbc80e9b5a9e (PR #241), reporting CURRENT_SCOPE_RESTORE_PASS followed by CURRENT_SCOPE_RESTORE_EVIDENCE_CHECK_PASS from the reviewed read-only verifier. These are owner-host execution/readback results; CI did not access the protected checkpoint and the assistant did not independently inspect the private host. The signature binds the receipt; subsequent journal integrity relies on the accepted private host-custody assumption and recorded post-run file index digest.

| Binding | SHA256 |
| --- | --- |
| Restore source bundle | a2e123d8cf209226facfe4bbd018453b7424fbe793d693e49f113f7208246b20 |
| Signed receipt | b8eabbda214ffcd8d81331091160cd1ada12b9f837531d6c28078aeb4a6325db |
| Sorted private journal file/hash index | 4a5e29dbe4dba9ee5d4ff783d8d656b86aafd6252115416e09376204597d5561 |

Preserve /root/t19-restore-run-5hEfJeNc unchanged. Never reuse its consumed approval or publish private inputs, rows, SQL, signatures or keys. Historical failures and separate cleanup evidence remain unchanged.

## Verified result and limits

The prepared plan covered 30 application/audit tables, 66 covered tables and one recovered sequence. The authenticated checkpoint was used in a newly qualified isolated local candidate. Managed Auth/Storage schema came from the pinned compatible bootstrap, not managed-schema replay. Services stopped before recovered data replay. Custody was reconstructed from the reviewed empty-state definition; it was not recovered from checkpoint data.

All 19 ordered phases passed: isolation, postgres, bootstrapHelpers, bootstrapDependencies, realtime, authMigrations, authIndexes, storage, managedCatalog, apiControls, stopServices, destinationEmpty, replay, verifyCommitted, sequences, verifyFresh, custody, boundaries and finalVerification.

The post-run verifier checked the pinned source, owner public-key fingerprint/signature, canonical receipt, exact request/expectation bytes, consumed-receipt binding, intent and signed baseline. It checked ordered phases/result, committed data via a fresh connection, sequences, rollback boundary checks and final catalog/data/sequence records. No command-failure/error record was present. Journal bytes and file list remained unchanged during verification.

Cleanup verified the signed original baseline, including all 13 original containers, and removal of candidate resources. No protected hosted restore destination was used. This proves a bounded local logical recovery rehearsal, not an operational RPO/RTO SLA, post-activation recovery or recovered-user API acceptance.

## Remaining order

1. Managed-bootstrap compatibility: accepted separately.
2. Current-scope recovery: this rehearsal and evidence check pass; deliver this record through staging CI. Future nonempty custody requires its own recovery coverage.
3. Restricted operational custody: exact reviewed SQL, identities, private service configuration and grants. **Not installed by this run.**
4. Actual authenticated permitted/denied API, database and machine requests.
5. Both independent TEST connections and eligible invoice/tax fixtures.
6. Real TEST accounting scenarios: sync, duplicates, pagination, refresh, failures, interruption, reconciliation, disconnect and revocation.
7. Totals reconciliation, final evidence and owner UAT.

No overall numerical score is revised from this gate alone; reassess the acceptance register explicitly. This record does not authorize hosted operational changes, Zoho activation, production changes or T20 work.
