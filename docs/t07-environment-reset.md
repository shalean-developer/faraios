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

## Committed reset outcome — 23 October2026
The exact reviewed reset SQL was applied only to zrlojsvkqipuwkkyfrkn after a final source-byte comparison and unchanged-prestate check. Management apply returned success; reset migration20261023190350 is the sole application history entry. The earlier pending wording above is historical.

Fresh readback:public contains only t07_environment_guard, one row production-held bound to this project; RLS and FORCE RLS enabled; anon/authenticated/service_role SELECT denied. audit schema absent. Users,sessions,refresh tokens,identities and AMR all0. Storage buckets/objects and Vault0. Auth schema history82rows and Storage history74rows retain exact pre-reset digests. Managed refresh sequence remains last82/is_calledtrue; all six extension names match the preflight.

Staging baseline/readback JSON equality passed:27public tables,3Auth users,14bookings,4customers,7quotes,2invoices,50catalogue rows,2recurring schedules; booking and catalogue row digests match. No write was sent to staging.

Independent reviewer performed a fresh read-only exact-target verification confirming protected marker, empty copied Auth data, absent audit schema, empty Storage/Vault,82managed Auth entries and the sole reset migration. Its bounded reset closeout is PASS; complete T07 acceptance remains NO-GO. The other managed-history/sequence/staging assertions are independently assessed recorded before/after evidence, not a second independent execution of those queries.

No project rename or DB/API/signing-credential rotation was performed. faraios-restore-test remains its current display name. No application schema/bootstrap, production deployment, Plesk/DNS change, real payment or message was performed. Earlier T07 notes describing15public tables and3restored users are historical. Current safe state is an empty-business production CANDIDATE on hold.

## Plesk staging Git checkpoint —23October2026
The existing staging.faraios.com site841 under subscription738 was inspected. Its document directory is /staging.faraios.com, separate from production /httpdocs. Created faraios-staging.git using git@github.com:shalean-developer/faraios.git and the already-authorized Default deploy key. Clone completed; selected branch main and latest T06 merge message match main58d30e51. No new GitHub permission/key grant was created. Deployment mode Disabled/No deployment was independently read back in repository settings; no post-deploy action enabled. The generic progress banner said deploying, but the final card/settings explicitly show No deployment; do not claim an application release.

Selected Node24.22.0 on staging only; success notification/readback confirmed. Node remains disabled; current root/docroot /staging.faraios.com and default startupapp.js were not repointed. Runtime origin/secure cookies/proxy controls and live-key/outbound refusal must be implemented/reviewed before app activation. The existing localhost-only staging.mjs is not suitable for direct public hosting and was not exposed or modified.

TLS panel reports staging.faraios.com has no valid certificate. Prepared free Let's Encrypt form for this hostname only, HTTP-01; wildcard/www unchecked. Final Get it free button was NOT submitted because its explicit Terms of Service acceptance requires owner confirmation. No paid certificate, DNS/production/DB/Auth setting, webhook configuration or live integration changed. Certificate issuance and verified HTTPS are the immediate external gate. Plesk runtime documentation reviewed: https://docs.plesk.com/en-US/obsidian/customer-guide/nodejs-support.76652/ and the vendor's CommonJS Passenger startup guidance. Credentials/webhook URLs are deliberately omitted from this record.
