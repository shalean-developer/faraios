# T30 — SaaS architecture and acceptance transition

Date: 2026-11-04. Canonical task: T30, **07 SaaS enablement**. Scope source: owner-approved D16, Build Tracker T30. **Planning/acceptance preparation only**; no application features, database writes, provider changes, deployment, migration, backup or T31 work.

## Canonical acceptance boundary

T30 must reconcile accepted T01–T29 evidence with a standalone multi-tenant Cleaning Business Operating System; map hardcoded tenant/domain/provider assumptions and website integration gaps; define a bounded generic-tenant security/recovery acceptance plan; and classify draft PR #311 independently. Owner must accept T30 staging after current-head CI, relevant regressions and documented genuine blockers. T30 does NOT implement T31 self-service provisioning, T32 widget, T33 integrations or T34 pilot, and does NOT imply a live V3 backup.

The old T30 branch/PR #307 records historically useful role/payment/team/payout/mobile evidence, but its base is the T29 branch, its scope is the **superseded** end-to-end acceptance wording, and it must not be merged/deployed as the new SaaS plan. Keep it open as historical draft until separately resolved. PR #311 is V3 restore-qualification source work, not a SaaS onboarding prerequisite or permission to run a backup; preserve evidence without mixing it into this PR.

## Current source/evidence mapping

| Area | Previously accepted foundation | Observed limitation / T30 verdict | Next owning task |
| --- | --- | --- | --- |
| Product / boundaries T01–T03 | Universal Cleaning module, immutable business ownership, owner/manager/staff/customer permissions, explicit memberships | Original blueprint still describes Shalean/Bokkie as first businesses and cutover sequence; D16 now supersedes launch order. Approved historical decisions remain recorded | T30 documentation; T31 provisioning |
| Operational policies T04 | Versioned service, booking, earnings, adjustment and settlement rules | Shalean-specific rates, cancellation terms and commercial approvals are **not universal defaults**; new tenants must choose policy and legal parameters | T31/T34 |
| Hosting T05/T06/T07 | Controlled source/CI, staging and production boundaries | T05 is **Blocked**; budget/tenant-capacity estimates not verified. `src/hosted-staging.js` pins staging host, Supabase URL/ref/key and fixed allowed routes; deployment-specific safeguards must remain while later production config becomes portable | T35 plus T05 |
| Membership / access T08–T11 | RLS/server policy, business switching, audit and historical restore evidence | No evidence here of public self-service registration, owner bootstrap, invite/revocation lifecycle or third-party integration credential controls | T31/T35 |
| Core ops T12–T18 | Catalogue, customers/notes, one-off + recurring bookings, teams, availability, quotes | Need a generic fresh-tenant configured journey and website-driven booking entry; no Shalean/Bokkie migration requirement | T31/T32/T34 |
| T19 Zoho | Business-scoped independent organisation identity, connection and durable reconciliation foundations accepted | New unaffiliated business consent/onboarding and organisation mapping require full tenant tests, not assumed from two fixture businesses | T33 |
| T20/T21 payment | TEST merchant routing, verified provider event, EFT accounting and replay safeguards accepted | `src/t20-payment-runtime.js` allows **at most two accounts** and reads `shalean-test.json` / `bokkie-test.json` explicitly. A generic merchant onboarding lifecycle is not implemented by that runtime | T33 |
| T22/T23 earnings/payouts | Business-scoped earnings, adjustments and monthly settlement controls accepted | Must not inherit Shalean policy. Fresh-tenant payout workflow and bank/transfer ownership still need independent proof | T34 |
| T24–T27 portals/comms/reports | Cleaner portal, customer access, notifications and authorised reports accepted | `src/customer-portal.js` supports `/b/{slug}` but labels itself staging TEST only; account-backed draft request and office confirmation are not a drop-in embedded booking widget. Origin restrictions, external-domain integration, client abuse controls and public API contracts not accepted | T32/T34/T35 |
| T28/T29 pilot/mapping | Accepted feature mapping, obligations retained, disconnected tenant isolation and synthetic fresh-start rehearsal | Preserve Done and historic Shalean/Bokkie source obligations; do not import either legacy DB or use the former cutover plan as SaaS launch gate | T30 accepted history; T34 pilot |
| T30 old recovery investigations | Synthetic PG17 rollback, encrypted V3 source compatibility and source-only PR #311 | Real restoration/operational quiet window remain unverified; document in T35 recovery plan, **not** automatic T30 blocker unless a genuine staging release risk independently demands it | T35 |

## Required SaaS invariants

1. A new business gets an independently owned tenant ID and an audited owner bootstrap. No pre-seeded Shalean/Bokkie business IDs, rate rules, merchant secrets or customer history.
2. Server and Postgres verify tenant ownership, record ownership/assignment and staff membership for every mutation and report. A slug, iframe origin, browser-supplied business ID or API payload is **never** authorization.
3. Public `/b/{slug}` pages expose only allowlisted catalogue/profile data. Embed widgets and eventual API clients require a versioned, origin/credential-scoped, rate-limited integration contract; origin-only checks are insufficient for secret authorization.
4. Any client creates an idempotent draft/quote request with authoritative price/availability and protected customer data. No third-party website can forge completed/paid states, cleaner assignments or price overrides.
5. Merchant/Zoho credentials and provider results belong to the individual business. Verified callbacks, ledger transitions and settlement retries are deduplicated, audited and restricted to business-specific scopes. The platform does not hold combined customer funds in V1.
6. Business policies and financial terms are configurable within safe versioned constraints and tested independently. No existing Shalean/Bokkie obligation is silently migrated or cancelled.
7. Staging remains provider TEST-only and non-outbound unless separately approved. The owner controls merge, deployment, service changes, real backup and any production launch.

## Exact acceptance gates for T30

- [x] Read canonical Build Tracker: T29 Done, T30 In progress, T31 Not started; D16 approved SaaS direction.
- [x] Preserve T01–T29 Done evidence and T05 Blocked. No retroactive edits to accepted statuses.
- [x] Source review documents hardcoded staging origin/project, two-account TEST runtime and existing `/b/{slug}` portal; classify major non-shared integrations.
- [x] Allocate implementation gaps to T31/T32/T33/T34/T35; no accidental implementation of future tasks in T30.
- [x] Isolate PR #307 historical prior scope and PR #311 V3 recovery preparation from new SaaS transition.
- [ ] Exact-head GitHub Actions policy/backup/windows/custody/security checks pass on this PR.
- [ ] Owner reviews this scope/evidence matrix and explicitly accepts T30 staging. Only then mark T30 Done in the canonical tracker. T31 is Not started until owner authorizes it.

### Evidence classification

**Already accepted** does not mean **all SaaS requirements passed**. Accepted T01–T29 coverage remains in the canonical tracker. The SaaS onboarding, website widget, third-party TEST merchant, third-tenant pilot, tenant-level operational scale and production recovery demonstrations are **Not yet implemented/qualified** and belong to T31–T35.

**Release posture:** documentation-only draft. No changes to runtime, database schema/data, Plesk, Supabase, provider secrets, webhook, payment/accounting systems, historical websites, or production.
