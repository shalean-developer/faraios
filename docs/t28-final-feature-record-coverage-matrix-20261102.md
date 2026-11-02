# T28 — Final feature and record-family coverage matrix (2 November 2026)

**Status: mapping contract review, not staging acceptance.** This consolidates source evidence and later owner approvals; earlier T28 reports are chronological snapshots and may have superseded OPEN rows. Canonical acceptance: "Every required feature mapped or transition agreed." T27 Done; T28 In progress; T29 Not started.

| Required domain | Shalean source treatment | Bokkie source treatment | FaraiOS V1 capability / disposition | Remaining execution proof |
|---|---|---|---|---|
| Business ownership / RBAC | Preserve Shalean source IDs and access history; no cross-company equivalence | Separate Bokkie source IDs and permissions | Businesses, memberships and access controls in V1; source-scoped crosswalk required | Identity ownership and RLS regression before cutover |
| Customers / identity / addresses | customers, auth.users-linked recurring, addresses and snapshots; one Auth-only/CRM-unlinked booking preserved under EXCEPTIONS-01 | customers, profiles/customer_profiles and booking contact/address snapshots retained; no email-only joining | business_customers, customer_addresses, T25 portal; privacy-safe source-ID mapping | Per-record identities and ownership |
| Catalogue / pricing / quotations | Original catalogue, service lines and financial document terms remain source-authoritative | 161 quotes, including 15 large December 2025 pending quotes under BOK-QUOTE-01; no assumed conversion or revenue | V1 catalogue/quotes where independently verified; other proposals retained legacy | Quote lifecycle, pricing version, discount/tax/issuer evidence |
| Bookings / assignments | Bookings, pricing snapshots, visit history and staff assignment preserved | 77 bookings and 2 booking_cleaners links with valid source FK; staff TEXT cleaner key distinct from UUID | V1 one_off_bookings and assignments; original keys preserved | Status/date/ZAR→cents conversions and source-scoped keys |
| Recurrence | 13 active schedules, 85 future linked visits, historical paused/cancelled retained under SHA-REC-01; legacy single writer | 5 historical recurrence groups/13 grouped bookings plus 1 ungrouped under BOK-REC-01; no inferred new schedule | V1 recurrence functions exist, but NO import or duplicate visit creation | Separate future cutover sequencing |
| Workforce / pay / payouts | Historic staff, cleaner_earnings, disbursements and settlement snapshots retained | 12 cleaners and historical booking earnings; original assignment/pay data retained | Staff and T22/T23 destination families mapped | Agreement/pay rule revisions and verified settlement |
| Invoices / payments / EFT | 89 monthly-invoice and 33 sales-document payments link correctly. One unmatched Paystack booking-labelled entity retained under EXCEPTIONS-01 | Original booking payment state, quote prices and credit history remain authoritative | T19 Zoho, T20 Paystack, T21 EFT and invoice records | Independent provider reconciliation, no duplicate settlement |
| Credit liability | Historical customer obligations retained if source-documented | 20 accounts, one R64.75 positive, 9 movements, unexplained R50 gap under BOK-CREDIT-01 | No new wallet module assumed; legacy controlled servicing | Credit ledger integrity/security and authorised servicing review |
| Portals / notifications / audit | Original auth, events, messaging/audit remain source; don't replay | Existing profiles and historical communications retained | T24–T26 portals/events/notifications and source audit retention | Permission/identity acceptance and no notification replay |
| Reports / customer care / ancillary operations | Original operational metrics, customer-care obligations and legacy tables retained, V1-supported report inputs mapped | Booking/quote report inputs mapped; website/CMS metrics legacy | T27 reports; website and non-V1 functionality stays in legacy under SHA-LEG-01 and BOK-DEV-01 | Check active service obligation not stranded in legacy |
| Website, marketing, CMS | Shalean legacy site preserved under SHA-LEG-01 | Bokkie site and source metadata preserved under BOK-DEV-01 | Approved legacy transition, not V1 feature addition | Website operation, owner access continuity |
| Storage / attachments | 5 buckets, 42 objects; 20 private booking photos must retain protections | One public blog-images bucket, 24 objects | Legacy retained-source treatment and RET-OWNER-01 accountability | Retrieval, backup and recovery NOT proven |

## Source inventory and coverage qualifications
Shalean 245 public tables are all listed in `docs/t28-shalean-245-table-triage-20261102.md`; codes are **provisional name-based triage**, not 245 verified field transforms. Bokkie 43 public tables classified from owner-run SQL. The V1 database had 27 public tables in earlier staging review. Source family disposition is supported by the listed approved decisions; exceptions and prospective mapping do not prove a successful transfer.

## Owner decisions included
T28-SHA-LEG-01; T28-SHA-REC-01; T28-BOK-DEV-01; T28-BOK-REC-01; T28-BOK-CREDIT-01; T28-BOK-QUOTE-01; T28-RET-OWNER-01; T28-EXCEPTIONS-01. No approval of a production repair, backup restore, provider settlement or migration is implied.

## Strictly later cutover prerequisites (NOT PASSED)
1. Establish practical source/asset retrieval and restorable backup evidence for both source systems.
2. Obtain provider-origin payment evidence and reconcile invoicing, settlement, staff payout and credit liabilities; preserve original ledger and Paystack references.
3. Validate full executable external-ID, UUID/TEXT, date, money, statuses and identity ownership crosswalks, with duplicate prevention and accurate business boundaries.
4. Demonstrate legacy customer/recurrence/financial obligation servicing and access continuity under accountable owner.

## T28 acceptance judgement
This matrix provides **family-level V1 mapping or approved legacy retention** across the identified required domains. It does **not** prove exhaustive per-column transformations or recovery, and the Shalean source-table codes remain provisional. Owner may review this as a **mapping-only staging acceptance candidate** if the canonical requirement is interpreted at the feature/record-family level, while treating all four future prerequisites as mandatory and not passed. A stricter every-table/field interpretation remains open. Do not mark Done without explicit staging acceptance and confirmation of the correct interpretation. T29 untouched; no production writes, deployment or merge.
