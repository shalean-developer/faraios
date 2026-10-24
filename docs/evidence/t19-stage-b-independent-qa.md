# T19 Stage B independent QA

Review ID: `QA-T19-STAGE-B-20261022`. Completed 22 October 2026, 22:42 SAST (20:42 UTC).

**PASS for the bounded offline, synthetic-only Stage B candidate. T19 remains In progress; accounting activation remains NO-GO.** No unresolved material finding was identified in the reviewed Stage B scope after the corrections below. This is neither production certification nor approval for Stage C, real secrets, OAuth, provider requests, hosted migrations, financial writes or a merge.

## Candidate and independence

- Exact implementation candidate: `54b4ca8c8f0a66ac213e58bbab31210fe829d368` on `codex/t19-stage-b`.
- Reviewed against research base `c144bfe08a20831e92430b7e8ebf2b02990f6ff9`, the approved D1–D6 architecture and verification plan, and repository `AGENTS.md`.
- Review performed by a separate QA agent. The reviewer did not implement the feature or change implementation files; only this evidence document was authored by QA. Both agents share the same AI tooling, filesystem and execution host. This is independent agent review, not external human assurance.
- The candidate was unchanged before and after independent tests. A parent-authored untracked PR body was present afterward and was not reviewed as implementation.

## Independently executed checks

Runtime: Node **24.19.0**. Native database: PostgreSQL **17.10**, a newly initialised disposable cluster on an allocated IPv4 loopback port. No application database configuration, hosted connection or real credentials were used.

```text
node scripts/test-t19-postgres.mjs

tests 26
pass 26
fail 0
cancelled 0
skipped 0
T19_NATIVE_ACCEPTANCE_PASSED
T19_DISPOSABLE_CLUSTER_CLEANED
```

The dedicated runner exercises the PGlite contract suite, the same contracts with native PostgreSQL restricted roles and real local HTTP requests, held native transaction races, and the synthetic credential tests. Independent QA observed the native contenders actually waiting on PostgreSQL locks before the winning transaction was released. These cases cover duplicate claims, reauthorisation committed before dispatch, and dispatch committed before disconnect. The native database and exact temporary directory were removed; QA independently confirmed that its directory no longer existed.

Five additional QA-authored probes ran against a fresh PGlite fixture without modifying repository source:

| Probe | Observed result |
|---|---|
| B-only owner reads A's connections, generations, intents, operations and events | Empty result for every table under authenticated RLS |
| A-only owner calls internal `allowed(B, ownerB, true)` | Rejected with SQLSTATE `42501` |
| `t19_worker` directly reads the connection table | Rejected with SQLSTATE `42501` |
| Privileged fixture attempts an A operation referencing B's connection/generation | Composite foreign key rejected with SQLSTATE `23503` |
| Privileged fixture changes an existing generation's actor | Immutable-history trigger rejected with SQLSTATE `42501` |

The extra probes are supplemental PGlite checks; they are not misrepresented as additional native tests. `git diff --check` for the candidate against the research base passed.

## Source review and findings closed

Inspected the local SQL schema, API/worker/vault/provider module, test store, regression suite, disposable-cluster runner, CI/package changes and Stage B documentation. The change set has no T04 edits, hosted migration file, production bootstrap import, Zoho HTTP transport or real-secret reader. Existing application behaviour is not enabled by these additions.

The review identified the following issues in the initial working candidate. The implementation owner corrected them before the frozen SHA, and the final source/regressions were verified:

1. **NULL completion replay:** an uncertain operation with a cleared attempt could previously accept NULL again. Dispatch and finish now explicitly reject NULL attempts, and stale/replayed completion tests pass.
2. **Quarantine bypass:** disconnect followed by reauthorisation could previously clear a mismatch hold. Quarantine now persists across disconnect; the exact two-step bypass is rejected in both database suites.
3. **Foreign membership oracle:** the initial public helper accepted an arbitrary user ID. A QA probe reproduced the leak of a boolean membership fact. The exposed predicate now binds to `auth.uid()`; arbitrary-user helper access is revoked and independently denied.
4. **Lost late-result evidence:** a late valid receipt previously left only an event label. Strictly validated receipt evidence now remains in an append-only, business-scoped historical event while the operation remains uncertain.
5. **Worker context consistency:** the worker now explicitly validates connection business identity as well as operation/intent identities before reaching the provider.
6. **Audit executor provenance:** audit events retain the originating actor and the executing database role. Native/PGlite assertions distinguish `authenticated` from `t19_worker` execution.

Current controls are supported by tests: server-side membership/owner checks; no implicit staff/platform authority; immutable organisation/generation identity; composite business foreign keys; direct application writes denied; worker-only transition ACLs; deliberately broad fake tokens constrained by server-built context; extra/forged API fields rejected; durable replay identity; lost-response reconciliation without another create; duplicate results quarantined; revoked membership denied; generation/disconnect fencing; authenticated synthetic credential ciphertext binding and in-process refresh coalescing.

The documented dispatch race boundary is explicit: a disconnect committed before dispatch authorisation prevents provider effects. Work authorised before disconnect can complete later, but does not become a verified current result; historical evidence is retained for review. No claim is made that a local disconnect recalls already-authorised work.

## Limits and wider regression caveat

The implementation owner's separate full Node 24 repository run reported **297 tests: 294 passed, 1 failed, 2 skipped**. Its failure was the unchanged backup test `key boundary replacement stops before encryption and public key permissions fail retrieval`, reporting ENOENT for `moved-keys`. The owner subsequently reported an isolated unchanged rerun **PASS 1/1** in approximately 92 seconds. QA did not independently reproduce or diagnose that unrelated failure. Therefore **the whole repository suite is not represented as green**; the isolated pass does not rewrite the full-run result.

The implementation owner also reported read-only inspection of GitHub Actions run `39851035004`: jobs did not start because recent account payments failed or the spending limit requires attention. This is an external CI execution blocker, not a test pass or a Stage B test failure. No billing setting was changed. The separate [draft PR #102](https://github.com/shalean-developer/faraios/pull/102) therefore has **local Stage B PASS, CI/release acceptance NO-GO** until required CI can run and its results are reviewed. This report does not independently attest the GitHub annotation; it records the implementation owner's finding separately from the QA-executed local checks.

This review proves bounded local Stage B contracts using synthetic identities, data, provider and credentials. The HTTP tests use a trusted injected session resolver and real restricted native DB roles; they do not certify hosted JWT verification, PostgREST or a deployed endpoint. The vault is in memory; production KMS/key custody, durable encrypted storage, distributed refresh locking and real revocation remain unbuilt. Organisation replacement intentionally remains unsupported. Real contact/invoice/payment/credit workflows, tax, monthly close, bank reconciliation and provider idempotency remain later-stage work.

D2 remains conditional on Zoho clarification. Live provider isolation and compatibility remain unverified. Stage B PASS does not remove any subsequent approval or acceptance gate and does not mark T19 Done.
