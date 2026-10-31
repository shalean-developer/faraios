# T19 live encryption-key rotation — maintenance coordinator candidate

1 November 2026 (South Africa). T19 remains **In progress**; T20 **Not started**. This is source preparation and isolated testing, not a hosted rotation or permission to activate production.

## Audit and chosen approach

The current staging entrypoint constructs the accounting handler once at startup. The web process caches one key ID; each scheduled worker starts with its own configuration snapshot. Changing `staging.json` while either is running can therefore leave readers/writers on different keys. The current configuration rejects an extra keyring field. Do not edit private keys and assume a restart makes a mixed-key database safe.

Use a coordinated maintenance pause with both keys retained privately until recovery acceptance. Reuse the existing HTTPS store, backend identity, organisation pins and 120-second scoped leases. No new service, TCP database connection, migrations, roles or grants are required by this candidate. The active web app and worker do not import the new modules.

`rewrapStandardCredentials` acquires every selected business lease in sorted order using a separate store instance per business. Before publication it authenticates every original ciphertext and fsyncs an immutable owner-only ciphertext plan. It rechecks caller-provided maintenance confirmation and every lease before proceeding. Only the existing `refresh` RPC publishes a new envelope; no Zoho refresh, revocation, financial API or jobs RPC is called. Metadata/generation/organisation and token material must remain identical.

Two separate HTTPS RPCs are **not one atomic database transaction**. If a response is lost or execution stops between businesses, the database may contain both key IDs. Keep the writers stopped. Recovery reads actual envelopes under newly acquired leases, verifies their material against the journal's original encrypted snapshot, and either completes the same rotation or rewraps every member back under the old key. Never restart a single-key application in a mixed state. Partial publication is an explicit recovery state, not success.

Every result has `resumeAllowed:false` and `configurationSwitchRequired:true`. This candidate does not switch a file, attest that Plesk is stopped, restart anything, or remove a key. Its maintenance callback is an integration contract, **not evidence of actual host quiescence**. A real host adapter must supply current verified facts; a literal `true` is allowed only in isolated tests.

## Required host procedure before a live attempt

1. Prepare a reviewed, bounded private host adapter and exact source hashes. Verify current backend enrolment, both business/organisation bindings and all job/lease/worker states afresh. Record current private configuration metadata without printing credentials. Preserve the held uncertain invoice and every approval/dispatch marker.
2. Pause the existing scheduled worker and stop the accounting web process through Plesk. Verify no earlier worker/accounting process remains. A disabled checkbox or elapsed time alone does not prove this. Allow in-flight operations to finish or use the existing expiry-plus-grace recovery rule; never forcibly release an active holder. Confirm no running/dispatched work is being replayed.
3. Create a new 32-byte random encryption key with a unique key ID **on the protected host only**. Store it and the old configuration in separate owner-only private files; never use command arguments, browser fields, chat, environment dumps or logs for key values. OAuth client secret, refresh tokens, endpoints and backend identity stay the same. Prove private file readback, restrictive permissions, fsync and same-directory atomic rename with compare-before-replace before using a configuration-switch adapter.
4. Use a fresh private journal directory for this exact key pair and complete business set. Re-read connections after leases are held. Back up that current ciphertext and retain both private keys; the already-restored Drive backup remains historical recovery evidence, not a substitute for the current pre-rotation state.
5. Run the coordinator with genuine maintenance checks. If any key, binding, token material, lease, journal, enrolment or configuration check fails, remain stopped. Do not treat a timeout as proof that an update failed. Resume or roll back the same journal after reading actual state.
6. After all envelopes verify under the target key, the still-to-be-prepared host adapter must compare and atomically replace only the key fields in the protected configuration. Read it back in a fresh process. Before restarting, prove every selected record decrypts using that configuration; confirm jobs, held exceptions and all non-key settings are unchanged.
7. Restart the accounting app, verify the new process/configuration and both business connections, then resume the existing schedule. Prove automatic refresh and an idle worker with financial writes blocked. Do not create another invoice just to test encryption-key rotation.
8. Prepare a fresh encrypted off-host backup and separately protected recovery secret for the new key. Verify retrieval/restore. Retain the old key/rollback files privately until acceptance and the owner-agreed retention decision. Any removal is a separate bounded cleanup; no broad deletion.

## Rollback and interruption

Before a new attempt, the immutable plan must have the exact key IDs, sorted business set and original authenticated envelopes. Never substitute an older backup or a journal from another key pair. Keep both private keys available throughout recovery.

While stopped, call the same coordinator with `direction:'rollback'`. It accepts a member only if its current key ID is the old or new key, metadata still matches and decrypted token material equals the original snapshot. It re-encrypts the current equivalent material under the old key and verifies readback. Reconnected, revoked, externally refreshed, changed or unknown-key records require manual investigation; no stale token or binding is overwritten. Only after all members verify may the host configuration be safely switched back and processes restarted. A failing journal append or lost RPC acknowledgement also requires actual-state recovery; do not clear uncertainty.

The plan is exclusively created as mode 0600 in an owner-only canonical Linux directory. Events contain only validated rotation ID, business ID, direction, state and count, with bounded retention. Directory ancestors must be operator-controlled; privileged-host compromise, hostile ancestor renames and complete JavaScript memory erasure are outside these helpers' guarantees. No plaintext key/token is journaled or emitted. A malformed/partial journal is never overwritten automatically.

## Evidence and limitations

Focused tests cover forward/rollback, accepted-write acknowledgement loss, partial publication recovery, journal failure before publication, changed material/generation/status, loss of maintenance confirmation, duplicate scope, file overwrite/link/mode denials and redacted errors. The SQL-backed case runs against the existing actual guarded HTTPS function and verifies both scoped rows, release of leases and denial for a foreign principal. It catches PostgreSQL JSONB property reordering: compare envelope fields by value, not JSON string key order.

`node --test test/t19-standard-rotation.test.js` runs isolated memory/PGlite cases. The existing disposable PostgreSQL 17 CI runner now has a separate `--test-rotation` phase, emits `T19_ROTATION_COORDINATOR_NATIVE_PASS`, and never reads application DB configuration. Native CI evidence must be checked on the exact PR head.

Remaining before live execution: private key-generation/configuration-switch and host-quiescence adapters, their filesystem/interruption tests, operator release/rollback package, exact owner approval where required for shared changes, and actual staged rotation/readback/recovery evidence. No live key has been changed. Source-only rollback is to omit/revert these additions and the bounded native-runner extension; existing runtime and credentials continue unchanged.
