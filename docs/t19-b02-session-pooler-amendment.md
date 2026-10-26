# T19 B02 — staging Session pooler transport amendment (SOURCE ONLY)

## Boundary
- Supersedes the **connection-target validation** of runner Git blob `c52227647fd2a647189d6fbbe888edb98597deb7` **only after separate exact new runner blob approval**. Original reviewed SQL Git blob `89e13e8b55cec5503a67ed5486739e9d1d7560b4` stays byte-identical.
- GitHub-hosted CI preflight in PR #165 proved TCP reachability of `aws-0-eu-west-1.pooler.supabase.com:5432`. PR #166 proved direct project hostname IPv6 unreachable from hosted CI.
- Restrict the runner to **Session** pooler TCP 5432, exact `postgres.xdmfyrsauvqznkloroxg` account, `postgres` database, `postgresql:` protocol, no URL query/fragment. Driver arguments are constructed explicitly, enforcing `ssl.rejectUnauthorized=true` and a 10-second connect timeout. Never use transaction pooler 6543 for one-session BEGIN/ROLLBACK.
- SSL/TLS enforcement is source-only until an authenticated session proves certificate chain and identity from the execution host. No cert bypass, no `NODE_TLS_REJECT_UNAUTHORIZED=0`, no connection URL overrides.
- The session pooler must return effective `current_user=postgres`, `session_user=postgres`, and PostgreSQL version >=17. Verify before any SQL execution. The exact SQL also checks this.
- Secret injection, if separately approved, must be through a protected GitHub Environment restricted to reviewed branch/ref, with approval protection. Never use a privileged `pull_request` or fork-triggered job with secrets. Disable arbitrary re-runs and concurrency overlap; use one-shot approved execution only.
- Source/config readiness, successful CI, TCP connectivity and owner approval of **old runner** are insufficient approval for new runner execution.

## Required independent before-state baseline (read-only, no sensitive row values in logs)
On the **same project identity verified through an authenticated secure session** before SQL, independently collect and retain sensitive evidence privately:
1. Transaction/session principal, project target, role privilege context, TLS verified, and PostgreSQL version.
2. Scratch roles `t19_b02_qa_executor`, `t19_b02_qa_owner`, schema `t19_b02_qa_schema`, and scratch functions: all ABSENT before.
3. Catalog fingerprint for `private_t19_custody` (schema existence, owned objects, grants, role membership/default privilege metadata) and existing `t19_hosted_custody` role. Include dependency-sensitive Vault grants and Vault **counts only**; never retrieve Vault secret values.
4. Financial/tenant table identities, counts and deterministic cryptographic fingerprints of relevant protected content **only when this staging environment actually contains those tables**. Determine the applicable table list from a separate read-only schema audit. Do not presume universal financial table names or select customers' financial row contents into CI output.
5. Capture stable snapshots against concurrent writes, or explicitly prevent interference / mark result inconclusive. Record timestamp and hash of evidence in protected storage; do not expose sensitive digests for production or unrelated tenants.

## Execution gates
- New runner code reviewed, tests pass, canonical plan T19 source-only update, specific owner exact SHA approval for **new transport**, separate protected GitHub Environment credentials and reviewer gates.
- Independent BEFORE baseline approved and target protected-state immutable for probe interval.
- Unmodified SQL exact blob and SHA-256 checked before opening connection. Single `pg.Client` holds the complete SQL `BEGIN`…`ROLLBACK` and external zero-scratch readback. On any error attempt same-client rollback; failed rollback is UNKNOWN, not PASS.
- No app/notification dispatch, Vault provisioning, operational custody migrations, OAuth, Zoho, recovery rehearsal, production or real financial writes.

## Independent AFTER acceptance
- Always run a **fresh authenticated read-only connection**, never reuse the mutation-session state or infer from `ROLLBACK` log alone.
- Confirm all scratch objects absent; compare protected catalog and financial/tenant baselines; verify no committed changes and flag any concurrent differences for investigation.
- Capture observed SQLSTATEs 42501 and 55000 in the execution evidence (the SQL asserts them internally, but external proof requires controlled telemetry or statement-level capture).
- If network failure, non-zero scratch, changed protected state, unverified TLS, missing evidence, or non-deterministic fingerprint: FAIL/INCONCLUSIVE, disable further execution, investigate. Do not rerun automatically.
- Gate B02 is not complete until owner reviews before/after evidence and records PASS/NO-GO in Issue #140 and the canonical tracker. A12 remains unresolved; accounting activation NO-GO, T20 Not started.

This proposal does NOT introduce a secret-bearing hosted execution workflow. Offline source tests only.
