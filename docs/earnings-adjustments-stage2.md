# T04 Stage 2 — linked earnings adjustments

Started 22 October 2026 under the owner's instruction, following Stage 1 synthetic staging acceptance (reviewed 1e0fbe, PR #98). Scope: approved ADJ01, T04 Decisions row 60. PAY03 monthly settlement execution remains Stage 3. Receipts and worker-pay applicability remain activation checks, not synthetic-development blockers.

## Implemented candidate

The immutable review core (`src/earnings-adjustments.js`) is now connected to a synthetic-only persisted journal, authenticated HTTP route and review screen (`src/adjustment-reviews.js`). The additive migration is 20261022105001. It neither posts earnings nor modifies booking, invoice, accounting, allowance or paid statuses. No bank/provider API is called. There is no real financial activation switch in this module.

Each synthetic source links to a booking and an actively assigned cleaner, with original amount/version/period and evidence. This is a review snapshot, not an authoritative earnings ledger or evidence of accepted real worker terms. Migration creates no sources and enables no actual business policy. Synthetic sources cannot become real liabilities by changing a flag.

Owners/managers register sources and prepare corrections. Only owners approve, reject, resolve disputes, freeze reviewed corrections and record correction-only simulations. Staff may read their own sources and request review; another worker's source is unavailable. HTTP rechecks trusted membership/identity; RLS limits reads; only the bounded private writer persists changes. Customer/anonymous access and restore-workspace writes are denied.

Supported reasons: verified calculation corrections, reimbursements and additional agreed work under approved rules. Reduction approval needs lawful-basis, specific applicable-agreement, fair-process and full-entitlement review evidence. Additional-work preparation/approval requires rule/cap evidence, without inventing a new rate. Evidence input records a review; software cannot determine legal/pay applicability merely from a checked statement. Fines, damage deductions, customer nonpayment reductions, refund clawbacks and automatic recovery are unsupported.

Original snapshots and rejected proposals remain preserved. Replacement proposals link explicitly to the rejected item. Source revisions prevent stale competing approval. Source-row locking, exact optimistic version, canonical IDs, bounded typed JSON and complete idempotent replay matching protect the journal. Histories reconstruct through the same pure core; missing/scope-mismatched histories fail closed.

Worker disputes remove only that correction from the eligible review path. Resolution requires renewed freeze. A review freeze is distinct from Stage 3's monthly statement freeze. Simulations require approved/undisputed/frozen state and the exact delta; they never include the original paid amount. R2,500 original plus missed R50 reimbursement permits only R50 simulation, neverR2,550 or a duplicate. This records no actual clearing/allocation or timely payment.

## Validation and acceptance map

| Criterion | Evidence | Status |
|---|---|---|
| Original/link/version preservation; correction-only amounts | Core and PGlite reconstruction tests | Local pass |
| Manager/owner/staff/customer boundaries; fresh roles; origin/body limits; restore denial | HTTP tests and direct PostgreSQL grants/RLS tests | Local pass |
| Typed inputs, Unicode blanks, immutable client history, replay and stale writes | Core/database adverse tests | Local pass |
| Competing simulations serialize | Native PostgreSQL test added to `availability-concurrency.test.js` | CI pass (run 39766529707); locally skipped without disposable native DB |
| Hosted schema and rollback-only acceptance |13 checks on FaraiOS staging; original 18 fingerprints unchanged | Pass, delivery verification |
| Retained synthetic records | Final cleanup: 0 sources/items/events, QA business removed, original 18 fingerprints unchanged | Readback pass |
| Desktop and authenticated worker path | Owner, fresh manager and own-worker flows; cross-worker denial; dispute/resolve/refreeze; R50-only simulation | Delivery browser checks pass |
| Narrow-screen interaction | 375px visual and R20 correction-only simulation; scroll width 375px | Delivery browser checks pass |
| Independent final review | `docs/evidence/stage2-independent-qa-478076.md`; exact-head CI 39769866051 passed all three jobs | PASS for synthetic staging scope; owner decision separate |

Evidence: `docs/evidence/stage2-staging-20261022.json`; reproducible rollback-only script `scripts/verify-adjustments-staging.sql`. No new security findings; existing advisories remain. Seven new indexes are expected to be unused while journal tables are empty.

## Browser delivery acceptance

Desktop and 375px checks completed against the candidate. The disposable QA business exercised R50 correction-only simulation, missing-input/error retention, unsupported reductions, fresh manager role denial, own-worker review and cross-worker denial. A second source exercised dispute, resolution, renewed freeze and R20 simulation at 375px. Original snapshots remained unchanged. All fixtures were removed; the 18 original data-group counts/hashes match the pre-test baseline. Screenshots and results are in `docs/evidence/stage2-browser-20261022.json` and the adjacent `stage2-mobile-*.png` files. Independent QA PASS is recorded in `docs/evidence/stage2-independent-qa-478076.md`; owner acceptance remains a separate decision.

## Recovery and scope limits

Revert the candidate application to hide these routes while retaining additive review history. Do not drop audit history to undo an approved correction; prepare a linked correction under the same controls. No existing source data is rewritten by deployment. Before use elsewhere, verify schema/version/roles and original-data baseline rather than assuming the staging population applies.

Stage 2 implementation and delivery staging tests are complete, with independent QA PASS for the synthetic review scope. Owner acceptance has not yet been recorded. T04 remains In progress, pilots 0/4, allowances Off and financial workflows inactive. Actual ledger/import integration and real settlement/clearing remain separate future gates; actual agreements, full pay and costs need verification before activation. PR #99 is stacked on PR #98 and is ready for owner review; no merge or financial activation is authorised by QA.

## Browser progress, 22 October 2026

See `docs/evidence/stage2-browser-20261022.json`. Desktop correction and worker-review checks passed. A worker dispute removed the freeze; resolving it required a new freeze before simulation became available. The temporary test membership is restored to owner. The 375px visual and correction-only simulation checks passed. The two synthetic sources, three correction items and disposable QA business were removed. All 18 original data groups match their pre-test counts and hashes. No actual transfer or pay-status change occurred.

## Independent QA handoff

Separate reviewer `/root/stage2_qa` issued PASS against remote `478076ccbcced2b6018240a2ba0416051cfe10f3`, tree `559845458eb2eafff5daa404dc45395f58e3ce23`. The reviewer independently reproduced the suite and direct database adverse cases, verified hosted writer identity and cleanup, and corroborated all 18 original fingerprints. Exact-head CI 39769866051 passed 317 tests without skips. No material findings or conditions. This is an assurance recommendation, with owner acceptance still separate. Stage 3 monthly settlement controls are next and have not started.
