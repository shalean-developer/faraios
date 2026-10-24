# T19 — bounded successor code preparation

24 October 2026. Owner authorised “code preparation and dummy testing only” after reviewing the successor proposal. Implementation and this record are local and uncommitted. No push, merge, deployment, hosted write, real credential-store access, real OAuth/provider access, accounting activation or tracker change is included. T19 remains In progress; T20 and later tasks remain untouched.

## Requirement and baseline

Canonical T19 requires separate invoice identities/accounting connections, business-total reconciliation and visible failures; T18 is its completed dependency. D13 keeps separate Shalean/Bokkie accounting. See the separately reviewed `t19-provider-verification-successor-proposal-20261024.md` for source/history and requirement mapping. This package addresses only the guarded successor and cleanup lifecycle needed after the recovered rejected consent. It does not add Build Plan acceptance criteria or satisfy provider/totals acceptance.

Fresh main reference: a5558ff2f74d004bdce7befb4f506622d468dec9 / tree c499fecb30956333f5299c7ba6d6e7e6e365f6ee. Isolated branch fix/t19-single-successor starts from local c4f74d2 (earlier preparation lineage), not a claim of actual main ancestry. Read-only comparison of all590 remote blobs found no missing baseline files and no runtime/source/test/workflow differences before this package. Historical preparation documentation and config/t19-shalean-review.json differ: that template contains additional unapproved registration/custody evidence; those pre-existing differences are excluded from the code patch. Both template versions remain approved:false. No source/config/template migration or tracker reconciliation is implied. Original worktrees, recovery approval and original run manifest remain unchanged.

Five code files: scripts/t19-connection.mjs, src/t19-connection.js, new src/t19-successor.js, package.json and new test/t19-successor.test.js. Provider verifier, vault, masked importer/DPAPI helper, auth/roles/RLS, hosted runtime, financial data, migrations, workflows and completed task foundations are unchanged. package.json only extends the existing T19 test command.

## Implemented contracts

The new module performs no network, store discovery or direct writes. The runner validates exact approvals before opening the existing protected vault, then writes one complete snapshot under its exclusive writer/atomic rename. Dependency injection in exported main() is for programmatic dummy tests; actual CLI invocation defaults to the existing Windows vault. There is no CLI flag or environment switch for fake custody.

Preparation mode accepts exactly five flags: manifest (new), predecessor-manifest (immutable original), predecessor-recovery (immutable approved recovery), prepare-successor-evidence and successor-approved (SHA256 of exact new preparation-envelope bytes). It forbids execute-approved, import, service and every cleanup mode alongside it. No executable real package is created here.

The new manifest has an exact successor object: predecessorId, predecessorGeneration3, predecessorRecordSha256, preallocated fresh connectionId, generation4 and preparationApprovalReference. A new run approval/window/runtime and a separate preparation reference are mandatory; original approval is never extended. Preparation validates the original at its original window solely to check historical approval, but requires the new run window current and at most60minutes.

The exact18-field preparation envelope is defined by prepFields in src/t19-successor.js. It pins raw original/recovery/new-manifest hashes, current runtime hash, identity/client/business/org/custodian, exact predecessor ID/generation/record hash, new ID/generation and separate approval/reference. The approved original recovery must remain a rejected/no-issued-grant attestation with matching pins. Expected fixture, callback and all business/provider bindings are preserved.

Only the exact disabled generation3 recovered predecessor is eligible: precise original/recovery metadata and three-event history, no credentials, client entry, cleanup, verification or unknown fields. Shared live references, reused IDs, existing predecessor archive or earlier same-business/client successor history fail closed. This permits one successor, not an ongoing retry feature.

One atomic write archives the complete non-secret predecessor unchanged under connectionHistory[predecessorId], records its digest, approval links and consumed successor ID, and installs successor_pending with fresh ID/generation4/new manifest digest. History is logically append-only under application guards, not tamper-proof against the same Windows user. This digest uses exact JSON serialisation order, not an order-independent canonical JSON format.

Import requires the exact unused pending successor and actual raw manifest digest. authorise retains the ordinary already_attempted hold; only the exact pending successor can advance once to authorising generation5. Queue serialization, session/owner checks, single-use state, manifest/raw-byte and generation fencing remain effective after restart. Old callbacks and original manifests cannot access the successor. Status exposes only safe connection/binding/predecessor/cleaned summaries; the original recovered status can expose its non-secret record digest for a future reviewed package. No new approval is inferred from a status read.

Successor disable is idempotent, keeping repeated clicks/concurrent disable from making legitimate cleanup impossible. Late grants on successor approval expiry or owner revocation are disabled and retained only for cleanup; original non-successor behaviour is preserved.

## Cleanup matrix

Successor cleanup is a separate three-flag mode: manifest, successor-cleanup-evidence and successor-approved. Its exact16-field envelope is defined by cleanupFields. It pins current runtime, actual raw new-manifest bytes, exact connection/generation/identity/binding/custodian and separate cleanup approval/reference. Original execution expiry may pass only this separately approved local cleanup; provider execution still stops at expiry.

| Outcome | Required evidence and guard |
|---|---|
| Cancelled before import/consent | Disable pending successor; exact no-exchange history and truthful noGrantIssued:true; no provider revocation claim |
| Rejected consent before exchange | Exact prepared/consent/disabled history, no token/provenance/cleanup/verification material, truthful noGrantIssued:true |
| Consent accepted but callback lost/expired before local exchange | Distinct consentRevokedBeforeExchange:true, noGrantIssued:false and providerRevocationConfirmed:true; exact consent-started/no-exchange disabled history; targeted provider-revocation evidence is a prerequisite, never inferred from local history |
| Successful exchange, whether verification succeeds/fails | Disable, preserve narrow cleanup material, then targeted providerRevocationConfirmed:true before local removal; noGrantIssued:false and consentRevokedBeforeExchange:false |
| Exchange dispatched, failed/unknown or still uncertain | Persist uncertainty before dispatch; no-grant cleanup forbidden; targeted custodian revocation confirmation required before local removal |
| Expired approval | Provider operations denied; disable and separately approved local cleanup still available |
| Interrupted/failed storage or lost receipt | Existing exclusive/atomic/poisoned-vault controls retained; no reset/lock deletion/automatic repeat. Inspect durable state under separately authorised read-only access |

Cleanup replays strict audit transitions, rejects foreign/shared/extra material and stale generation, removes only the successor-bound client/cleanup material, increments generation and preserves the disabled successor plus the entire predecessor archive. Result separately records no-grant or custodian-confirmed revocation, with providerRevocationVerifiedBySoftware:false. There is no new provider revoker. The old cleanup entrypoints and stripped-manifest import cannot bypass successor checks. A cleaned successor cannot authorise, import or prepare another successor.

No real targeted cleanup method has been tested. Before any grant is issued, the final execution package must establish unambiguous cleanup limited to that future attempt. Indistinguishable grouped grants, unknown external authorisation state or unsupported cleanup contracts remain execution stops. The local attestation mechanism is not independent provider verification.

## Validation and limits

Node24.19.0/Linux. Runtime LF digest frozen for review: 032fadc791e5c885f78feb71fe94341e776b21575f68d2fb09f5518e122152a7. Covered runtime files are listed in probeDigest(); future Windows CRLF checkout has a different digest and must be reviewed separately. No new manifest is approved or rehashed for execution.

- Final focused T19 run:92total,77PASS,0FAIL,15Windows-only skips. Includes19successor tests:18PASS/1Windows skip. Evidence: evidence/t19-successor/connection-tests.txt.
- Broad local regression before the final additional test-only failure-branch case:454total,435PASS,2FAIL,17skips. Both failures occur at OS Server.listen for Unix sockets with EPERM in unchanged test/hosted-staging.test.js (actual Unix listener and inherited listener cases). This is not a full-suite PASS; protections/tests were not weakened. Evidence: evidence/t19-successor/broad-regression-tests.txt. T19 source remained frozen; the final focused run covers the added test.
- Repository syntax check, explicit checks of the new/changed runner/modules and git diff --check passed.
- Independent reviewer reproduced the CLI routing defect before correction; the new portable positive CLI dispatch test also failed before the fix and passed afterward. Review found and closed stripped-manifest legacy-cleanup bypass, repeated-disable cleanup dead-end and accepted-before-exchange cleanup gap. Exact-byte import/runtime pinning was strengthened during self-review.
- Existing native/hosted and original PR112 Windows/CI evidence are historical reuse only. They do not certify this candidate. Current native PostgreSQL acceptance was skipped without an isolated test database; no shared database was used.
- The new Windows real dummy DPAPI/CLI test is present and unrun here. It uses a unique temporary test directory/LOCALAPPDATA child and dummy secrets, verifies exclusive-writer denial, exact CLI preparation/replay, protected restart/archive preservation and targeted local cleanup. It never selects the real credentials directory.

Windows synthetic verification, exact-candidate hosted CI/security, and any final merge readiness remain outstanding and are not authorised by this local package. Real consent identity/permissions, provider response pair, separate-business reconciliation and full T19 acceptance remain unverified.

## Independent technical review and next gate

Independent technical reviewer /root/t19_independent_review: PASS for completed bounded local preparation and documentation at the frozen LF runtime digest above. Independently reran final successor suite19total/18PASS/0FAIL/1Windows skip; counts and limitations match saved logs. No unresolved blocking preparation finding. This is Codex technical QA, not formal GitHub approval, owner OAuth approval, merge readiness, provider certification or T19 acceptance. Reviewer made no code/store/provider writes.

Next authorised local completion step: finish independent review and preserve the bounded patch/evidence. Next external step, if separately approved, is making this exact patch available for Windows dummy verification and CI/security. Publishing, commit/merge, real store preparation/import/cleanup, OAuth, deployment, accounting activation and tracker reconciliation each remain outside this authorisation.

Final deliverables: evidence/t19-successor/successor-code.patch (five code files only; SHA256 a12bdc00270a3e7676b18b344cec2588bd2d180736fe22d340d52a032c60b03e) and evidence/t19-successor/candidate-evidence.json. Patch apply-check passed against a temporary baseline index; no repository index or existing worktree content was reset. No commit or publication was performed. Gate: PASS for local code preparation/dummy Linux verification only. Windows, hosted CI/security and every real action remain outstanding.


## Subsequent owner Windows dummy verification

Owner supplied the Windows transcript from the new detached a5558ff successor-test worktree after verifying patch SHA256 a12bdc00… and applying only the five-file code patch. The complete T19 suite reports92/92PASS,0FAIL,0SKIP and immediate T19_TEST_EXIT=0, including the dedicated real dummy Windows DPAPI/CLI successor case. npm ci --ignore-scripts reports0vulnerabilities; git diff --check produced no error and status shows exactly the expected five files. This is owner-supplied physical Windows execution evidence, not an agent-run Windows session.

Reported Windows runtime0f45df2d61f700f38c30820df58f4a3938841d9b5e6df0407ab2ceccb3b67b26 independently reconstructs from the reviewed runtime files with CRLF line endings. Earlier Windows-unrun entries above are preserved preparation history and are superseded for this exact candidate only by this supplied result. Evidence: evidence/t19-successor/windows-dummy-tests.txt (execution output only; original owner command transcript reviewed privately) and windows-evidence.json. Independent evidence review /root/t19_independent_review PASS for Windows dummy verification only: transcript, patch and runtime mapping independently confirmed. Descriptor writes:none describes the inert --describe operation; dummy tests intentionally wrote isolated synthetic stores. Hosted exact-candidate CI/security and any publication/merge remain outstanding; no real-store/provider execution is authorised.


## Separate publication authority

After the Windows evidence review PASS, Farai explicitly answered yes to publication of this exact T19 candidate as a Draft PR to run required CI/security. This supersedes publication-unauthorised statements above only for this bounded branch/PR and evidence. The source remains the reviewed five-file patch; historical local-base config and unrelated preparation changes are excluded. Publication is based directly on current main a5558ff, with the exact head recorded in the PR description after creation. No merge, deployment, real credential/store operation, OAuth, provider access, accounting activation or tracker change is authorised. CI/security results must be verified on that exact published head; no PASS is claimed in advance.
