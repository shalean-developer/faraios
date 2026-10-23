# Independent QA — final synthetic CI fixture hardening

Reviewer: separate Codex agent `/root/fixture_hardening_qa`, 23 October 2026. Source candidate: **90dbc74933357b9e9ca257c08c9616b1b3ade96e**; parent **8a4aed07dd5429c3cef8963a6975efd8329e78c4**. This reviewer independently inspected source, immutable commit scope, exact archive checksum, result markers, exit codes, isolation configuration and preserved evidence. The reviewer shares the local host/tooling and did not independently rerun already successful tests or authenticate to GitGuardian. Scanner conclusions below come from the captured actual check metadata, not a claimed separate authenticated session.

## Decision

**PASS for bounded synthetic CI fixture hardening and local regression acceptance. NO-GO for the GitGuardian security gate and PR merge readiness.** The required local regressions completed, including the final clean synthetic transport repeat. The original transport failure remains unexplained and preserved; it is not recast as a pass or attributed to a proven environmental defect. No evidence justifies a speculative production fix.

## Source review

Exactly four source paths change relative to the parent: `.github/workflows/ci.yml`, `scripts/.gitattributes`, `scripts/ci-policy.Dockerfile`, `scripts/run-ci-policy.sh`. Application, legacy test assertions, T04, database migrations and backup implementation are unchanged. The reviewer identified an incomplete PostgreSQL image-digest transcription before the candidate was committed; the implementation agent corrected it. The committed digest independently matches the prior verified 64-character digest.

The two former fixed-value dependencies were the CI service environment and the test database URL. The legacy test accepts an arbitrary credential but constrains its host and database. A same-job step cannot supply a freshly generated credential to a GitHub service that starts before steps. The new job therefore builds the exact clean Git archive and runs the policy commands inside a non-root, network-disabled PostgreSQL 17 / Node 24 image. Clean archive input excludes ignored local credentials, dependencies and Git administrative files from the build context.

The runner generates 32 random bytes at runtime, stores the initialization value temporarily with mode 0600 under a private mktemp directory, preserves SCRAM for host and local authentication, removes the initialization file immediately after initdb and requires genuine TCP wrong-password rejection followed by correct-password success. The restrictive umask applies only to file creation, preserving the inherited permission behavior exercised by backup tests. No fixed replacement password, trust authentication, host port, Docker socket, provider request or credential value in command arguments is introduced. The value exists only in the ephemeral cluster and process environment. EXIT/INT/TERM traps stop the cluster, verify PID absence, remove the private directory and preserve failure status; forced-failure evidence verifies that path.

An independent metadata-only comparison derived the historical fixture value in memory and searched tracked `.github`, `scripts`, `src` and `test` credential assignments/URLs: **zero matching fixed credential settings** at the candidate. Historical evidence is deliberately retained. This is not proof of non-reuse outside the inspected repository or revocation of unrelated services.

Job orchestration changes are explicit: the policy timeout increases from 5 to 10 minutes, Node/PostgreSQL versions come from pinned image digests and Docker replaces the hosted service container. These are CI-only changes. Hosted runner orchestration and actual timeout compliance remain unverified because Actions did not execute successfully.

## Independently checked results

| Check | Evidence and assessment |
|---|---|
| Archive identity | candidate.tar SHA256 independently equals identity.json: BF9306060A1A7B4F2106D412CAAB5A33CD40A7EEBC357E44531CD26DDE1332E1 |
| Image build and locked install | Build exit 0; npm ci --ignore-scripts; exact pinned Node/PostgreSQL bases; image identity matches linux-isolation.json |
| Linux environment/isolation | Node 24.22.1, PostgreSQL 17.10, Debian 13; postgres UID999; network none, no ports, all capabilities dropped, no-new-privileges, 2 CPU/4 GiB |
| Linux policy syntax/full suite | PASS, 297 tests / 296 passed / 0 failed / 1 skipped; full suite duration 158831.206304 ms; runner exit 0 |
| Skip accounting | Sole full-suite skip is dedicated Stage B native group. Subsequent dedicated run passes 26/26, no skips, 11245.966436 ms. Legacy independent-connection locking/concurrency executes and passes without assertion changes |
| Authentication and normal cleanup | Wrong-password rejection and correct-password acceptance markers observed; PID absent, fixture removed, exit 0 |
| Failure-path regression | npm function injection fails after database/authentication startup with exit 42; runner preserves 42 and removes cluster/fixture; outer probe verifies and exits 0. No production hook added |
| Windows exact workflow group | Six syntax checks and seven-file command; 110/110 passed, zero skips, exit 0; 115911.5112 ms |
| Initial synthetic transport | Preserved FAIL, exit 1: expected RESTORE_CATALOG_MISMATCH but received CLIENT_CONTAINER_START_FAILED; fixture cleanup passed |
| Diagnostic transport | Observational instrumentation passed the original boundary. Incorrect diagnostic marker regex is explicitly excluded from causal conclusions. Not used as final unchanged-helper acceptance |
| Final clean synthetic transport | PASS, exit 0, all 23 success markers, including six dump modes, native restore/RLS/rollback, 21 TLS-negative clients, timeout/cancellation cleanup, unrelated sentinel preservation and fixture cleanup |
| Transport source identity | Independently verified restored backup helper is byte-identical to committed source; transport script differs only by explicit public TLS omission marker |
| Historical investigation preservation | Independently checked all 4 authenticated-preflight manifest entries and all 5 expanded-incident entries: zero mismatches |

The transport failure occurs where a nonzero child lacks the exact expected startup marker. Its underlying cause was not established and did not reproduce in diagnostics or the restored-helper repeat. No source change was made in response. This residual uncertainty must remain visible; the clean repeat supports this bounded hardening acceptance, not a claim that an unknown defect was fixed.

Public provider TLS was omitted from these new regressions. The earlier specifically approved handshake remains historical evidence and was not repeated. No claim is made of a new fully unmodified public-network end-to-end transport invocation.

## Security and governance

Actual captured GitGuardian check **120251972922**, candidate **90dbc74933357b9e9ca257c08c9616b1b3ade96e**, completed **FAILURE** at 2026-10-23T05:08:23Z. Captured metadata confirms references to incident **38407534**, the original finding commit and both original evidence paths. No successful check was observed. Historical findings cannot be assumed resolved by removing the current fixed configuration.

Owner/security disposition remains necessary. This change does not extend the previous conditional approval, dismiss the incident or remove the need to assess incident-wide future-alert suppression and external-reuse uncertainty. Any final evidence descendant requires observation of its own actual check; this report does not predeclare a later check successful.

Hosted policy annotations still indicate the billing/spending execution blocker. Local success does not satisfy hosted checks, unknown branch protection or an unapproved governance exception. PR #102 remains Draft and unmerged. T19 remains In progress; accounting activation NO-GO. No production, Zoho, billing, T04, scanner configuration or Git history changes were made.

Some broad log/report reads were rejected by automatic approval review because they could expose credentials. Safer whole-line redaction, whitelisted result markers and metadata-only comparisons completed the review; no unresolved work is blocked by those rejected reads.
