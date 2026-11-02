# T29 — Owner-approved fresh-start scope amendment (2026-11-02)

Owner expressly answered **“Yes Approved”** to replacing the T29 historical database-import approach with a fresh-start and controlled-transition approach for BOTH Shalean and Bokkie, subject to canonical tracker amendment and preservation of existing obligations. This supersedes earlier plans to restore/clone Shalean's physical backup for the T29 migration rehearsal, without deleting earlier evidence.

## Revised T29 scope
Prepare and verify the existing FaraiOS V1 shared schema as the target for **new future activity** for two strictly separated businesses; do not import either legacy production database as the T29 requirement. Retain both original databases, websites, customer histories, invoices, storage and financial evidence as source-authoritative during the transition. Preserve current Shalean recurring scheduler (13 active schedules/85 future linked visits), existing financial settlements, held Paystack transaction and unresolved Auth↔CRM relationship. Preserve Bokkie historical credit liabilities (20 accounts; R64.75 positive; unresolved R50 ledger gap), five historical recurrence groups with 13 grouped and one ungrouped booking, large quotes and blog-images. Source data may not be deleted, stranded or declared settled.

## Revised evidence/acceptance gates
1. Source immutability and existing obligations inventory verified for each business. No claim of historical migration or backed-up history.
2. Existing V1 tenant schema can provision Shalean/Bokkie independently in isolated disposable tests; verify authenticated RLS/API denial both directions, authorisation from server-side memberships and private storage boundary.
3. Rehearse representative *synthetic* first-new-customer / booking / invoice-state / future-service workflows as applicable without provider events, notifications, payouts, refunds, dual billing or recurring generation. Never fabricate paid state.
4. Record no-live-effects controls: no production code changes, no DNS or route switch, no new authoritative writer, no history rewrite, no copied private data.
5. Document business-by-business and flow-by-flow future cutover prerequisites: owner approval per route, reconciliation and historical retrieval arrangements, a single scheduler and payment writer, rollback/monitoring and protection of active obligations.
6. Consolidate run-bound test/CI/recovery evidence and obtain explicit owner T29 staging acceptance before Done.

## Explicitly superseded
Historical full-copy import and count/financial-total/future-bookings match **as T29's staged rehearsal** are replaced by fresh-start isolation and new-flow continuity checks. They remain required **future cutover prerequisites** wherever actual historical records or obligations need transfer, but must not be claimed performed or passed.

The earlier owner-authorised **USD 9.68/month Shalean clone cost was approved in principle only and is not needed for this revised T29 route.** No new clone project was created; do not proceed with Supabase 'Continue' or incur the expense. Do not touch existing T07 restore-test records.

## Governance
T28 remains Done (mapping-only acceptance); this amendment changes T29's execution acceptance **prospectively** and does not retroactively invalidate T28. T29 remains In progress. PR #306 Draft pending implementation/testing and later owner staging acceptance. T30 remains Not started. No source mutation, deploy, imported customer data, financial activity or production switch authorised.
