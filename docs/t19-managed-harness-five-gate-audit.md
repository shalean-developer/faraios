# T19 managed harness — five-prerequisite read-only audit (27 October 2026)

**Baseline:** staging `d1ca779f5f684804ad057c2ee3b6334ebf05cd68` (merged PR #192). Scope: source read-only audit and fail-closed reporting; no execution authority. Canonical Build Plan controls T19 and T20.

| Prerequisite | Evidence observed | Unverified acceptance evidence | Decision |
| --- | --- | --- | --- |
| Vault/extension | Guard checks local PostgreSQL image identity and linux/amd64 only; historical staging Vault observations do not establish isolated managed-image support | Pinned Vault extension/version availability inside disposable PostgreSQL, trust/ACL behavior and denial results | NO-GO |
| Bootstrap actor | Current guard verifies no bootstrap principal | Dedicated restricted bootstrap identity, privilege/default-grant inventory, ownership boundaries, provenance and negative privilege tests | NO-GO |
| Migration SHA-256 | Guard contains no migration manifest or digest check | Complete ordered applicable migration list, independent file SHA-256 matching, exact baseline and rollback/collision-denial integrity | NO-GO |
| Full image catalog | Three image IDs for postgres, auth and storage verified locally by read-only Docker inspect; separate inventory additionally checks storage VERSION; no supply-chain provenance established | Complete managed service/sidecar image list with pinned digest, platform, provenance and no implicit pulls | NO-GO |
| Resource isolation | Exact disposable name checked against read-only Docker inventory; no container started | CPU/memory/PID/storage caps, network isolation, volumes/mount boundaries, credential/environment exclusion, deterministic cleanup on failure | NO-GO |

## Source correction in this PR
The PowerShell guard prints five individually named NO-GO markers followed by one `EXECUTION_NO_GO`. The existing read-only Docker checks and strict name-collision refusal stay unchanged. The static regression test asserts all six markers and forbids execution-ready status or Docker mutations.

## Acceptance protocol before any new managed-harness execution
1. Obtain a complete trusted versioned catalog and exact image/migration digests; compare against local images and committed files with read-only operations only.
2. Audit the trusted bootstrap identity and locked ownership/grants; do not provision it as part of this gate.
3. Design and review the disposable-only extension and network/resource/cleanup policy with negative cases.
4. Add independently reviewable automated fail-closed checks for **actual**, not merely declared, catalog/digest, identity and isolation conditions.
5. Rerun on Windows PowerShell 5.1 and CI, inspect complete diff, then request separate authorization for any container creation or SQL execution.

**Not proved:** Live Docker condition on another computer, image publisher provenance, bootstrap identity, Vault behavior, complete migration signatures, resource enforcement or PostgreSQL rollback. Static Node tests alone cannot prove those properties.

**No change:** No Docker create/run/pull/stop/remove, PostgreSQL, hosted SQL, Supabase permissions, OAuth, credentials, financial data, Zoho, production or T20 changes. PR #192 local verification is closed; managed execution remains NO-GO. T19 In progress; A12 unresolved; accounting activation NO-GO; T20 Not started.
