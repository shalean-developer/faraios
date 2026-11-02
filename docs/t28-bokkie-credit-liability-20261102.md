# T28 — Bokkie credit liability aggregate 2026-11-02

Owner-executed read-only Supabase queries on `scsrxogumimsrtbnqeas`, results supplied in conversation.

## Credit balance snapshot
20 user_credits rows: 1 positive, 19 zero, 0 negative, 0 null. Sum(balance) = ZAR 64.75; positive-only sum = ZAR 64.75. This is a **recorded balance** pending validation of account identity and obligations, not an authorised liability release/settlement.

## Ledger aggregation
| Type | Status | Transactions | Total amount ZAR | Missing before/after | Magnitude mismatches |
|---|---|---:|---:|---:|---:|
| purchase | completed | 3 | 3100.00 | 0 | 0 |
| usage | completed | 6 | 3085.25 | 0 | 0 |

Assuming purchase credits and usage debits (not yet checked against row-level before/after direction), net ledger delta is +14.75. Difference from current aggregate balance 64.75 is +50.00. **Do not call this a proven accounting discrepancy:** transaction history may be incomplete, may start with opening credit, and balances are a current snapshot, not necessarily a roll-forward from zero. No customer identity or transaction identifiers were retrieved. The earlier magnitude-check passes do not prove sign/direction, temporal continuity, account attribution or amount semantics.

## Mandatory remaining read-only reconciliation
1. Direction check: aggregate number of completed purchases with (balance_after - balance_before) != amount and usages with (balance_before - balance_after) != amount, using numeric ROUND tolerance 0.01.
2. Source identity check: account-level reconciled last balance and transaction rows requires private owner-only review or *aggregated* orphan/variance counts; do not expose user_id or payment refs to chat.
3. Establish opening balances, source migration/credit creation paths, any non-ledger credits and provider payment status. Do not infer missing R50 requires an entry.
4. Preserve R64.75 in existing Bokkie source until an explicit owner-approved supported transition/settlement treatment is documented. No creation of credits, booking payments, or migration as part of T28.

Status: T28 mapping evidence, acceptance NOT READY. No production write performed.

## Direction check — owner-supplied 2 November 2026
Read-only completed-transaction aggregate: purchase_direction_mismatches **0**, usage_direction_mismatches **0**, transactions_with_prior_credit **8**, net_recorded_balance_change **+R14.75**. This establishes per-transaction arithmetic in the expected direction using the supplied query; it does **not** prove complete customer-by-customer chronological continuity or explain the R50 difference between current balances (R64.75) and listed ledger movement (+R14.75). A positive prior balance on eight transactions is compatible with prior credit, not proof of the original R50 source.

Next safe test must compare **per-user earliest ledger balance_before and latest balance_after** against current user_credits.balance, without returning user_id or other row identifiers. Reconcile users without transactions separately. Keep R64.75 protected and do not fabricate an adjustment.

## Closing-balance aggregate — owner-supplied 2 November 2026
20 credit accounts; 1 matched to completed ledger; 19 without completed ledger; sum of earliest ledger opening balances R0.00, latest closing balances R64.75; zero account closing-balance mismatches; balances on accounts without completed ledger R0.00. The recorded current R64.75 is consistent with the latest ledger snapshot. However completed-transaction net balance movement +R14.75 differs from latest closing minus first opening (+R64.75) by **R50.00**. This is a **sequence-continuity question**, not proof of liability overstatement or missing settlement. Next gate: independently inspect per-user chronological event-chain gap *counts and total*, without revealing user IDs. Same-timestamp ordering may make ordering ambiguous; do not mutate balances or invent R50 adjustment.
