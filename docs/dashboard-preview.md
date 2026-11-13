# Dashboard and business overview — 13 November 2026

Scope authorized by owner: Dashboard preview only on FaraiOS New, fresh project rxelmugnucfajrqmphhe. Base PR #12 merge 5c9f8213f515e9104fc6723a733c5262419c0148; production closeout on docs/invoices-release-20261113 independently read. Connected Plesk confirms main deployed automatically to /faraios.com; accounts preview is separately manual-deployed to /faraios.com/_accounts-preview. No production application deployment is authorized.

## Smallest complete implementation and definitions

Welcome → Dashboard; retain the existing account welcome and every existing workflow. One security-invoker STABLE RPC reads one consistent PostgreSQL snapshot under owner RLS with an explicit nonanonymous owner check. No service keys, new integrations, notifications, Resend access, online payments, accounting, or waitlist webhook/recovery checks.

- Today: non-Cancelled bookings whose half-open [start,end) interval overlaps the current business-local day, including carryover and Completed bookings. Each booking counts once irrespective of staff count. Show up to eight in start order with saved assignments, including inactive historical names. Count covers all rows; calendar link exposes the existing schedule (which groups by start date).
- New enquiries: current status New, across all dates. Awaiting responses: status Sent and expiry >= current business-local date; Draft, Accepted, Declined and expired quotes excluded.
- Unpaid and Part Paid: mutually exclusive current issued invoice statuses, each counted once. Overdue is a subset of these with due_on < business-local today; do not add this count to the others.
- Outstanding now: sum positive issued invoice balances across all dates. Draft, Paid and Void excluded. Invoice status/balance uses the existing append-only ledger, subtracting reversals. Invoice balances aggregate before any booking/staff joins.
- Payment month: first through last calendar date of selected month, using ledger paid_on dates. Gross original payments minus reversal entries equals net recorded payments. Existing reversal contract preserves original paid_on, so correcting an old payment restates that original month, not the correction-entry month. Both originals and reversals retained, including zero-net void history. These figures are neither bank reconciliation, revenue nor cash runway.
- Currency: business catalogue draft currency (existing system default ZAR), plus each distinct historical invoice currency. Never sum or convert currencies. Integer ledger units match existing invoice/quote storage and money formatting, including zero-decimal currencies.
- Detail lists are bounded (8 bookings, 5 invoices); aggregate totals are not subject to PostgREST row limits. Data failures show an error and no misleading zero summaries. As-of time and refresh link expose snapshot freshness.

Quick links open the existing quote/booking/invoice forms. Existing enquiries only had public-page intake. A minimal new private owner form records phone/message requests without publishing a page or sending notifications. Idempotent submission UUIDs, bounded validation, private definer implementation with fixed search_path, explicit ownership and no direct DML grant. The manual write routine accepts **preview only** until a separately approved production release enables live intake. No pre-existing records are changed by dashboard reads.

## Validation

Native disposable PostgreSQL 17 + real PHP HTTP: PASS snapshot arithmetic, 33 bookings versus 8 displayed, two staff versus one booking, all invoice states, multiple currencies, paid/draft/void exclusions, overdue versus due-today, monthly first/last boundaries, payments/reversals and corrected past-month totals, business midnight versus UTC, overnight carryover, end-at-midnight exclusion, 23-hour and 25-hour DST days, explicit owner/other-business/anonymous/invalid-environment denial, private manual intake idempotency and conflicting reuse, denied live manual intake, no direct enquiry INSERT, rendered links, invalid month fail-closed, XSS escaping and repeated-read preservation. Fixtures exist only in disposable local PostgreSQL. Existing invoice regression PASS. Further hosted and regression evidence appended below before review.

## Preservation baseline (all environments before preview schema change)

Read through connected Supabase SQL editor, 13 November 2026:

| Dataset | MD5 over complete rows sorted by ID |
|---|---|
| Bookings | fec782e7fbd6a3a243fa3bbc229476e4 |
| Quotes | e358e94c1321c50571767502a06d9dd4 |
| Invoices | 03066af322d0dcdba2085ef5f3c725c9 |
| Payments | e5e94c91c2b582aea6db6e60425f7364 |
| Staff | 0ac494aa9d2231454818de4b38717325 |
| Enquiries | a9cffd0724e01c89d3757c2eb83a00fe |
| Businesses | f5a653038fdad35dce0892e83a637044 |

Accounts 3; Shalean live public pages 0. Protected live bookings 8EF88DF7, 14616616 and 10BBEB8F Cancelled; live test invoices INV-000001 and INV-000002 Void with paid 0; all live payment entries net 0.

## Release boundary and rollback

Preview only. Main production remains PR #12. Dashboard RPC adds read capability under existing owner RLS; manual enquiry write is restricted to preview. Before production approval, review hosted evidence and enable live manual intake in a reviewed follow-up migration. Rollback application to PR #12, revoke the new public RPC EXECUTE permissions, and retain all records. No counter reset, record deletion or status cleanup is needed.

## Hosted checkpoint

Draft PR #13, application b624f97fdaf3bf6a206713f6580b9d8049cd820d deployed through connected Plesk only to /_accounts-preview. Main card remains PR #12. Shared fresh database received only new routines and their restricted grants; production application and business data were not changed. Manual enquiry intake rejects live environment.

17 targeted native tests PASS: 5 accounts, 4 profile, 1 each services/enquiries/quotes/bookings/customers/staff/invoices/dashboard. Test harness simulates Auth/PostgREST transport, not database/RLS or PHP. No waitlist test cases or provider operations were invoked. PHP lint and diff whitespace check PASS.

Connected hosted rollback-only probes PASS: existing preview counts and financial sums independently reconciled, preview enquiry create/replay increments New exactly once, live manual intake rejects, cross-business and anonymous calls reject. All probe fixtures rolled back. Script: tests/dashboard-hosted.sql.

Initial authenticated UI check paused at expired session. Owner signed in and replied Ready; subsequent authenticated verification is recorded below. No credentials were entered by the assistant.

Initial checkpoint: CONDITIONAL PASS pending authenticated review. Final preview decision below supersedes this checkpoint; production still requires owner approval.

Preservation readback after schema installation and rollback probes exactly matches every baseline hash above (including enquiries), with accounts still 3 and Shalean unpublished. No hosted test fixture was retained. Migration 20261113143833 recorded in schema_migrations; LF-normalized source MD5 cd17da9c1977edefa5b9056e9ce8795c matches committed file. The editor stores CRLF line endings; normalization removes CR only. No business records or existing schema objects were rewritten.


## Authenticated preview closeout

Owner replied Ready after signing in. Final preview application revision 5db77fd6ce09413e4314737bc900b97d4d937921, deployed only to /_accounts-preview. Desktop overview was visually inspected; final desktop DOM at 1280 viewport confirmed populated booking/attention/invoice views. Mobile at 390 pixels verified no horizontal overflow (document width 375/390); saved full-page screenshot docs/evidence/dashboard-mobile-preview.png. A wrapped Refresh link was corrected with nonshrinking/no-wrap CSS, and the stylesheet URL versioned to avoid stale caching. Temporary viewport override reset; mobile test tab closed and normal desktop review tab left open. Attempts to capture a final full-page desktop image timed out; mobile image is the durable screenshot evidence. No 320-pixel result is claimed because the browser continued reporting 390 after the requested override.

All four dashboard create links opened the correct forms. Private enquiry saved/reloaded successfully without publication or notifications; New count rose 2 → 3. Booking saved with 18:00–19:00 in Africa/Johannesburg and assigned existing Fictional Mobile Preview Staff; dashboard shows exactly one booking and the same staff. Quote quick link opened a blank draft; no new quote was saved. Invoice quick link created a clearly labelled preview draft of ZAR 100.00, then issued INV-000003: dashboard Unpaid 1 / Outstanding 100.00. Recorded preview-only payment ZAR 25.00: dashboard Unpaid 0 / Part paid 1 / Outstanding 75.00; November payments 886.00 − reversals 330.50 = net 555.50. October selector showed payments/reversals/net all zero while current outstanding remained 75.00. Returned to November for owner review. Existing paid/void exclusions and empty states were observed before creating fixtures. Overdue and date-boundary cases are proven by the native suite; no overdue production fixture was created.

New **preview-only**, clearly labelled retained verification records:
- Enquiry d595a7f9-4213-ae4d-bece-ebc8b1ebd4d2, DASHBOARD PREVIEW TEST Customer, New.
- Booking b103dbe6-b873-1c50-07b0-486a7b5050b2, DASHBOARD PREVIEW TEST Booking, Scheduled, 13 November 2026 18:00–19:00, fictional service address, assigned existing fictional preview staff.
- Invoice e6709b80-8861-e037-7abe-6ef49ef6a0c6 / INV-000003, DASHBOARD PREVIEW TEST Invoice, Part Paid, ZAR 75.00 outstanding; payment 8CD74EA1 ZAR 25.00 labelled PREVIEW TEST ONLY - no real funds.

No real money moved. These fixtures intentionally remain available for owner preview review; production history is untouched. Connected database readback returned true for every complete-row baseline comparison after excluding only the three new preview IDs and their payment. Quotes/staff/business hashes matched without exclusions. This preserves all previous production and preview records, including protected cancelled bookings, void invoices, payment reversals, staff statuses and unpublished business-page state. Homepage and waitlist source are unchanged.

Decision: PASS — tested isolated preview ready for owner review. Production remains PR #12. Do not merge/deploy until explicit owner instruction; enabling live manual enquiry intake remains a reviewed release step.
