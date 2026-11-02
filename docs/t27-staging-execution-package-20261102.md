# T27 — single bounded staging execution package (PREPARED; NOT AUTHORIZED)
Date: 2 November 2026
PR: https://github.com/shalean-developer/faraios/pull/300
Source qualification head: reverify after this document commit, require all exact-head CI success and review.

## Scope and irreversible boundaries
Only the T27 operational overview/reporting feature. Staging only. Preserve T19–T26 and no T28. Never send external notifications, use payment providers, create Auth accounts, change credentials, write live finance, touch production, or use PostgreSQL port 5432. Do not fabricate consent. No new synthetic business data is proposed. Only read existing records.

## Execution only after specific owner approval
1. Verify exact current staging branch and Draft PR diff; review guarded SQL, SQL security definer search_path and permission checks; verify latest exact-head CI and native policy tests are successful, no skips falsely claimed.
2. Inspect Plesk subscription 738 / staging site 841; verify existing host, app root, Node 24, managed TLS, source fingerprint, notification dispatch disabled, payment TEST-only, accounting worker disabled, and scheduled-worker definition.
3. Capture fresh private source configuration/recovery checkpoint, without exposing credentials; preserve existing checkpoints, private config and scheduled tasks.
4. Capture per-business full-row digest/count baselines for bookings, membership, customers, quotes, invoices, T20 credits/intents, T21 receipts/allocations, T22 agreements/accruals, T23 statements/events/claims, T25 requests, T26 jobs/sink/events and T27 absence.
5. Apply **only** reviewed additive database/t27-operational-report-candidate.sql on the staging Supabase project xdmfyrsauvqznkloroxg via approved migration mechanism (no use of port 5432). Verify exact installed function hash, grants, invoker facade, private function, live-session and current-member checks.
6. Verify anonymous, missing login, staff-only, customer-only, suspended membership, Bokkie manager vs Shalean, forged direct business UUID, old/suspended account, and platform-only access denial. Verify owner/manager authorised single-business and combined requests. Run direct PostgREST HTTP/API/RLS and browser tests; do not infer from rendering alone.
7. Reconcile each selected local-date range and boundary against authoritative source rows; exclude Draft/cancelled booking value, verify invoices labelled internal draft, unverified issuance/outstanding shown 'Not verified', separately verified credits/EFT/allocations, synthetic earnings, approved reimbursement, payout cleared evidence. Test duplicate allocation/receipt/reconciliation, refresh/replay, DST/UTC conversion, expired sessions and failed T26 jobs without sending messages.
8. With all gates green and after owner execution approval, make PR ready/merge **staging only**, deploy/restart app at verified Plesk site841, preserve startup/worker configuration. No production changes.
9. Validate actual staging GET /reports and /dashboard links, desktop/mobile viewports, business selection, direct URL/api denial, both businesses, current membership changes. Check source fingerprint and all full-row hash/count baselines unchanged (read-only T27: expected 0 business data changes).
10. Produce exact runtime SHA, SQL function digest, CI run/job URLs, access matrices, screenshots, reconciliation table and rollback plan. Leave T27 In progress / completion blank pending explicit owner staging acceptance. T28 unchanged.

## Gate hold
This document does not authorise merge, migration or deployment. Source-only publication and CI were previously authorised. Actual staged changes require explicit owner approval for this concrete package. No environment action executed.
