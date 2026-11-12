# Services and pricing — preview work

Owner scope: 12 November 2026. Fresh FaraiOS only, based on PR #4 merge 9eb6e3d31ed1e071ac8cbabd9fd0603284a010d1. PR #4 production closeout confirms unpublished Shalean draft at shalean-cleaning, with temporary fields cleared.

## Implementation

Existing PHP authentication/configuration and owner-scoped businesses remain the authority. Services link from Welcome and Business profile. Add/edit name, optional description, duration in minutes; fixed/from/quote pricing; one explicitly labelled currency for the catalogue. Decimal amounts become integer hundredths without floating-point parsing. Zero-decimal currencies require whole prices. Supported currency choices are bounded; no exchange-rate conversion. Initial currency is visibly ZAR and can be changed before adding services.

Owner-only business_service_catalogues stores bounded validated drafts (100 services including archives) and explicitly published selections, separately for preview/live. Save uses optimistic version checks. Archive is reversible and clears public selection; restore creates a private service draft. Neither operation changes public output until Publish services. Currency changes also remain private and require confirmation when services exist.

Publish services locks profile then catalogue, verifies version, filters selected/nonarchived services, saves snapshot and updates only an existing public page. It cannot create/publish an unpublished profile. A profile trigger carries the previously published services on initial publish/republish, preserving private service changes. Profile unpublish removes the whole public page; later profile publish reuses published services. This public snapshot includes opaque service identifiers and visibility/archive fields, never nonselected services, account identity or private business IDs. No booking/payment/quote-submission features are provided; Request a quote is a price label.

Additive schema only. Existing profile document validator and profile RPCs are unchanged. All new functions are invoker security, fixed search_path, explicit grants, owner RLS; anon has no catalogue access. Application outputs escaped text, uses existing CSRF/origin/session guards and no-store responses. Core helpers are blocked by Apache rules.

## Verification

Local PHP HTTP + disposable PostgreSQL 17: service lifecycle suite PASS, four profile suites PASS, five account suites PASS, fifteen waitlist suites PASS. Auth/PostgREST transport is simulated; authorization/snapshot SQL is native PostgreSQL. Checks include validation/error retention, save/reload, all pricing modes, currency confirmation/whole amounts, stale edits/publishing, cross-owner/anon denial, private edit preservation across profile republish, explicit service publishing, archive/publish/remove, restore/private selection, unpublish/republish and preview/live separation. No paid CI used. These are not hosted browser/mobile acceptance results.

Hosted source preview and mobile review pending Allanux sign-in. Production application remains main at PR #4. Do not merge this branch before owner review. Existing live Shalean profile must remain unpublished. Resend workspace restriction and WL-WEBHOOK/WL-RECOVERY remain separate; local waitlist tests make no hosted recovery or sending claims.

## Release and rollback

Use only faraios-accounts-preview.git, manual destination /faraios.com/_accounts-preview, on feature/services-pricing-20261112. Do not change faraios.git production branch/destination. Additive migration 20261112215916 is used in the fresh project; review RLS and rollback-only hosted assertions. Test fictional services in preview only, inspect 390px editor/public output and owner review before production approval.

Rollback source by restoring previous preview branch. Retain additive schema and records; never erase business/account/profile data. Production release requires later owner approval and smoke verification.

Status: prepared and locally verified; hosted preview acceptance pending.

## Hosted schema evidence

Applied additive migration through the owner's connected Supabase SQL editor to rxelmugnucfajrqmphhe. Migration history 20261112215916 verified. Rollback-only tests/services-hosted.sql completed without error: native owner save/publish/private edit/stale publish/archive, other-owner denial and anon draft/private-ID denial. Final verification: services RLS true; live service catalogue count zero; live profiles published zero. Test records rolled back. The application source is still not deployed.

Local commit a51a0b7 prepared. Automatic approval review rejected git push because it publishes new code/migration to the public repository and requires explicit owner authorization for that payload. No workaround attempted. Allanux client-area login is the second preview blocker. Next: owner authorizes public review-branch push and signs into Allanux; then push/open draft PR, deploy preview only, verify authenticated editor/public lifecycle and 390px layouts, and show result before production approval.
