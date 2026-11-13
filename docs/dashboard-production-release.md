# Dashboard production release — 13 November 2026

Owner reviewed the authenticated isolated preview and explicitly instructed Deploy. Release includes PR #13 dashboard plus a narrow follow-up migration enabling private manual enquiry intake for live/preview only when the existing enquiry ingress gate is enabled. Explicit owner/nonanonymous checks, field validation, idempotency, restricted grants and lack of direct DML remain unchanged. Existing accounts, records, public pages, homepage and waitlist must be preserved.

Final release test: native disposable PostgreSQL 17 + actual PHP intake successfully creates a live enquiry, retains idempotency, rejects invalid environment/foreign owners/anonymous callers, and rejects live intake when ingress is disabled. Hosted probes use preview rollback fixtures only; no fictional production records are authorized.

No notifications, Resend access, integrations, real money movement or waitlist webhook/recovery checks. Deployment/verification evidence will be appended after release. Rollback: restore PR #12 application; replace enquiry_private.manual_create with the preview-only implementation from migration 20261113143833 if manual intake must be disabled without affecting public enquiries. Retain all records and counters.

## Deployment checkpoint

PR #13 merged as f2a44d8ef30a80e687c711f88fd0f0f1f120137a after owner Deploy instruction. Final code head daaa54388ddc902576b5ddfdaf2c2512a19c4879: native release dashboard suite PASS; GitHub automatic code review completed with no findings. No GitHub Actions workflow or commit status was configured for this head; no paid CI run was introduced. The 17 targeted baseline tests had passed during preview, with dashboard rerun after the narrow release migration.

Connected Supabase fresh-project migration 20261113151114 applied successfully and source recorded. LF-normalized MD5 49df5d776fec73648e8647e511453f8f matches the committed file. Existing enquiry ingress was already enabled for both preview and live and was not changed. Hosted rollback-only preview probes PASS after release routine replacement. Production read-only reconciliation under the actual owner JWT identity/role PASS for today's non-Cancelled booking count, current issued invoice balances by currency and current-month net ledger payments. Script tests/dashboard-production-readonly.sql creates no fixtures and rolls back session context only.

Connected Plesk production faraios.git main Pull now completed, showing PR #13 merge and live-intake commit, with automatic deployment target /faraios.com. Public live /account/dashboard.php exists and redirects unauthenticated access to the existing sign-in page. Owner production session had expired; authenticated production UI verification is pending owner sign-in. Preview authenticated UI was already verified before deployment. Do not claim production browser figures/links checked until sign-in is completed. No fictional production records were created.

## Preservation readback

Before/after complete-row fingerprints across all environments (including retained preview fixtures) match exactly:

| Dataset | MD5 |
|---|---|
| Bookings | f3224f9f16037e720b4c24899cd1f713 |
| Quotes | e358e94c1321c50571767502a06d9dd4 |
| Invoices | a60cd29694001ef360146dead94ee6a9 |
| Payments | b08835474c167263fcde2fe36098fa36 |
| Staff | 0ac494aa9d2231454818de4b38717325 |
| Enquiries | abf18877a40d43b7acade932291bd027 |
| Businesses | f5a653038fdad35dce0892e83a637044 |

Accounts remain 3. Protected bookings 8EF88DF7, 14616616 and 10BBEB8F all Cancelled; invoices 56A668AE and 85EC16B3 both Void; live payment entries still net to zero. Staff rows/statuses unchanged, preserving labelled inactive test staff and active Farai Chitekedza. Shalean public page count remains 0. Homepage and waitlist source unchanged. No notifications, integrations, Resend access, waitlist webhook/recovery checks or real money movement.

Decision: PASS for approved application deployment and read-only database reconciliation. Authenticated production browser verification remains PENDING owner sign-in; leave this checkpoint open until observed.


## Authenticated production closeout — PASS

Owner signed in and replied Ready. Welcome → Dashboard verified on the live /account/ route under the owner's selected business (display name FaraiOS Preview Test Business; environment is live, not /_accounts-preview). Dashboard has no isolated-preview banner. Today 0, New enquiries 0, awaiting responses 0. November 2026 ZAR payments entered 276.90, reversals 276.90, net recorded payments 0.00, outstanding 0.00, overdue 0.00; Unpaid/Part Paid/Overdue counts all 0. Retained cancelled/void production test history therefore does not inflate active totals. Preview-only booking/enquiry/invoice fixtures do not appear in live counts or totals.

All four create links opened their correct forms: private enquiry, quote draft, new booking, invoice draft. No form was saved, no real or fictional production record was created, and no notification sent. October selection produced gross/reversals/net all 0 with current outstanding still 0; returned to November. Desktop at 1280 pixels had document width 1265, no horizontal overflow. Saved full-page production screenshot: docs/evidence/dashboard-production.png. Mobile layout was verified in the approved preview; this closeout does not add a new mobile-device claim.

Repeated connected database preservation query after UI checks returned all seven complete-row fingerprints unchanged, accounts 3, protected Cancelled bookings 3, protected Void invoices 2, live payment net 0, Shalean live published pages 0. Staff statuses remain unchanged. No production fixture or additional schema/application change was needed for closeout.

The earlier pending-sign-in checkpoint is now closed. Decision: PASS — Dashboard and Business Overview deployed and authenticated production read-only verification complete. New live manual enquiry write was proven in the disposable release suite and hosted preview; no production write test was attempted without permission to create production records. Existing workflow forms remain intact.
