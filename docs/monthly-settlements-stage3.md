# T04 Stage 3 — monthly settlement controls

22 October 2026. Owner instructed “Go ahead” after independent Stage 2 PASS and the proposed Stage 3 scope. Stage 2 synthetic acceptance is recorded separately in `earnings-adjustments-stage2.md`. Requirements: approved PAY03, T04 Decisions row 61 in the supplied Build Plan and Progress Tracker; ADJ01 row 60 for linked corrections. No live Shalean, Bokkie or restore-workspace write is authorised.

## Implemented candidate

`/monthly-settlements` provides a persisted, synthetic-only review journal. Owners/managers prepare one statement per cleaner/business/closed Johannesburg calendar month. Unknown amounts stay blank and cannot create an amount-bearing line. The database independently checks business membership, own-worker access and role, typed bounded inputs, optimistic version and exact actor/role/payload replay. Clients have SELECT only under RLS. The private bounded writer owns changes and appends immutable actor/time events. Restore workspaces reject writes.

Separate lines preserve visit earnings, company-funded cancellation protection, conditional customer-cancellation pools, reimbursements and approved Stage 2 correction deltas. Completed/cancelled booking scope and worker assignment are checked for booking categories. Manual synthetic amounts, prior-cleared declarations, source evidence and original period remain review snapshots, not real accrual or proof of actual pay. Collection evidence can transition a pending pool to collected; that invalidates freeze/approval and permits only the newly outstanding amount after renewed review. Uncollected pools are excluded, without being converted into company-funded protection.

Statements cannot be prepared for the current or a future month. The target is the fifth calendar day after month end, backed up over weekends and explicitly reviewed non-banking dates. A supplied earlier applicable deadline takes priority. Banking-calendar and earlier-deadline evidence are explicit synthetic inputs; software does not invent public-holiday calendars, contractual terms or legal applicability. Review/approval must happen early enough for clearing; the target is available funds, not submission timing or a legal-payday certification.

Owner freeze records the undisputed eligible total and versions of linked correction sources. Owner approval records reviewed payment-details evidence. Changes to lines, worker disputes or collected-pool state invalidate the freeze/approval. Linked Stage 2 changes prevent submission until a new monthly freeze/approval. Disputed lines and pending pools are excluded while other undisputed amounts remain eligible. A resolved dispute requires a renewed freeze; originals are never overwritten.

A global source-occurrence claim prevents a source being included across monthly statements. Stage 2 correction claims bind the exact approved, frozen, undisputed, unsimulated delta and original worker/period. A database column/trigger prevents an independently claimed correction being simulated again through Stage 2. Row writes serialize claims against Stage 2 simulation, including stale-snapshot transactions. The original R2,500 is never included when the only remaining correction is R50.

Only the exact outstanding statement amount can enter a synthetic submitted attempt. Submitted/unknown transfers block another attempt. Reconciliation requires explicit bank-clearing and allocation evidence and non-decreasing verified cleared cents. Partial never becomes full clearing; an uncertain remainder continues to block retry. A verified failed remainder allows only the remaining balance, preserving the prior cleared allocation. Resolved attempts are immutable. Cleaner statement/reference provision is recorded as evidence; no message or file is sent automatically.

The module has `execution: disabled` and a non-removable synthetic-only table constraint. It calls no bank/provider, posts no earnings, changes no actual paid status and enables no business financial policy or allowance. These controls are not an actual payroll/settlement ledger and cannot be activated by changing a flag.

## Validation map

| Criterion | Evidence | Status |
|---|---|---|
| Closed period, fifth/preceding banking day and earlier deadline | Direct PGlite and hosted rollback tests | Delivery pass |
| Role, tenant/worker isolation, fresh-role, CSRF/body/restore denial | Database and HTTP adverse tests | Delivery pass |
| Freeze/approval, disputes, version/replay and originals | Database tests and hosted checks | Delivery pass |
| Correction-only/global claim/Stage 2 guard and changed-source invalidation | Direct database tests | Delivery pass |
| Partial/unknown/failed/cleared and exact outstanding retries | Database, summary/renderer and hosted tests | Delivery pass |
| Competing submissions and Stage 2 claim contention at READ COMMITTED / REPEATABLE READ | Earlier implementation CI 39772984923 passed; allocation candidate run39794334515 queued | Current candidate NOT VERIFIED |
| Full local regression | Allocation candidate:328 discovered;327 passed;0 failed;one native-DB skip | Delivery pass; exact-candidate native CI required |
| Hosted rollback-only checks | 16 checks; 18 original data-group counts/hashes unchanged; 0 statements/events/claims retained | Delivery pass |
| Desktop actual app interactions | Earlier `stage3-browser-20261022.json`; changed per-line allocation form requires new checks | Current changed form NOT ASSESSED |
| 375px actual app interactions | Earlier layout/approval/submission verified; changed per-line allocation form requires new checks | Current changed form NOT ASSESSED |
| Independent QA and owner acceptance | Initial NO-GO preserved; allocation defect closed by independent reassessment, browser/CI gates remain | NO-GO pending evidence; owner acceptance pending |

Applied FaraiOS staging migrations: `20261022113714` (additive tables/writer/claim guard), `20261022113930` (reviewed later pool collection; replaces writer without rewriting data). Additional allocation migration `20261022141509` replaces the writer with per-line clearing controls. The draft is the assembled final schema; tests verify the migration chain produces its exact writer body. CLI telemetry was previously blocked in this environment, so migration files mirror actual versions returned by the connector, without retrying that CLI. Existing migration history is preserved.

Evidence: `docs/evidence/stage3-staging-20261022.json`; reproducible rollback-only script `scripts/verify-monthly-settlements-staging.sql`. Existing security advisories remain; there are no new security findings. Six new indexes are expected unused while review tables are empty.

## Acceptance handoff and recovery

Pull `feat/t04-monthly-settlement-controls` and restart the local staging app. Verify an evidence-labelled synthetic closed-month statement through prepare, freeze, owner approval, submit, unknown/partial reconciliation, remaining-balance retry and statement/reference evidence. Check blank inputs, staff own review, cross-worker denial, desktop and 375px layout. Remove disposable fixtures and compare original fingerprints. No actual bank/payment operation is part of acceptance.

Application rollback hides the review route while retaining additive audit data. Never erase an approved or cleared history to correct it. Claims protect sources from repetition; any future migration into a real ledger needs a separately reviewed mapping/reconciliation and must not reinterpret these synthetic records as liabilities. No production merge/release is included.

Stage 3 delivery browser checks are complete; independent QA and owner acceptance remain pending. CI passed for implementation acce96907637a3e5de9489bf6979fc7a6f9a2117. T04 remains In progress; pilots 0/4; allowances Off; financial workflows inactive. Actual costs, worker agreement acceptance, full pay/classification/tax applicability, actual accrual/imports and clearing evidence remain separate financial activation/T04 requirements.

22 October browser handoff: the local app tab was observed at `/login` after the restart. Sign-in is required before interactive acceptance. No persistent synthetic browser fixtures have been created.

## Browser progress, 22 October 2026

Desktop delivery checks passed at 1280px (document1265px): preparation/input retention, fresh-role denial, owner approval, excessive-amount denial, submitted/unknown/partial states, exact R20 remainder retry, total R50 clearing, statement-reference evidence, staff own-record isolation, dispute/resolution and renewed freeze. See `docs/evidence/stage3-browser-20261022.json` and `stage3-desktop-partial.png`. All 18 original groups match the baseline after excluding the disposable QA business. Two statements/two lines/eighteen events remain solely for the pending 375px check. The test membership is restored to owner. Fixture cleanup and a final complete baseline comparison remain required; no actual transfer occurred.

375px follow-up: layout fits at viewport/document width375; mobile review/approval and transfer forms visually inspected. Renewed owner approval saved through keyboard. Final submitted-simulation click could not be verified because browser input dispatch repeatedly timed out; direct read confirms own statement version8 with0transfers. Manual test-button click requested; this interaction is NOT ASSESSED and no mobile transfer success is claimed. Two QA statements now retain19events pending that interaction and cleanup. No actual transfer occurred.

## Final browser delivery evidence and cleanup

The owner clicked the final mobile submitted-simulation button once. Browser and independent database reads verified own statement version9 with one R30 submitted attempt, zero cleared cents and execution disabled. This closes the specific manual-interaction evidence gap above; no duplicate submission occurred. Viewport/document width375; readable mobile summary and form screenshots are adjacent to `stage3-browser-20261022.json`. All disposable data was then removed:0statements/events/claims and0QA businesses. A full, unfiltered fresh comparison confirms all18 original counts/hashes exactly match the pre-test baseline; active accounting0. Independent Stage3QA remains NOT ASSESSED. Earlier progress notes are chronological; this section supersedes their pending mobile/cleanup status.

### Independent QA allocation correction — 22 October 2026

The initial independent review of remote `5bf10fa` is NO-GO; preserve `docs/evidence/stage3-independent-qa-5bf10f.md`. Statement-level clearing could underpay an undisputed line when another partially cleared line was disputed.

Transfers now snapshot signed remaining amounts per line. Reconciliation requires explicit cumulative line allocations, matching the cleared total, bounded by the submission snapshot, without reducing prior allocations. Full clearing must cover the complete snapshot. Future submissions deduct only allocations belonging to eligible lines. Disputing a line preserves its clearing history; resolving it restores only its unpaid remainder. Legacy transfer records without allocation snapshots fail closed for manual review; no allocation history is invented. The reconciliation form accepts per-line currency amounts; blank amounts remain unspecified.

Additive staging migration `20261022141509_t04_per_line_settlement_allocations.sql` was applied through the Supabase connector (the previously blocked CLI telemetry route was not retried). The two earlier applied migrations remain immutable. The 16 rollback-only hosted checks pass and all 18 original group counts and hashes match the previous clean baseline. The new regression covers R100 A + R100 B, R50 cleared against A, dispute A, pay B R100, resolve A, leave only A R50 payable. Source review and formal reassessment remain pending; earlier screenshots do not validate the changed reconciliation form. Latest GitHub CI is separately blocked before execution by account billing/spending restrictions; no billing changes were made.

T04 remains In progress; pilots 0/4; allowances Off; financial workflows inactive.
