# T04 Stage 1 independent technical QA

## 1. Document control

QA-T04-S1-20261022, version 1, ISSUED 22 October 2026, evidence cutoff 10:09 UTC. Reviewer: separately delegated QA agent `/root/stage1_qa`. Delivery owner: implementing agent `/root`. Repository: `shalean-developer/faraios`, PR #98. No implementation or hosted records were changed during review.

## 2. Executive assurance summary

**QA outcome: NO-GO for Stage 1 staging acceptance at bf402ac548835887cb24bb7eba049b4e4394ec82.** Two independently reproduced database-boundary defects remain despite green CI: mixed-case refund IDs bypass the submitted-money release protection, and a reschedule without a replacement start can be durably stored. Remediate and independently reassess before closing Stage 1 or beginning linked earnings adjustments.

## 3. Scope and context

Gate: technical Stage 1 cancellation/refund review and simulated workflow acceptance in FaraiOS staging. Includes pure rules, HTTP authorization, journal reconstruction, public RPC/database enforcement, booking guard, test coverage and evidence readback. Excludes production deployment, real refund execution, legal interpretation, worker classification/pay applicability, financial activation, cost-pilot completion and Stage 2 implementation.

## 4. Authority and independence

The user explicitly authorized a separate QA agent on 22 October. This reviewer did not implement or remediate the candidate. Inherited delivery statements were treated as assertions to assess, not independent proof. This is an independently performed AI technical review, not a human audit, legal determination or organizational approval. The owner retains the gate decision. No subdelegation, external review posting, financial actions or hosted mutations occurred.

## 5. Applicable sources

`AGENTS.md`, `docs/blueprint.md` (business/role/isolation contracts), `docs/cancellation-refunds-stage1.md` (CANCEL01–03 implementation boundary), the user's Stage 1/staging-only instructions, and the QA skill plus its `deliverables-and-gates.md` reference. The underlying tracker approval is represented in repository documentation/conversation; this review does not independently validate legal suitability of the commercial policy. Actual receipts and worker-pay applicability remain activation checks and are not reasons for this NO-GO.

## 6. Method and criteria

Verified exact artifact identity using local Git tree and remote commit tree; inspected the full PR comparison and relevant rules, SQL, persistence, HTTP tests and evidence. Re-ran syntax checks and all 19 cancellation-specific tests. Added no implementation code; ran a disposable PGlite diagnostic using the final SQL to exercise direct authenticated RPC calls outside the HTTP client. Criteria included tenant/role boundaries, evidence completeness, immutable/versioned events, replay equivalence, no over-refund, submitted money remaining reserved, and accepted replacement date/price requirements.

## 7. Evidence and provenance

- Remote bf402ac tree `e848a5bb2c2584e6b43aece5d2df5991e7ef3ba8` exactly equals local HEAD 84b6d7e tree. Git ancestry differs; reviewed file content is identical.
- GitHub runs 39759977049 and 39759969603 independently retrieved: both completed/success on bf402ac.
- GitHub submitted-review list independently retrieved: empty. This separate assessment is not a submitted GitHub review.
- `npm run check`: passed. `node --test test/cancellation-review.test.js test/cancellation-cases.test.js test/cancellation-http.test.js`: 19 passed, zero skipped/failed.
- Diagnostic source: `/tmp/stage1-qa-probe.mjs`; output reproduced both defects. It creates/closes a disposable local PGlite database and makes no network calls or hosted changes.
- Delivery evidence: `stage1-staging-20261022.json`, `stage1-browser-20261022.json`, desktop and 375px images, the rollback-only hosted script and pre-migration validator. Hosted execution/cleanup and browser interactions were not repeated by this reviewer; their committed records are delivery evidence. This limitation does not weaken the independently reproduced blocking findings.

## 8. Traceability and coverage

| Criterion | Reviewed evidence | Assessment |
|---|---|---|
| Fee ceiling, 24h boundary, collected pool, company tiers | Pure rules and tests | Tests pass; no blocking arithmetic finding identified |
| Tenant and fresh role enforcement | HTTP code/tests, SQL memberships and RLS | Reviewed; tests pass |
| Event immutability, expected versions and replay | Private writer, journal reconstruction, PostgreSQL tests | Reviewed; normal-case tests pass |
| No over-reservation / uncertain money protection | SQL and adversarial direct RPC | **Fails QA-S1-01** |
| Accepted replacement date and price | Pure rules versus SQL direct RPC | **Fails QA-S1-02** |
| Desktop/mobile and cleanup/original fingerprints | Delivery evidence and screenshots | Recorded by delivery; not independently re-executed here |
| No financial execution | Call paths and module boundaries | No provider operation identified in candidate |
| Actual receipts, accepted worker agreements, completed pilots | Explicitly outside this implementation gate | Activation obligations remain open |

## 9. Assurance dimensions

Version identity and CI provenance are established. Normal-path functional, HTTP and PostgreSQL checks pass. Database state-integrity and required-evidence enforcement fail under authenticated direct RPC. Security authorization alone is insufficient because authorized owners/managers can submit payloads directly to the public RPC; the database must protect these invariants independently of the staging HTTP client.

## 10. Findings

### QA-S1-01 — High: mixed-case refund reference releases submitted money

**Evidence:** `database/cancellation-review-draft.sql` lines 118 and 121–125, identically in `supabase/migrations/20261022090011_t04_cancellation_reviews.sql`. The reservation lookup casts `refundId` to UUID, accepting upper-case hexadecimal. Subsequent refund status/release accounting compare raw JSON text to the canonical lowercase UUID string.

**Reproduction:** prepare a valid R1000 refundable cancellation and approve it; reserve R1000 with event key `20000000-0000-4000-8000-0000000000ab`; submit using payload `refundId: "20000000-0000-4000-8000-0000000000AB"`; release using the lowercase reference; reserve another R1000. Every RPC succeeded in the diagnostic. The submitted event is missed by the case-sensitive status query; the lowercase release frees the original reservation, allowing a second full reservation.

**Impact:** violates the explicit invariant that submitted/uncertain money remains reserved, and can record duplicate refundable exposure. The JS reader also cannot replay the uppercase reference (`src/cancellation-review.js` line 123 uses strict string equality), making the case unreadable. No money was sent in this review or by this staging module.

**Required closure:** normalize or reject UUID payload representations consistently at the trusted writer and replay boundaries; use typed/canonical comparisons for reservation states and accounting. Add direct PostgreSQL tests with upper/lower/mixed-case IDs showing a submitted reservation can neither release nor be reserved again, and that accepted histories reconstruct successfully. Preserve exact idempotency semantics. Owner: Engineering; due before Stage 1 acceptance.

### QA-S1-02 — Medium: missing replacement start is persisted

**Evidence:** SQL line 88, identically in the migration. `(p_payload->>'newStart')::timestamptz <= ...` returns NULL when the property is absent. With the other replacement fields valid, the `IF` condition is NULL rather than true, so the RPC persists an invalid reschedule assessment.

**Reproduction:** prepare with `action: "reschedule"`, `newDateAccepted: true`, a valid `newAgreedTotalCents` and `newAgreementEvidence`, but omit `newStart`. The authenticated direct RPC succeeded and created a durable case. `src/cancellation-review.js` line 80 then requires a valid zoned timestamp, so journal reconstruction rejects it.

**Impact:** required replacement agreement evidence can be absent from durable records; the original-slot uniqueness constraint prevents normal preparation of a replacement case, and fail-closed rendering makes the poisoned case unavailable through the app. Direct owner approval does not revalidate the original payload.

**Required closure:** explicitly reject missing/null/non-string/non-zoned/invalid replacement timestamps in the database, consistent with the pure rule contract. Add direct-RPC negative tests and demonstrate no case/event is retained after rejection. Audit adjacent JSON field-type/NULL and UUID-normalization checks for the same validation/reconstruction mismatch. Owner: Engineering; due before Stage 1 acceptance.

## 11. Risks, exceptions and residual exposure

Both defects are confined to staging simulations at present, but accepting their state model as the basis for Stage 2 would carry faulty reservations and durable evidence forward. Do not activate policies or connect payment execution. The existing limits—no production release, no provider refund, no posted earnings, allowances Off—remain. No override was requested or recorded by this reviewer.

## 12. Corrective actions and closure evidence

Engineering must repair QA-S1-01 and QA-S1-02 in a bounded follow-up, keep draft/migration definitions aligned, add targeted direct-RPC regression coverage, run final relevant CI and verify the additive staging correction. Preserve original-record fingerprints and cleanup any synthetic fixtures. Return the exact final candidate SHA and evidence to a separate reviewer. This reviewer must verify the fixes and withdraw/supersede this opinion before Stage 1 closure.

## 13. Options and recommendation

Recommended: remediate both confirmed defects together, repeat focused and required CI checks once on the resulting final candidate, and independently reassess. No additional broad review or unrelated feature work is required by these findings. Actual receipts/pilot jobs do not delay that remediation. Do not begin Stage 2 while these Stage 1 invariants fail.

## 14. Outcome and validity

**NO-GO**, precisely for technical Stage 1 staging acceptance of bf402ac at the above evidence cutoff. This is a completed independent technical review with confirmed defects, not an absence-of-review status. Valid until superseded by a review of the corrected candidate. Any code, SQL, policy, permission, payment integration or evidence change requires appropriate reassessment. It is not a production or business approval decision.

## 15. Governance decision and handover

Root/delivery receives the report and diagnostic source. The user/authorized owner retains acceptance and override authority. No Stage 1 closure, Stage 2 progression, merge, live deployment or financial activation is approved by this report. T04 stays In progress; pilots remain 0/4.

## 16. Evidence index

PR #98; remote bf402ac commit/tree; final CI runs listed above; local check/test logs `/tmp/stage1-qa-check.log` and `/tmp/stage1-qa-tests.log`; disposable repro `/tmp/stage1-qa-probe.mjs`; reviewed source and committed delivery evidence listed in sections 7–10. No source remediation was performed by this reviewer.
