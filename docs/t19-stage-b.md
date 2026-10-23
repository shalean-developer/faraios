# T19 Stage B — offline accounting foundations

Owner approval: [PR #101 decision D1–D6](https://github.com/shalean-developer/faraios/pull/101#issuecomment-6350280168), 22 October 2026. D2 remains conditional on Zoho confirmation. Branch: `codex/t19-stage-b`, based on the research commit `c144bfe`; a separate draft PR is based on the research branch while PR #101 remains unmerged. The baseline and original T04 checkout are untouched.

**T19 In progress; accounting activation NO-GO.** This work implements Stage B's offline contracts, not Stage C onboarding or production accounting. It cannot connect to Zoho: there is no network transport, OAuth flow, secret loader, production vault hookup or import into `staging.mjs`. No hosted migration is generated or applied. Existing invoice code remains disabled under its existing gates.

## Delivered boundaries

`database/accounting-stage-b.sql` is a local candidate schema in the unexposed `t19_local` namespace. The test fixture must explicitly set `faraios.stage_b=synthetic`. Constraints permit only provider/environment `synthetic`, region `local` and organisation names prefixed `synthetic-`. It reuses the existing business/membership contracts but does not modify them. Each business has one immutable organisation binding. Connection status/current generation can change only through owner RPCs; append-only generation records preserve the actor/reason/time. An organisation change is deliberately unsupported and cannot be disguised as reauthorisation.

All five business-owned tables have RLS and no direct application write grants. Public/anonymous/service-role callers cannot invoke worker functions. A dedicated NOLOGIN `t19_worker` role can invoke only claim/dispatch/finish, without table reads or owner configuration rights. Those functions reload the durable operation, verify its business, current connection and original actor's active server-side membership. Composite foreign keys bind operations and audit events to the same business/connection/generation. The only publicly executable membership predicate uses `auth.uid()`; arbitrary other-user probing is denied.

`src/accounting-stage-b.js` contains the loopback-only API factory, an immutable context resolver, an in-memory encrypted synthetic credential implementation and a branded in-memory provider. Nothing starts a server on import. The host must inject a trusted session verifier and role-scoped store; browser-supplied role, actor, organisation, URL or extra fields are rejected for operations. Owner-only setup takes a synthetic org identifier; invoice-like intents and enqueue require an owner/manager membership. Staff, customers with no finance membership and platform-only users have no accounting access. No customer portal is introduced.

The synthetic vault generates its own fake values, encrypts them with AES-256-GCM and authenticates environment/business/connection/generation/organisation as AAD. It accepts no external token value and reads no filesystem/environment secrets. Ciphertext copying across tenants/generations fails. Cache keys include the entire context and refresh is coalesced within one process. This is an interface/cryptographic boundary demonstration, **not** production KMS, durable key custody, distributed refresh locking or real revocation. Those capabilities remain Stage C+ gates. A deliberately broad fake token can read either fake organisation, so the tests exercise FaraiOS's routing rather than relying on token isolation.

## Durable operations and race semantics

An immutable synthetic intent stores business/local identity, amount, currency and creator/time. Enqueue derives its payload hash from that row, never from caller-supplied financial claims. Uniqueness across business/local object/action/revision returns the same operation on replay and prevents reauthorisation from re-enqueueing old work under a new generation. A different payload under the same intent is rejected. Stage B supports only synthetic draft creation, revision 1; production booking linkage, updates and credit/payment commands are not implemented.

States are `pending → claimed → dispatched → verified`, with uncertain/review-required/cancelled alternatives. Claim leases and unique attempt IDs fence competing/stale workers. Dispatch commits before any provider effect. An expired previously dispatched operation can only be claimed in reconciliation mode. A lost response, worker failure or absent readback never causes another create. Exactly one full matching record can reconcile; duplicate/mismatched records quarantine the connection. A NULL or replayed completion token is rejected. The fake provider intentionally does not deduplicate creation, so tests cannot pass by hiding a double dispatch in provider behaviour.

Every transition locks connection then operation. **Dispatch authorisation is the race boundary:** disconnect/reauthorisation committed first prevents egress; an already-authorised dispatch cannot be recalled. Its late result remains uncertain, with a strictly validated receipt retained in the historical audit event rather than a verified current mapping. Outstanding old-generation jobs cannot run under new credentials. Disconnect does not clear quarantine; reauthorisation cannot bypass required mismatch review. No automated quarantine-clear or organisation-transfer action is supplied.

Audit events are append-only, business-scoped, and contain generation/operation, originating actor, executing database role, event type/time and only validated receipt evidence. No token, secret, provider error body or customer payload is logged. The synthetic intent identity and connection history also remain immutable. Application writes are through audited functions only; superuser test setup is not presented as RLS evidence.

## Source of truth and deliberate limits

| Object | Authority in Stage B | Future integration requirement |
|---|---|---|
| Membership / owner permission | Existing server-side membership rows | Real session verification and lifecycle review remain mandatory |
| Connection org / generation | Owner-authorised DB binding + append-only generation history | Verified real organisation and separate encrypted credentials |
| Intent amount/currency/local identity | Immutable synthetic intent | Existing frozen business booking/quote agreement, never browser price claims |
| Operation and attempt state | DB operation ledger | Durable production store/outbox adapter and operational recovery |
| Synthetic remote receipt | Fake provider, then exact DB receipt validation | Zoho-issued accounting identity remains provider-authoritative |
| Late/mismatched results | Scoped audit evidence; no implicit success | Reviewed reconciliation under historical binding |
| Payment, credit, tax, cash, monthly close | Not implemented or inferred | D6 ownership matrix in the approved architecture; accountant review |

The fixture store in `test-support/accounting-stage-b.mjs` uses restricted SQL roles and an injected trusted synthetic identity. It is intentionally a test host, not a production database/session adapter. Native HTTP tests reach real PostgreSQL/RLS over that store; they do not certify Supabase JWT validation, PostgREST, hosted policies or a deployed endpoint. A random UUID local intent is test data, not a legal invoice or booking integration.

## Reproduction and evidence

Use Node 24 with pinned repository dependencies. `npm run test:accounting` runs PGlite/API/worker and vault checks, explicitly skipping the native test when no isolated URL is supplied. **That skip does not pass the native acceptance gate.** Run `npm run test:accounting:postgres` for the complete acceptance suite. It creates an empty disposable PostgreSQL cluster on a random IPv4 loopback port, creates only synthetic roles/data, runs the same suite with independent native connections, stops the cluster and removes its exact checked temporary directory. It does not read app DB configuration. Set `T19_PG_BIN` to the local PostgreSQL binary directory when needed (Windows default: PostgreSQL 17). CI obtains this path with `pg_config --bindir` and runs the dedicated acceptance step separately.

The native store refuses non-loopback, credential-bearing or incorrectly named database URLs and refuses a nonempty database. The runner strips inherited PG/database/FaraiOS/Supabase environment settings and uses nonexistent password/service files. Loopback trust belongs only to this disposable cluster. A production secret is never required. Held-lock tests observe an actual PostgreSQL `Lock` wait before releasing the winning transaction: competing claims, reauthorisation before dispatch, and dispatch before disconnect.

Coverage includes V03–V07, synthetic V09/V11–V17, V19/V20 and scoped V23 from [the acceptance plan](t19-verification-plan.md). Live V01/V02/V08/V10, production vault/key recovery, distributed refresh, hosted RLS/session verification, quota handling, monthly close and real accounting lifecycle remain NOT ASSESSED. No live-grant or provider-isolation conclusion follows from a Stage B PASS.

Review fixes: explicit non-null completion attempts; persistent quarantine across disconnect; auth.uid-bound public membership helper; retained validated late receipts; explicit worker-context business check; audit executor role. The initial Windows PostgreSQL runner hung on inherited process pipes after startup. It was corrected to wait for pg_ctl exit, the exact stopped test cluster was removed, and subsequent disposable runs completed and cleaned up normally. No other PostgreSQL instance was stopped or changed.

## Candidate results and recommendation

Final CI closeout: [complete local coverage matrix, evidence and owner proposal](evidence/t19-final-ci/README.md). Local offline Stage B test-body coverage PASS on exact d4643e2: Linux full suite296/297 (one native skip covered by26/26 dedicated), Windows exact workflow110/110, and composed public-TLS/synthetic Docker assertions PASS. Hosted CI acceptance and merge remain NO-GO; timeout equivalence and branch rules are not verified. The original transport adapter failure is preserved; no application or T04 source changed. T19 remains In progress, accounting activation NO-GO. Earlier paragraphs below are historical evidence, superseded only where the linked final matrix explicitly records new results.

Latest native gate: [Linux verification and full gate ledger](evidence/t19-linux/README.md) — **PASS**, unchanged legacy assertions on exact `d4643e2`, Node 24.22.1/PostgreSQL 17.10, 1/1 and zero skips. This closes the legacy native gap mentioned in earlier evidence below. Applicable workload/allowance safeguards passed; monthly settlement execution is not covered. CI-backed acceptance/merge and financial activation remain NO-GO.

Closeout update: see [complete logs, exact-commit evidence and CI proposal](evidence/t19-closeout/README.md). On target `9102b2a77b9f6981d4e6e6e60cad1398324b4b2d`, the controlled full Node 24 run passed 295/297 with zero failures and two explicit native skips; Stage B native acceptance separately passed 26/26. Log review identified a default-discovery defect in the standalone runner: candidate `d4643e244f5f9538264a5beec15b03984a437d32` renames it outside Node's test naming pattern and adds executable regression coverage. Full-run and independent reassessment evidence for that fix is in the closeout report. The other native test reproduced a Windows CRLF assertion mismatch and remains an outstanding gate. The earlier backup failure was not reproduced and its cause is still unknown. Accounting, backup and T04 logic remain unchanged. Local Stage B PASS; complete acceptance and merge readiness NO-GO. The table below preserves the earlier run rather than overwriting its failure record.

Implementation candidate: `54b4ca8c8f0a66ac213e58bbab31210fe829d368`. [Separate draft PR #102](https://github.com/shalean-developer/faraios/pull/102) targets `codex/t19-research-architecture`; it contains no changes to T04 or the existing production/staging accounting runtime. Later evidence-only commits do not alter this tested implementation.

| Check | Result |
|---|---|
| Required Node 24.19.0, dedicated local PostgreSQL 17.10 acceptance | **26/26 PASS, zero failures/skips**, including PGlite and native HTTP/RLS/worker contracts, held-lock races and vault checks |
| Independent agent rerun on exact implementation candidate | **26/26 PASS**, cleanup marker and absent disposable cluster verified; additional direct RLS/ACL/FK/immutability probes passed |
| Full local Node 24 suite | **297 tests: 294 passed, 1 failed, 2 skipped**. Skips are the separately configured T16 native database and T19 native test; T19 native gate passed separately |
| Sole broad-run failure | Unchanged backup test `key boundary replacement stops before encryption and public key permissions fail retrieval`: ENOENT for synthetic `moved-keys` directory after prolonged Windows execution. Cause not established |
| Isolated rerun of that exact backup test | **1/1 PASS**, no source edit; this does not retroactively make the broad run fully green |
| Repository syntax, new module/runner syntax, whitespace | PASS |
| GitHub Actions | **BLOCKED before execution**. [PR run 39851035004](https://github.com/shalean-developer/faraios/actions/runs/39851035004) annotations state failed recent account payments or spending limit. No billing/settings changes made; no hosted CI test PASS claimed |
| Live OAuth/Zoho, hosted migrations/API/RLS, real secrets, production | Not run; outside authorisation |

**PASS for bounded local Stage B implementation and independent synthetic acceptance. NO-GO for complete CI-backed acceptance, merge, Stage C or accounting activation.** Resolve CI availability separately, then run the exact final candidate checks; retain the broad-run backup caveat until a clean relevant CI/full-suite result is available. D2 and the real provider/vault/session/accounting requirements remain open. No approval of these later actions is inferred.

See [independent QA evidence](evidence/t19-stage-b-independent-qa.md). The independent agent uses the same tool environment and is not an external human security review. Stage B acceptance does not mark T19 Done, clear the Zoho support blocker, approve Stage C or authorise a merge.
