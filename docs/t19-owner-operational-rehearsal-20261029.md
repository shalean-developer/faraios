# T19 owner-host synthetic operational SQL rehearsal

This separate harness is source preparation for step 3. It is not hosted custody provisioning, checkpoint recovery, accounting activation or T19 acceptance. T20 is excluded.

The accepted bootstrap and restore source bundles, receipts and journals remain unchanged. `t19-operational-rehearsal-host.mjs` requires the accepted bootstrap digest and reuses its pinned images, resource limits, internal networks, image-file audit, declared/attached network checks, Auth indexes, Storage 0073 boundary, managed catalogue, API controls and exact cleanup. It neither imports a checkpoint reader nor accepts archive, recovery key, OAuth credential or hosted database targets. The only external data input is fresh read-only staging catalogue metadata.

## Authority and execution order

`--prepare EXPECTED JOURNAL` verifies root-only private paths, pinned Node/Docker, the cached image lineage, default local Unix daemon, host resources and the original 13 exited containers plus network/volume inventory. It writes an unsigned, 15-minute receipt binding those inputs, the host boot/daemon, source bundle and exact journal. It creates no Docker resources.

`--run EXPECTED JOURNAL APPROVAL` requires a fresh Ed25519 owner signature for `t19-owner-synthetic-operational-sql-v1`. Bootstrap/restore approvals cannot authorize it. The receipt file must still match, and the exact nonce is consumed durably before the intent and first mutation. Existing records use exclusive writes; do not retry a consumed receipt or delete records. A changed bundle, baseline, daemon, metadata or journal requires a newly prepared and signed receipt.

The candidate passes the accepted 12 synthetic bootstrap phases before proceeding. Auth and Storage containers are then stopped and removed. The PostgreSQL candidate receives only reviewed repository foundation SQL and three synthetic Auth users, two businesses and five memberships. Auth/Vault remain the actual pinned image implementations. No secret, credential, machine registration, connection or invoice job is provisioned.

Each exact runtime, OAuth and API SQL file is checked against `test-support/t19-operational-sql-pins.json`, in that order. Each is exercised as:

1. Inject a fixed SQLSTATE 55000 abort immediately before COMMIT. A new read-only session must observe the complete prior schema/ACL/role/data/sequence fingerprint.
2. Execute the unchanged reviewed SQL and confirm protected public/audit/Auth/Storage/Vault rows and sequence state are unchanged.
3. Repeat the unchanged SQL, require the expected 55000 collision rejection, and confirm no committed state changed.
4. Confirm temporary runtime-owner SET, private CREATE and Auth schema USAGE are absent.

The final checks require ten empty custody tables with RLS, eleven runtime-owned private functions, both custody roles remaining NOLOGIN with no administrative flags, a permitted synthetic manager request, foreign-business/staff denials, and direct private-table/runtime/OAuth/revocation denials for anon/authenticated/service_role. A privileged fixture handoff checks the custody role's empty machine lookup and denies direct custody/Vault reads. This is **not** proof of password/TLS-authenticated custody login or a real machine identity. Managed service_role Vault capabilities are not silently revoked or claimed absent.

Finally the harness stops/removes only its bound nonce-owned resources and compares the full container/network/volume inventory with the signed baseline. Timeout, output overflow, signal, other uncertain transport outcome or failed cleanup produces QUARANTINE; no broad prune or forced deletion is available. A broken SQL input pipe can retain a bounded nonzero SQLSTATE result, but never yields successful zero-exit evidence.

## Evidence and limitations

A passing owner run must report `SYNTHETIC_OPERATIONAL_SQL_PASS`, all sixteen phase records, all three exact SQL stage records, final boundary evidence and verified cleanup. The private journal must be independently checked before accepting owner-host compatibility. The source tests exercise approval tampering, scope/lifetime/binding refusal, ordering, failure/cleanup classification, EPIPE/timeout handling, SQLSTATE checks and the full SQL adapter in an embedded managed-role model. Embedded tests do not replace the signed pinned-image run. A separate disposable native PG17 CI mode also exercises this SQL adapter against synthetic provider substitutes; it does not claim actual image compatibility. Existing native whole-stage proof remains separate.

Still pending after this rehearsal: private service host qualification, authenticated session-pooler custody login and transport, exact hosted before-state and installation approval, bounded role/credential provisioning, service/machine configuration, recovery of nonempty operational custody, actual API/DB/machine boundary tests, both TEST connections, real accounting scenarios, reconciliation and owner UAT. No current score increase or final T19 acceptance is implied.
