# T11 — Recovery evidence and operating handover

## 1. Document control

Record `T11-RECOVERY-20261021`, version 2, 21 October 2026 (Africa/Johannesburg). Delivery owner: Codex; acceptance owner: Farai. Status: **restore/access/audit and owner-operated offline key custody evidenced; final independent opinion and scoped owner acceptance recorded separately with the published candidate and live tracker**. This version records the later USB custody outcome; it does not infer the owner's final acceptance from the earlier instruction to finish. This record supersedes current-state statements in earlier preparation checkpoints without erasing those checkpoints.

## 2. Outcome and decision

The approved one-off FaraiOS staging backup was retrieved, decrypted and restored into an isolated project. Database verification, foundation audit/RLS checks and actual owner/manager/shared-staff application checks passed within the limits below. The owner subsequently verified recovery of the exact 32-byte key from a password-encrypted USB archive and confirmed disconnected, secured custody with an independently recoverable separate password record. This is not production disaster-recovery readiness or an operating backup service. **Mark T11 Done only after the final independent opinion and the owner's separate acceptance of this bounded scope are indexed in the tracker.**

## 3. Exact scope

| Binding | Value |
| --- | --- |
| Source staging | `xdmfyrsauvqznkloroxg` |
| Isolated destination | `faraios-restore-test` / `zrlojsvkqipuwkkyfrkn` |
| Approved organization | `lypbvtudsbxxdcnzbqwc` |
| Capture | `6d6642b010653cc4a83adc3a56b40734` |
| Encrypted archive SHA-256 | `53672bbedb8de3d6faa5b1e7830558d6dd5b84bfb1d9d40335e2d433725e18f6` |
| Executed application package | Owner pulled main `4f444b8c78b17cc713005f17ee7375c6d75a8dde`; published tree `28b59b71758f16488886528c66bdbec836804436` |
| Runtime evidence | Owner supplied pinned Node `24.22.0` startup and verifier commands; no independent running-process SHA attestation |
| Local application | `http://127.0.0.1:3103`, separate restore cookie; normal staging remains on 3101 |

Existing Shalean/Bokkie systems, production, T04 financial choices and T19's Zoho hold are outside this execution. No new cloud resource, database import, business mutation, provider grant or accounting sync is authorized by this document.

## 4. Authority and traceability

The owner approved the one-off protected backup and separate restore project, performed the private capture/restore and requested completion of T11. The tracker defines T11 as “Record sensitive actions; backups and restore rehearsal” with acceptance “Restore tested; access changes traceable”. The approved preparation additionally requires isolated real sign-in/RBAC/audit acceptance, configuration coverage, protected offline key custody, measurements and independent/owner acceptance. None of these requirements is silently waived.

Sources: [blueprint](blueprint.md), [audit and recovery history](audit-and-recovery.md), [isolated restore implementation/history](isolated-restore.md), and [the live tracker, including T11 Evidence](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit#gid=1902110089).

## 5. Verified execution

| Evidence | Result and provenance |
| --- | --- |
| Capture/off-site retrieval | Owner capture passed encryption/local verification/cleanup. Ciphertext and checksum were uploaded to the approved private Drive folder; independent retrieval matched the exact checksum. Owner reported downloaded-archive decryption verification passed. The agent never received the key or plaintext dumps. |
| Real restore | Owner reported `COMMITTED`, with data/catalog/sequence verification all `PASSED`; helper plaintext SQL files `NEVER_WRITTEN`. |
| Actual database structure | Target-only read-only checks before application logins matched the original portable application and managed pins. A fresh 21 October read after acceptance still matched both pins below. |
| Counts and isolation | Fresh target metadata at `2026-10-21T05:44:17.826329Z`: 2 businesses, 5 memberships, 3 Auth users, 186 audit events; zero Storage buckets/objects, Vault secrets, large objects and foreign servers. At `05:45:05.181647Z`: 17 public/audit RLS tables and 0 enabled accounting connections out of 2. Destination is `ACTIVE_HEALTHY`, PostgreSQL 17.11; no `cron.job` relation and no deployed Edge Functions. |
| Database permissions | Direct authenticated-role owner/manager/shared-staff/nonmember assertions passed before app acceptance. Verified own-membership scope, cross-business denials and denied identity/audit writes. This is distinct from password/HTTP testing. |
| Foundation audit | Transactional business-name probe emitted exactly one event with correct old/new records, transaction-local owner subject, database role and transaction ID; identical update emitted none. Explicit rollback and fresh fingerprints proved unchanged businesses/memberships/audit history and sequence. Scope is the existing businesses/memberships audit, not every future operational write. |
| Manager HTTP | Final owner-host Node 24 command/report: **35/35 PASS**, `passed:true`, `cleanup:PASSED`. Bokkie reads allowed; Shalean dashboard/module reads and owner settings denied; restore markers, role, sign-out and invalidated-cookie redirects passed. |
| Shared-staff HTTP | Final owner-host Node 24 command/report: **40/40 PASS**, `passed:true`, `cleanup:PASSED`. Both authorized staff dashboards/roles/scopes passed; office routes denied in both businesses; restore markers, sign-out and invalidated-cookie redirects passed. |
| Owner browser | Owner privately signed in. Agent directly inspected exactly two owner businesses, both selected dashboards and 18 module/settings views: bookings, recurring, calendar, customers, catalogue, staff, quotes, invoices and settings for each business. Correct scoped URLs/headings, restore banner and no nonempty error alerts. Final repeated sign-out and reopening known Shalean dashboard/Bokkie settings URLs returned `/login` / “Welcome back”. Browser cutoff `2026-10-21T05:29:58Z`. This verifies rendering and normal browser-session guards, not HTTP status traces or replay of the old owner cookie. |
| Offline key recovery and custody | Owner reported `USB_KEY_ARCHIVE_CREATED`, then `USB_REOPEN_TEST_PASSED` after fresh USB reconnect/password-record retrieval/archive testing. Agent observed the exact D: archive containing one 32-byte entry marked `Encrypted +`; no key bytes or password were received. After guided extraction to a private PC check folder, owner returned `[USB_KEY_RECOVERY_BYTES_MATCH]` from the reviewed read-only comparison. Following explicit close/eject/unplug/secure-USB and separate independently recoverable password-record instructions, owner returned `OFFLINE_KEY_VERIFIED_AND_SECURED`. This satisfies owner-operated custody for this capture; it is not agent-observed physical storage or an agent-executed Windows test. |

Unchanged portable fingerprints:

- Application: `e73bde7740e11fe985d33c710f0654774a5dc9caa6d2e46af522973340817d03`.
- Managed: `b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`.

## 6. Evidence limits and historical failures

Earlier import attempts rolled back at strict guards; the schema-only diagnostic identified the working-days CHECK parse-tree difference and rolled back. Those failed attempts are not relabeled as successes. The final actual committed restore is separate evidence.

Earlier staff sign-in/module timeouts, a port collision and unavailable local listener were followed by documented session recovery, a supported-runtime restart and complete passing role reports. Their latency root cause is **not established**. During owner inspection a browser-control interruption was recovered from its observed current page. After an initial logout observation the tab later appeared signed in again, cause unknown; logout was repeated with an explicit no-interaction request and the final URL/screenshot agreed on the login page.

One post-restore provider Auth session row remained at the fresh inventory. No tokens were queried. This does not invalidate the tested local logout/route guards, but **universal provider-session cleanup or immediate JWT revocation is not claimed**. Do not perform unnecessary global sign-outs or direct Auth-table deletion. Application logins legitimately change managed Auth rows/sequence state, so the original full data/sequence comparison belongs before those logins and must not be repeated against a now-used destination as though it were untouched.

USB recovery history is retained: Windows 11 Home Single Language and an unencrypted `PATSO 8 (D:)` could not use the proposed BitLocker workflow. The reviewed alternative creates only an AES-256, filename-encrypted `.7z` key archive on that USB; the USB's other files remain unencrypted. Windows' built-in archive opener reported encrypted-archive support unavailable; direct 7-Zip File Manager opening was then used and the owner reported successful fresh reopen/Test. The first key comparison returned `[USB_KEY_RECOVERY_CHECK_FAILED]`; a bounded five-boolean location check showed the original, check folder, USB and archive present, with only the exact extracted-key path absent. After extraction guidance a replacement dialog showed an existing 32-byte destination file. The owner was instructed to cancel rather than overwrite, then returned the comparison match and later physical-custody confirmation. Actual cancellation/no-overwrite behavior was not independently observed. No mismatch label was reported; no agent deletion, overwrite, raw-key USB copy, database import or provider cleanup occurred. Matching file bytes alone does not prove encryption or extraction provenance; the fresh-reopen reports and archive metadata are separate evidence.

## 7. Configuration recovery coverage

This matrix accounts for the components used by the bounded password-only, local rehearsal. “Absent” is a dated inventory observation; it is not a universal exclusion for future captures.

| Component | Coverage and recovery dependency |
| --- | --- |
| Application code/dependencies | GitHub main `4f444b8c…`, `package-lock.json`, Node 24 and SDK 2.118.0. Recover the reviewed revision and use `npm ci --ignore-scripts`. Repository/account/package-registry access is a prerequisite; no offline code mirror is claimed. |
| Public connection metadata | `config/staging.json` and `config/restore-test.json` preserve public project URLs/publishable keys and reviewed destination/archive pins. A new destination needs its own reviewed public key/metadata; never silently repoint staging or reuse a source secret. |
| Schema, application data and migrations | Exact approved archive; real replay and full checks passed. Captured native migration history is restored separately. Existing application constraints/grants/RLS/functions/triggers/default ACLs and managed structural compatibility are covered by the full pins. |
| Managed Auth data | Restored users/password hashes/memberships are covered by database capture and three actual role sign-ins. Destination signing credentials are provider-managed; old project JWTs are not reused. No claim that tokens survive a project move. |
| Auth control-plane configuration | Manually recreated isolated baseline inspected 20 October before import: password login/email confirmation enabled; signup, phone/external/custom providers, manual linking and anonymous sign-ins disabled; no Auth hooks, custom SMTP off and seven security-notification switches off. Actual password-only role acceptance passed 21 October. This is the rehearsal profile, not an exact clone of all source Auth settings. Fresh source control-plane inspection timed out on 21 October; no new parity claim follows. |
| Site/redirect URLs and email templates | Not exercised by the password-only launcher. Signup/recovery/magic links/provider redirects are blocked by its request allowlist. Review/recreate these settings privately before any workflow uses them; no source parity or tested recovery of email links is claimed. |
| Email/SMS/provider capability | The launcher has no notification worker and forbids its own signup/recovery/email/provider requests. Provider-default Auth email capability still exists outside the launcher; never describe the whole Supabase service as unable to send email. No invitation/reset/magic-link test was run. |
| Storage files | Source capture inventory and fresh destination each had 0 buckets/objects. No file bytes required replay for this capture. Any later nonzero inventory needs a separate protected file export/retrieval/restore test; database metadata alone is insufficient. |
| Vault/column encryption/custom managed objects | Capture inventory had no Vault secrets, column-encryption extensions or custom managed-schema triggers/policies; fresh destination Vault count is 0. Managed schemas were compared, not blindly replayed. A future nonempty/custom inventory requires an explicit reviewed recovery treatment and any required private encryption-root material. |
| Extensions and database roles | Actual replay checks passed. Fresh destination versions: plpgsql 1.0, pgcrypto 1.3, uuid-ossp 1.1, btree_gist 1.7, supabase_vault 0.3.1, pg_stat_statements 1.11. Capture inventory reported no custom login roles requiring password reconstruction. Managed server passwords are not copied. |
| Jobs, Edge Functions and Realtime | No Edge Functions in the captured source inventory or fresh destination; fresh destination has no `cron.job` relation. No operational job/worker was enabled. Realtime/publication-dependent delivery was not exercised by this local app. Review separately if introduced. |
| Accounting/provider secrets | Two disabled TEST accounting metadata rows are restored; 0 enabled verified. `restore-rehearsal.mjs` has no accounting worker/adapter and ignores staging accounting-worker environment setup. Private Zoho credentials/server keys are not in the archive/Git and are not collected. T19 stays held; reconnecting/activating integrations is a separate private acceptance gate. |
| Hosting, DNS and live business integrations | Not changed or restored. FaraiOS is a loopback rehearsal, with no claim about production hosting, Plesk, existing Shalean/Bokkie services or end-to-end financial recovery. |

Current documentation/control-plane limits are explicit. Any future activation or broader recovery must first resolve the corresponding dependency; a passing database restore does not authorize provider reconnection.

## 8. Measurements

| Measure | Recorded result |
| --- | --- |
| Logical capture/manifest completion | `2026-10-20T18:16:09.453Z` (after frozen per-dump transactions and matching before/after metadata; before encryption, archive write and local reread verification) |
| Owner helper elapsed | `162107ms` = **2m42.107s**; begins after archive decryption/validation, includes client preparation, destination checks, import/checks, sequence completion and client cleanup |
| Logical capture age at owner-browser cutoff | `11h13m48.547s` at `2026-10-21T05:29:58Z`, measured from that logical capture/manifest timestamp |
| Full application recovery time | **NOT_MEASURED**. The helper excludes capture/upload/download, key retrieval/decryption, manual failures, app startup and acceptance. Do not manufacture a full RTO by subtracting unrelated milestones. |
| Promised RPO/RTO | **NOT AGREED**. Capture age and helper duration are observations, not a recovery guarantee. Before production, agree targets and run a timed full recovery exercise against those targets. |

## 9. Security and operational constraints

Keep ciphertext/checksum in the approved private Drive folder and the raw 32-byte key separate. The local workstation/Docker administrator remains trusted; `NEVER_WRITTEN` applies to helper-managed plaintext SQL files, not host swap/crash dumps. Keys, passwords, provider tokens, dump rows and private terminal captures never enter Git/chat/Drive. Do not weaken TLS, relax fingerprints, expand the app allowlist, reset source passwords or restore over active projects to complete this exercise.

For the completed Windows Home custody method, the offline USB holds the password-encrypted key archive, with its password record separate and independently recoverable without this PC. The original and verification copy remain private on the PC under the retention hold; no cleanup or secure-erasure claim follows. The read-only comparison emits fixed labels, never key bytes or hashes. This file-level protection does not encrypt unrelated USB files or establish malware resistance/immutable storage.

## 10. Existing one-off operating decision

The approved execution is a **one-off rehearsal**. No recurring backup schedule, automated deletion, paid backup service or ongoing recovery promise was approved or enabled. Retain the current verified archive/checksum and associated keys on **retention hold** until the owner explicitly approves a successor retention/disposal decision. A failed/partial export is not a usable backup; keep it private and review before cleanup. Never delete the sole verified recoverable copy.

Before production or reliance on ongoing protection, separately approve backup cadence/retention, write-freeze ownership, stale-backup monitoring, file/provider coverage, recurring execution design, recovery targets and cleanup. These operating decisions remain visible; this document neither selects them silently nor creates a scheduled task. A cadence proposal may be reviewed later without pretending automation exists today.

## 11. Recovery runbook and support handover

1. Owner preserves the exact encrypted capture/checksum and privately verifies a separate usable offline key copy using [the custody handoff](t11-key-custody.md). Confirm artifact identity and access before any proposed change.
2. For a new capture, stop the source app and all known writers, then use the reviewed capture helper privately with the existing source password. Its current consistency mechanism requires a genuine quiet window; do not schedule unattended execution around that assumption.
3. Upload only verified ciphertext/checksum to the approved private destination. Independently retrieve and privately verify decryption. Record capture ID, SHA, consistency/cleanup and off-site outcome without uploading the key.
4. Review the new capture's complete inventory/configuration matrix. Approve a distinct empty destination and its cost/isolation first. Use its own privately entered database credentials and safe Auth profile. Do not introduce live payment/accounting/messaging credentials.
5. **The present restore helper is pinned to this exact archive and destination. It is not a general future-backup importer.** Another archive/destination needs separately reviewed pins/configuration and acceptance. The existing destination is now used; do not rerun `restore:test` or remove its data to create an apparent clean test.
6. After approved import, require committed data/catalog and separate sequence completion, then preserve the pre-login verification result. On uncertainty, stop for a read-only outcome check rather than retrying. Do not compare post-login Auth rows with an untouched backup baseline.
7. Launch only the dedicated read-only restore app on 3103 using Node 24. Check `/restore-health`, then privately exercise owner/manager/shared-staff sign-in, scope, allowed/denied module reads and logout. Keep each role's result and cleanup status explicit. No provider sync or business write is part of this profile.
8. Verify foundation audit continuity/rollback behavior separately; record timing, missing coverage and independent review. Owner accepts the precise scope only after every mandatory criterion is evidenced. Stop the local restore app after acceptance; any project pausing/deletion is a separate explicit action.

Recovery escalation owner: Farai. Engineering investigates fixed diagnostic labels and read-only state before any new import or cleanup. No automatic retry/failover is installed.

## 12. Residual risks and findings

| ID | Condition | Owner and closure evidence |
| --- | --- | --- |
| T11-KEY-01 | **Satisfied at the owner-operated evidence level on 21 October 2026:** fresh USB archive reopen/Test, recovered-key comparison match and explicit secured-offline-custody confirmation supersede historical `NO_OFFLINE_COPY`. | Farai retains physical custody and the separate independently recoverable password record. Evidence is the exact fixed labels plus observed archive metadata above; preserve both original and offline recoverable copy. |
| T11-OPS-01 | One-off capture does not provide continuing backups or agreed production RPO/RTO. | Farai/Engineering: separate approved operating policy and timed exercise before production reliance. No recurring/deletion action now. |
| T11-CFG-01 | Source control-plane parity, hosted deployment, provider reconnection and inactive features were not tested. | Engineering/owner: current bounded matrix; resolve each dependency before the related workflow or broader recovery is enabled. |
| T11-QA-01 | Exact-package independent final review and subsequent scoped owner acceptance remain separate decisions; this record does not manufacture either decision. | Independent QA/Farai: index the issued opinion, exact published revision/CI and separate owner acceptance in the live tracker/PR. Do not mark Done or fill a completed date before those decisions. |

No risk exception or criterion waiver is granted here.

## 13. Validation of this handover

Documentation-only change; no application/helper/schema/workflow behavior changes. Reconciled against owner reports, the live tracker, inspected published code and retained target-only metadata/full structural fingerprints. The Windows Home alternative received independent static procedure review before use; its actual Windows execution and physical custody are owner reports, not fixture or agent execution claims. Prior exact-runtime CI and release QA remain implementation evidence, not a substitute for the actual owner-host acceptance above. Document accuracy/privacy/link checks and exact-package independent review are recorded with its PR. No new database import, role replay, provider cleanup or database write is required merely to edit this record.

## 14. Gate recommendation

**Engineering gate: CONDITIONAL PASS to final independent review and scoped owner acceptance.** The bounded technical and owner-operated custody evidence is complete. Closure still requires the independently issued opinion and the owner's subsequent acceptance of the exact one-off rehearsal and its recorded limits. Independent QA owns its opinion; Farai owns the final decision. The later custody confirmation, rather than the earlier “LET'S FINISH T11” instruction, is the evidence for physical key custody. The live tracker and PR record the final decisions after this evidence package is published.

## 15. Next action and references

Obtain exact-package independent final QA and then the owner's scoped acceptance. Update T11 only after those outcomes are known. Keep T04/T19 open as recorded, and retain the verified archive/checksum/key materials. After acceptance stop the local restore app in its own terminal; any cloud-project pause/deletion, recurring schedule, retention disposal or production/provider activation needs a separate explicit instruction. No repeated restore/role tests are required by this documentation update.

Primary sources reviewed 21 October 2026: [Supabase backups](https://supabase.com/docs/guides/platform/backups) (database backups exclude Storage bytes); [logical backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) (managed/custom schema, migration-history and encryption considerations); [HTTP TLS change](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) (no relaxed TLS settings introduced). The changelog's proposed HTTP-cipher change does not explain past owner-host failures; direct PostgreSQL/pooler connections are outside that particular change.
