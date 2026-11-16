# Live repair release — 16 November 2026

## Owner-authorized live release complete — 16 November 2026

The owner explicitly authorized the reviewed seven-file/two-function live release. The exact candidate pinned to reviewed commit f89d616b7a9e76612214d70dd845440c97fdbef2 is now installed live. No merge or main change occurred; draft PR68 and prepared PR66 remain unmerged. Earlier preview-only/no-authorization statements below are historical.

Fresh encrypted backup [43872691752](https://github.com/shalean-developer/faraios/actions/runs/43872691752) and isolated restore [43873154699](https://github.com/shalean-developer/faraios/actions/runs/43873154699) passed immediately before release: 84 tables, matching snapshot fingerprints, 32 owner scopes, no network or published ports and no production credentials forwarded. All three CI workflows at reviewed f89d616b passed. Existing six-file private-configuration recovery proof remains separate.

Guarded preflight verified original runtime/configuration/dependency hashes and saved five original runtime files plus two absent-file states privately. Applied only the reviewed command/page SQL functions and page ACLs, then installed exactly seven canonical runtime files. Final runtime hashes match the reviewed manifest; every other web file and original private configuration remained unchanged. Post-release verification passed seven HTTP/asset/access checks and sixteen canonical-RPC permission checks. Revoked Manager/Receptionist/Worker and anonymous access remain denied; the owner's scoped read works. Membership, invitation, payment-history and live-gate fingerprints match pre-release. Both synthetic businesses remain closed with onboarding disabled and zero active delegates. Temporary hosting task cancelled.

Rollback material preserves the original command definition/grants and runtime states; guards protect against later drift. No whole-database rollback, history adjustment, real invitation mutation, customer message, intake change or republication was performed. Coverage limits remain: mid-flight ambiguous-save recovery has native/browser proof rather than separate physical-phone acceptance; no independent QA or universal-device claim; DB restore excludes hosted configuration and Storage bytes and establishes no service recovery-time guarantee.

## Exact scope and operator evidence

See `final-release-scope.json` for all seven baseline/candidate SHA256 hashes. SQL patch `docs/sc04/defect-repairs.sql` SHA256 is `017d5df36dbe4161754ed9944e9818cf63f588b52e657334e07001b21ee1ca9a`. Migration: `reviewed_d0106_live_functions_20261116`. No preview aliases deployed; no table or policy migration.

| Function | Installed body MD5 | Installed full-definition MD5 |
| --- | --- | --- |
| business_delegate_command | 244ea2a34b99082b9429c85f2c0bb981 | 64f6006540d7f1eb67b97820dbb11928 |
| business_delegate_page | b89d3db6188427d4234e24979b4b9d93 | fa4e5dc9e32f5b9f59aa1977bf7b4e70 |

Both functions grant authenticated execute; anonymous/service_role execute remains denied. Read-only permission checks performed no business writes.

Private receipts are in `private/faraios-account/live-d0106-20261116/`: preflight.json, database-before.json, database-ready.json, install-attempt.json, installed.json, verified.json, permissions.json and original/account/. No credential values are in this repository. `live-release.php` implements guarded preflight/install/verify/file rollback; `live-release-permissions.php` verifies canonical RPC isolation without activating delegates.

## Rollback and future deployment handoff

Five original existing runtime files and their modes are preserved; workspace.js and staff-join.css were previously absent. Guarded runtime rollback restores those five files and removes the two introduced assets only when current hashes match the release/baseline states. Privately prepared database-rollback.sql guards the installed function definition hashes, restores the captured original command definition and drops the introduced page function without CASCADE. It has not been executed. Restore only this scope; preserve all subsequently created records and financial history.

This was a scoped live overlay, not a branch deployment. A later full-repository deployment must incorporate or preserve these reviewed seven runtime files; unchanged main alone does not contain the overlay. Do not deploy whole inherited PR66/68 branches without a separate review. Main and concurrent public/owner work remain untouched by this release.
