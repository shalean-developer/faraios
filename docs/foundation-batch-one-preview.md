# Foundation first delivery batch — preview

14 November 2026. Authorized scope: F01–F03 and their regression checks; independent service businesses. Source base main cc8f2fc, incorporating all PR #34 commits through 9bef892. No production application deployment, live booking intake or business republication authorized.

## Reconciliation

PR #34 remains Draft/open and unmerged. Its complete implementation and hosted evidence already cover 4000-character Unicode/CRLF requirements, private notes, follow-up filters/dashboard, immutable paginated private activity, quote navigation and mail-client composition. Reuse these rather than adding another enquiry workflow. Revalidated its native regression. Automatic quote email dispatch remains outside this batch.

## Changes

- Enquiry-derived service lines start with an empty price, never an invented zero. Booking-request scope is loaded before mutation. Fixed-price requested scope keeps its captured price; starting-price/quote-required scope requires deliberate final pricing. Catalogue labels already distinguish fixed, from and quote required. All quote line prices are final offers; an estimate is not silently represented as an agreed price.
- Saved zero-total preview quotes show a separate free-of-charge confirmation at send time. Owner/version/environment checked RPC records confirmation and sends atomically under row lock. A database trigger prevents bypass through the older send RPC. No historical quote is changed; sent quotes remain immutable and confirmed free quotes can be accepted and converted to a zero-value booking.
- Void invoices can create/open a linked replacement draft. Owner edits the new draft, then issues a fresh number/link. Original document, number, sender, token, payment/reversal records remain. Payments must still be fully reversed before voiding; no refund or transfer occurs. Replacement does not carry payments forward. Composite predecessor FK, unique predecessor and a partial active-booking index prevent cross-tenant links, branching and competing active invoices. Existing tenant advisory lock serializes all financial transitions. Ordinary booking invoice creation opens the latest retained invoice instead of creating an unlinked replacement.
- Additive migration preserves existing rows and keeps new behaviors preview-only. Live quote legacy send and ordinary live invoice behavior remain unchanged; live replacement is explicitly rejected. Production activation needs a separately reviewed gate migration plus application release.
- Application regression workflow added on pull requests (PostgreSQL 16/PHP on Ubuntu); local verification uses native PostgreSQL 17/PHP 8.4. Auth/PostgREST transports are simulated locally; RLS and functions execute natively. No provider sends.

## Verification so far

PASS: new foundation behavioral suite (free confirmation and bypass denial, owner/environment/stale/anonymous/direct-write denial, accepted free quote booking, payment/reversal prerequisites, invoice correction edits, retained original and ledger, concurrent replacement idempotency, correction chains, unique invoice numbers and real PHP save/reload/send/issue).

PASS: existing enquiry-workflow, enquiries, quotes, bookings, invoices, dashboard, requests, rooms, profiles (4), services, customers, staff, area-pages and website-release suites: 18 test methods total including foundation. PHP syntax and git diff checks pass. First regression run exposed the new preview-only send endpoint being used by the live-mode PHP harness; the UI now keeps the legacy live path, and affected suites pass. Test-only preview router normalizes Origin separately from the URL path.

Hosted schema applied; all 17 original public-table fingerprints/counts must match before retained new preview fixtures. Baseline booking intake preview=true/live=false; enquiry mail preview=false/live=true. These gates must not change.

Hosted deployment/browser verification pending. Production remains NO-GO pending tested preview demonstration and explicit release authorization.

## Rollback and next priority

Restore preview application to PR #34; retain additive columns, correction chain and all documents/ledger/events. Do not restore the old unique booking constraint over retained replacement records. Do not delete fixtures, reset counters or drop history. No change to five-step booking code, published content or business publication.

Next: F04 customer-access decision and honest navigation, then complete F05 application CI coverage and F06 restore/operational evidence. Industry expansion follows the shared-core model/capability specification.
