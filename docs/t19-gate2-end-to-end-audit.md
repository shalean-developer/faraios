# FaraiOS T19 — Gate 2 end-to-end audit and acceptance decision

Reviewed AGENTS.md, docs/blueprint.md, PR #209, the authorization, Docker, recovery, receipt and PowerShell modules, and owner-provided Windows/Docker evidence. No PostgreSQL startup or SQL integrity test has been performed.

| ID | Severity | Finding | Acceptance |
|---|---|---|---|
| G2-01 | Critical | Startup PowerShell has unconditional execution NO-GO; signed verifier and bounded Docker adapter are disconnected from its unreachable mutation code. Current tests predominantly test source/simulations. | One reviewed integrated create/readback/start/SQL/stop/remove executor and full fault tests |
| G2-02 | Critical | A boolean switch is not approval; signature verifier always denies and cannot consume a one-use grant. No independently trusted signing-key custody. | Exact signed run manifest, trusted key, nonce consumption, expiry and replay denial |
| G2-03 | Critical | docker create can succeed with lost output before receipt; pre-create intent exists but no reliable nonce-to-ID recovery. | Recover unique nonce/ID or quarantine without modifying unknown containers |
| G2-04 | High | PowerShell native Docker commands are unbounded; JavaScript read-only adapter timeouts do not prove Windows process-tree termination or Docker operation cancellation. | Deadline, process cleanup, uncertainty reconciliation, explicit QUARANTINE |
| G2-05 | High | Forced UID 100:101, tmpfs mount permissions, read-only root, cap-drop ALL and 512 MiB have not been validated for full Supabase/Postgres init scripts. | Real startup/readback and no unauthorized relaxation |
| G2-06 | High | Cleanup is untested and Windows receipt crash-consistency unproven. | Fault-injected interruptions, stop/inspect, exact ID/image/nonce/receipt match and after-inventory evidence |
| G2-07 | High | No actual SQLSTATE 42501, collision-denial, rollback or unchanged-state evidence. | Synthetic PostgreSQL permission and transaction test with final reconciliation |
| G2-08 | Medium | Existing 13-container inventory is not preserved as a run-bound baseline. | Compare exact pre/post IDs and states; never mutate unrelated containers |
| G2-09 | High | Independent run security review and one-time owner startup approval absent. | Written independent scoped PASS and separate owner approval |

**Single closure cycle:** (1) implement all corrections in PR #209 with dependency-injected scenario tests; (2) Windows syntax/unit/CI; (3) independent exact-command and recovery review; (4) separate owner authorization for one disposable local test; (5) execute startup, Docker readback, synthetic SQL denials/rollback, exact cleanup; (6) reconcile evidence and close Gate 2 only if all pass.

**Current status:** Gate 2 IN PROGRESS; managed PostgreSQL execution NO-GO; A12 unresolved; Zoho activation NO-GO; T20 not started. Passing simulated tests are not evidence of live enforcement. No hosted or financial operations authorized.
