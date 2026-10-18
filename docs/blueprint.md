# FaraiOS initial implementation baseline

Date: 19 October 2026. Scope source: owner discussion and [Build Plan and Progress Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit).

The owner instructed implementation according to the tracker. This package starts T01–T04 and prepares the repository/checks portion of T06. Owner approved the reviewed business boundaries, roles and V1 direction on 19 October 2026, including manager invoice management and payment recording. Unspecified operational formulas, production and commercial decisions remain open.

## Product and V1 scope — T01

Universal business operating system plus customer marketplace, beginning with a reusable Cleaning module. Shalean and Bokkie are independent businesses using the same module. V1 covers business accounts, permissions, dashboard, customers, service catalogue, one-off and recurring bookings, teams, availability, quotes, invoices, online and EFT payments, earnings, monthly bank payouts, customer/cleaner web portals, business booking pages, notifications, reports and third-cleaning-business onboarding.

Deferred: marketplace discovery/rankings, visual website builder, other industries, retail inventory/delivery, central marketplace fund collection, advanced AI and native mobile apps. One-business booking pages belong to V1 even though public marketplace discovery follows later.

First milestone: a verified user switches between authorised businesses; a Bokkie-only manager cannot access Shalean. Full V1 acceptance requires one-off/recurring operational and financial journeys, migration reconciliation and a third-business pilot.

## Business boundaries — T02

- Each organisation represents a business. Business-owned records carry an immutable business identifier or a controlled audited transfer procedure.
- A user may have several active memberships; there is no automatic access across businesses.
- Combined overview aggregates only the authenticated user's permitted businesses and actions. Selecting “All” never removes authorisation filters.
- Each business owns its prices, customers/notes, bookings, invoices, payment credentials, earnings and reports.
- Shared staff need explicit membership in both businesses. Cross-business availability can disclose occupied time without disclosing another business's customer/address/financial details.
- One customer identity may sign in across participating businesses, but each business relationship and private notes remain separate. Customer identity linking must be verified, not inferred solely from matching email strings.
- Platform operators do not automatically gain business access. Any future support-access mechanism requires separate approval, expiry and audit.

## Approved role matrix — T03

| Capability | Owner | Manager | Staff | Customer |
|---|---|---|---|---|
| Business configuration / memberships | Manage | No | No | No |
| Customers / bookings | Business scope | Business scope | Assigned job details only | Own records only |
| Finance | Read/manage | Read; manage invoices; record payments | Own earnings only | Own invoices/payments only |
| Job progress | Manage | Manage | Own assignments | No |

Owner approval: 19 October 2026, in this conversation. Managers can view finances, create/manage invoices and record customer payments (including EFT) only for authorised businesses. Payout approval, refunds, bank/payment settings and user permissions remain owner-controlled. Financial changes must record actor, business, timestamp and change details when persistence is implemented. Recording a payment must never fabricate provider-confirmed status. Customer and platform routes are not implemented by this policy core; support access must not expand silently.

Journeys: owner signs in → selects authorised business → configures catalogue → adds customer → creates booking → assigns team → records completion → reconciles payment → reviews monthly payout. Customer selects business → books → pays → receives confirmed status → accesses own history. Cleaner signs in → views assignment → updates progress → reviews own earnings.

## Operational contracts — T04

Proposed booking lifecycle: draft → awaiting payment or confirmed under an allowed payment policy → assigned → in progress → completed; cancellation is explicit. Rescheduling records history. Final transition rules and exceptions require approval.

Booking status, payment status, invoice status and payout status are distinct. Verified provider events use idempotency keys; replay, delay and retries cannot duplicate bookings, invoices, earnings or notifications. Persist the agreed price and rule version with each booking; later catalogue edits do not rewrite history.

Each business configures supported services, extras, working hours, service areas, team requirements and recurring frequencies. Earnings options must be explicitly defined, versioned and tested. Do not infer payout eligibility from customer payment alone. Monthly bank payouts require reviewed earnings, adjustments, freeze, approval, transfer evidence and duplicate-settlement prevention. Other payout frequencies are future configurable options only after specification/testing.

Open: pricing formula choices, cancellation/refund rules, recurrence change policy, earnings formulas, retention periods and initial cutover order. These block affected implementation, not documentation or isolated policy tests.

## Technical starting point — T05/T06

Start with one modular application and one production platform database plus separate staging. Hosting/framework selection and service costs remain unverified; the R500/month target is a constraint, not an estimate. This package uses dependency-free Node.js modules to validate business-access policy without committing to hosting or a UI framework.

Target modules: identity/business membership, Cleaning operations, finance/integrations, communications, reporting. Future modules use business configuration rather than brand forks. Keep provider-specific code behind adapters. Frontend filtering is never the security boundary: authenticated API enforcement and database isolation tests must be added in T07–T09.

No cloud resources, databases, migrations, payment accounts or live-site connections are created in this work package.

## Delivery and evidence

Follow isolated checks → pull request review → staging verification → production approval → post-release verification. Each release records SHA, migrations, tests, acceptance evidence and rollback/recovery steps. Only mark tasks Done when all their evidence requirements pass.

Migration: feature inventory → data ownership mapping → rehearsal → counts and financial reconciliation → business-by-business cutover → monitoring. Existing Shalean/Bokkie systems remain authoritative until each explicit cutover. Avoid independent dual writers and duplicate crons.

## Next gates

1. Business boundaries and roles approved; specify remaining pricing, earnings and cancellation choices (T04).
2. Verify actual Plesk permissions/resources and recurring costs (T05).
3. Complete CI and choose application stack (T06).
4. Create isolated environments (T07), then memberships/auth/database isolation (T08–T09).

Gate: CONDITIONAL PASS for documentation and isolated foundation work; NO-GO for production, migration or financial implementation until their requirements are verified.
