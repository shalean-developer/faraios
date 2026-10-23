# T19 — provider confirmation and acceptance reassessment

23 October 2026, Africa/Johannesburg. Review base: PR #102 head `a028fe62a2a38cb537b5f35b43a38c29b681c72f`. Bounded branch: `codex/t19-provider-confirmation`.

**PASS for incorporating provider guidance and the bounded synthetic isolation model. NO-GO for full T19 acceptance, live activation or release.** This addendum supersedes only the OAuth-model uncertainty and OAuth-path preference below. All earlier evidence, failures, holds and dependencies remain historical records. T04, application runtime, SQL, workflows and existing PRs are unchanged.

## Authoritative provider guidance and provenance

Zoho Books Africa, Sanu Jose, ticket **169559907**, response dated **23 October 2026**, as supplied by the owner in this conversation:

- Tokens are issued at the Zoho Accounts level.
- Tokens are not inherently restricted to one Books organisation.
- Accessible organisations depend on authenticated account membership and permissions.
- `organization_id` selects the requested organisation.

Record this as authoritative provider guidance for the access model, not as a new experimental result. This review did not independently retrieve the original reply or re-run OAuth diagnostics. It does not establish the earlier consenting identity, prove historical disclosure, explain the prior ORG 500/403, certify every client-flow lifecycle, or verify a real connection. No fresh broad OAuth investigation is needed to settle this model.

D1 remains mandatory: FaraiOS enforces isolation even with a broad provider token. D2's earlier preference for ORG consent pending compatibility is superseded for this review by **dedicated Zoho integration identities, least-privilege membership limited to the intended business organisation, and independent grants/credential references per business**. Standard supported server OAuth can be considered under this model; changing onboarding remains a separate bounded approval. Dedicated clients/grants reduce operational blast radius but do not by themselves restrict organisation access. Never copy one refresh token into multiple business aliases. Staging and production remain separate. Shared-account exceptions require explicit risk review; no exception is approved here.

## Implementation assessment

| Layer | Evidence | Assessment |
|---|---|---|
| Stage B server/DB authorisation | `src/accounting-stage-b.js`, `database/accounting-stage-b.sql`, `test/accounting-stage-b.test.js`: trusted test session, stored memberships, owner-only connection changes, worker ACLs, RLS and composite foreign keys | Correct offline implementation of application-owned isolation; not a deployed Supabase session/API certification |
| Stage B credentials | AES-GCM AAD includes environment/business/connection/generation/org; cache shares that context; broad fake credentials provisioned independently for A/B | Compatible with Accounts-level tokens. In-memory synthetic vault only; no production KMS, durable custody or distributed refresh proof |
| Stage B dispatch | Durable business-scoped operations, generation/attempt fencing, disconnect races, immutable binding and late-result evidence | Old work cannot silently run under new credentials; already authorised dispatch may finish late and remains uncertain |
| Legacy Zoho adapter | Independent secret pins for business/org/region/environment; fixed hosts; profile and record checks; DB/API scoping upstream | Partial implementation only. It has no generation-aware credential cache; Stage B does not retrofit it |
| Legacy URL/profile/receipt | Internal query spread can override org pin if a future caller supplies a reserved key; profile permits missing active flag; receipt org is copied from binding | Existing documented bounded corrections remain necessary before connecting this runtime. Current callers pass controlled query fields; no new public exploit is claimed |
| Existing setup helper | Sole-organisation list gate and plaintext local credential file | Preserve fail-closed hold. Sole-list result is not a universal token guarantee; do not remove gate without a reviewed positive-identity replacement and vault-backed onboarding |

## Negative verification

Existing Stage B tests deliberately use credentials capable of both synthetic organisations. They verify:

- HTTP extra `organization_id` rejection; foreign connection rejection; immutable SQL organisation binding; wrong-org receipt quarantine.
- B caller/A records and foreign worker business denial; scoped audit/history and explicit shared memberships.
- Staff, platform-only, anonymous, manager configuration, forged claims, worker ACL and revoked-membership denials.
- Secret-envelope substitution, stale generation, reauthorisation/disconnect before dispatch, and late completion after dispatch.

Two new legacy adapter tests explicitly reject substituted organisation pins **before any request**, and classify provider HTTP403 as credentials failure with no financial POST or fallback organisation. These are fake-provider tests, not a real-provider permissions test. Stage B HTTP/native tests use trusted injected identities, not hosted JWT verification. Existing coverage is reused rather than rebuilt.

Results and independent QA are recorded in `docs/evidence/t19-provider-confirmation/`. A native skip alone is not acceptance; deployed API/RLS and real provider checks remain unassessed.

## Remaining read-only identity requirement

Prepare one bounded, owner-approved TEST-only verification manifest for each business: expected business/connection/generation, dedicated consenting identity and verified organisation memberships/role, independent grant reference (never token contents), allowlisted region, exact expected organisation ID, expected currency/active state, scopes and pre-existing synthetic record markers. No production organisation or financial data may be read.

Use only approved read-only Books organisation and known synthetic invoice GETs (`settings.READ`, `invoices.READ`; add contact READ only if required by the reviewed fixture). Validate the exact returned organisation ID, required active state/currency, then a known pre-existing invoice ID with expected reference/customer/currency and fixture values. A name, empty invoice list or organisation copied from the request is insufficient. If the necessary fixture does not exist, mark NOT ASSESSED and request separate fixture provisioning; do not create it under read-only authority.

Retain safe request paths, timestamps/correlation, expected/actual identity, result classification and cleanup scope without raw credentials or customer payloads. Unavailable/malformed responses and missing identity remain inconclusive. Do not repeat broad cross-organisation OAuth experiments merely to rediscover the confirmed model. Any provider-boundary diagnostic must be narrowly justified and separately approved; application cross-business denials must remain proven even if provider access is broad. No grant issuance, save, enable, sync or revocation is authorised by this report.

## Necessary bounded corrections and next action

1. Adopt this provider-model addendum and dedicated-identity preference; retain prior support correspondence and test evidence. The live tracker currently still says await the reply. Proposed append-only reconciliation: record 23 October response and change the pending item to TEST identity-verification design/approval, while keeping T19 In progress and activation NO-GO. No spreadsheet edit is made under the prior approval for different corrections.
2. Before a real adapter is connected, reject reserved organisation query overrides, require complete expected profile identity, and integrate the established generation/vault/dispatch contracts. Propose these as a separate bounded implementation; do not rebuild Stage B or silently expand this review into live onboarding.
3. **Exact next T19 action:** review and approve the TEST-only read-only identity-verification manifest described above, including named dedicated identities, expected org IDs, pre-existing synthetic fixture IDs, scopes and approved lifecycle/cleanup. Prepare missing safe fixture references without OAuth retry. Execute only after the required security/CI and Stage C approval gates are satisfied.

Provider guidance is sufficient to stop waiting for clarification of the basic OAuth model. It is not sufficient to mark T19 Done: business totals reconciliation, visible failures, real identity evidence, hosted session/RLS, production credential lifecycle and later accounting acceptance remain separate gates.

GitGuardian and hosted CI remain required. PR102's recorded final scanner failure and owner decision declining incident suppression are preserved; billing-blocked jobs are not passes. No new scanner/CI PASS is asserted. PRs remain unmerged, financial activation NO-GO, and T04 untouched.

## Current verification results

On this review branch (unchanged runtime from a028fe62), Node24.14.1:

- Primary focused adapter/setup/invoice suite: **45/45 PASS**, zero failures/skips (`focused-tests.txt`).
- Independent QA reran the focused suite: **45/45 PASS**, zero failures/skips.
- Independent native Stage B suite: **26/26 PASS**, zero failures/skips; PostgreSQL17.10; acceptance and disposable-cluster cleanup markers confirmed.

The independent review and logs are linked from [QA evidence](evidence/t19-provider-confirmation/). Initial restricted-environment failures are recorded by QA and are not overwritten by these successful permitted reruns. No full-suite, hosted CI, scanner or live-provider check was run in this review. Verdict remains bounded model/control PASS; full T19 acceptance NO-GO.
