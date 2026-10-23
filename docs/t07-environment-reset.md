# T07 — reset existing restore project as a held production candidate

## Scope and authority
The owner confirmed wiping/reinitialising faraios-restore-test, then instructed proceeding with recovery verification and the bounded reset procedure. Only project zrlojsvkqipuwkkyfrkn is eligible. Staging xdmfyrsauvqznkloroxg and all existing worktrees remain untouched. No production application deployment, app schema bootstrap, credentials rotation, real payments, messaging, project deletion, paid upgrade or unrelated task is authorised by this operation.

User-selected staging domain: staging.faraios.com, backed by the existing staging project. Production domain candidate: faraios.com. Read-only Plesk evidence shows no Git binding on faraios.com, Node disabled and legacy /httpdocs files. Do not enable this local loopback staging launcher as a production app. Branch, release directory, Node24 entrypoint and TLS controls need separate T07 implementation/verification.

## Recovery preserved
On23October2026 a fresh206155-byte encrypted archive download matched approved SHA256 53672bbedb8de3d6faa5b1e7830558d6dd5b84bfb1d9d40335e2d433725e18f6 and its separately retained checksum. Capture6d6642b010653cc4a83adc3a56b40734 was previously restored/verified in T11; that historical result is retained. No fresh decryption or restore is claimed. The key was never collected. Ciphertext/checksum remain in the existing private Drive recovery folder; prior offline owner custody evidence remains unchanged. Reset does not delete/relabel historical T11 acceptance or claim continuing production recovery readiness.

## Reviewed reset
Source: scripts/t07-reset-restore-candidate.sql. Invoke only through the explicitly zrlo-bound management connection within its migration transaction. Required SET LOCAL timeouts are asserted before writes. The one DO block is atomic; try-advisory and NOWAIT table locks refuse contention. Lock all affected application/Auth tables, copied application migration history and empty Storage tables. Provider-owned Auth schema history and Vault are read/compared, not locked or modified; no-concurrent-admin/provider-maintenance window is required.

The script checks exact15public/2audit table names and reviewed counts, disabled staging accounting rows, empty Vault/Storage and no outbound extensions. It rejects unknown Auth/provider data, outside Auth foreign-key cascades and noninternal Auth triggers. It removes only app-owned policies/triggers/FK/check/defaults, routines and tables using RESTRICT. Unknown outside views/routines/types or dependencies abort atomically. No schema/object CASCADE is used.

Only after application removal does it delete restored sessions/refresh tokens/users; normal reviewed managed Auth cascades remove identities/AMR and user-owned Auth material. Managed Auth/Storage schemas and provider migration histories remain. The21copied application migration rows are removed; successful management apply adds its own reset-history entry, so expected final application history is ONE entry, not zero.

A denied, RLS-enabled public.t07_environment_guard marker records production-held and this project ref. Its nonempty public object inventory prevents the old restore importer's empty-destination check. No destructive reset can rerun against the new inventory. This is a held empty business database, not current application schema or production acceptance.

## Validation and limitations
Node24.19.0 local synthetic PGlite harness:9/9 PASS, independently repeated9/9. Includes successful RLS-helper teardown, replay refusal, unknown table/Auth data, Auth count drift, Storage content, outside dependent view, outside Auth FK, noninternal Auth trigger and late-failure rollback. PGlite does not emulate all Supabase permissions or provider configuration.

Initial management request returned invalid/expired request state; fresh prestate unchanged. Non-destructive transaction probe reached its expected exception. First hosted teardown rehearsal refused locking read-only auth.schema_migrations before teardown; full fresh prestate unchanged. Corrected candidate excludes Auth schema history and Vault from locks without privilege escalation.

Revised exact-target hosted forced-rollback rehearsal at c71ec79fb2e0972b745b480430073e148f24c958 reached the final P0001:T07_REHEARSAL_ROLLBACK sentinel. Fresh JSON equality confirmed20table count/digests (17application + Auth/Storage/application histories), three users/identities,59sessions/refresh/AMR rows, sequence state, schema and routine digests. Application history remained21; no failed rehearsal entry persisted.

Independent source/local review conditionally cleared this rehearsal; final result review and committed reset readback remain separate. No hosted CI/GitGuardian PASS for this T07 branch is claimed. Main remains58d30e51da775f9c9a5755de6377aee2e19b5e98 until separately reviewed merge readiness.

## Remaining T07 gates
Committed reset outcome is pending at this document revision. After any apply error/uncertain receipt, read state before considering any retry. Verify held marker, empty business/Auth data, one reset-history entry, unchanged provider histories/Storage/Vault/extensions and unchanged staging baseline.

No claim is made that deleting Auth rows cryptographically revokes old signed JWTs or rotates DB/API/signing credentials. Independent credential/session boundaries remain a separate owner-operated private gate before future production use. Existing restore launcher on3103 must not be repointed to production; old import tooling remains refused by nonempty marker and catalog guard. New backup/recovery destination/cadence are not selected here.

Staging live-key refusal/outbound policy, Auth safeguards, Plesk Git staging target/TLS/runtime/deployment evidence, exact-head hosted CI/security, merge readiness and canonical tracker acceptance remain open. T07 stays In progress; do not start T04/T19 or financial/portal implementation.
