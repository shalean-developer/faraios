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
