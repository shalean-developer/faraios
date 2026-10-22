# T04 Stage 2 — linked earnings adjustments

Started 22 October 2026 under the owner's instruction. Scope source: approved
ADJ01, T04 Decisions row 60 of the Build Plan and Progress Tracker, and the
owner's direction to begin after Stage 1 synthetic staging acceptance. PAY03
monthly settlement controls remain the following stage. Actual receipt and
worker-pay applicability evidence remain activation checks.

## First increment

`src/earnings-adjustments.js` is an isolated review/simulation core. It is not
connected to a route, database, earnings ledger or bank. Every result retains
`execution: disabled`; simulated settlement is not a paid status or clearing
evidence. Fresh authorization and source-record verification will be required
independently at HTTP and database boundaries before this becomes a persistent
staging workflow. Unit checks alone do not prove those boundaries.

FaraiOS currently has earnings-rule setup/previews and cancellation assessment
records; it does not have an activated worker earnings ledger. This increment
therefore uses explicitly supplied synthetic source snapshots with original
booking, worker, version, period, amount and evidence references. Registration
is not evidence that a real agreement is accepted or that pay has accrued.
Real source import and payment reconciliation are not introduced here.

The core records linked proposals, owner decisions, worker review requests,
dispute resolution, reviewed freezes and correction-only simulation. It keeps
the original snapshot and rejected proposals. Replacements explicitly link to
the last rejected proposal for the same occurrence. An approved source revision
makes an earlier competing proposal stale. UUIDs use canonical spelling for
lookup/replay, events compare complete details, and output is immutable.

Supported reasons are verified calculation corrections, reimbursements and
additional agreed work under approved earnings rules. The core does not invent
an additional-work rate or bypass its rule/cap: preparation and approval require
the corresponding evidence. That evidence is a review record, not independent
legal/pay verification. Negative correction approval also requires lawful basis,
required agreement, fair process and full entitlement review evidence. Fines,
damage deductions, nonpayment reductions, refund clawbacks and automatic
overpayment recovery are unsupported.

One worker's dispute removes only that adjustment from the review preview.
Resolution requires renewed freeze. Positive corrections and reviewed reductions
are shown separately, never silently netted across workers. Frozen source
earnings are not rewritten. The R2,500-paid plus R50-reimbursement example shows
R50 only; an attempt to simulate R2,550 or repeat the simulation is rejected.
No actual due-date compliance or settlement is claimed.

## Acceptance map

| ADJ01 requirement | First increment evidence | Remaining before Stage 2 acceptance |
|---|---|---|
| Original record/version preserved; correction linked | Immutable source, booking/worker/version/period links; tests | Trusted persisted source identity and import boundary |
| Manager prepares; owner approves | Core role-denial tests | Fresh authenticated HTTP authorization and direct-RPC denial tests |
| No automatic punitive reductions | Allowed reasons; negative evidence safeguards; tests | Persistent validation matching core schema, current worker agreement checks at activation |
| Worker review/dispute; other positive amounts continue | Own-worker review checks and separate eligible rows | Authenticated own-record endpoint and UI; no disclosure of others' records |
| Audit, original/new amount and explicit replacement | Append-only core events, optimistic version and replay tests | Durable journal, RLS, row locking and concurrent save tests |
| Changes after freeze require renewed review | New correction records; dispute invalidates freeze | Persistent frozen-review version enforcement; monthly freeze controls in Stage 3 |
| Settle only missed correction, never paid original | Correction-only simulation and duplicate protection tests | Stage 3 actual settlement reconciliation/clearing and duplicate-settlement integration |
| Synthetic staging acceptance | Eight core scenarios passed locally | Database migration tests, API/UI, hosted rollback-only checks, desktop/narrow-screen verification and separate QA |

## Next implementation work

1. Add business-scoped source snapshots and adjustment-event persistence. Keep
   manual/synthetic evidence distinct from verified imported earnings. Enforce
   the same types, UUID grammar, text/date bounds, transitions and replay rules
   at the trusted writer. Require explicit per-business configuration; enable
   no real business by migration.
2. Add the authenticated staging review screen, source/booking/worker links,
   history, owner approvals and clearly labelled simulation previews. Preserve
   blanks on errors and use unique label/control associations.
3. Test direct API/RPC denial, journal reconstruction, stale writes, parallel
   approval/simulation, disputed/zero/positive workers and correction-only
   carry-forward. Recheck the exact final source through separate QA.

Stage 2 is **In progress**, not accepted. Stage 1's reviewed implementation is
1e0fbe (PR #98); this is a stacked branch so it does not reimplement that stage.
T04 stays In progress, pilots 0/4, allowances Off, financial workflows inactive.
No source agreement, real earnings, database, provider, payment or production
record is changed by this first increment.
