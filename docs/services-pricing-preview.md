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

## Preview deployment — 13 November 2026 SAST

Owner replied “Approved and signed in.” Public branch published through GitHub connector (shell Git credential transport unavailable); PR #5 opened as draft. Connector source tree 97f532936ac344ecd6fa1288ac81d2e790762a60 matched tested local tree exactly. Initial app commit 7c285707; follow-up 27a97ea refreshes stylesheet URLs to avoid old cached CSS on existing browsers.

Connected Plesk: changed only faraios-accounts-preview.git to feature/services-pricing-20261112 and manually deployed /faraios.com/_accounts-preview. Production faraios.git remains main, automatic /faraios.com, PR #4 release. Waitlist preview unchanged.

Seeded three fictional services using simulated owner claims for the existing Bright & Co preview demo only: fixed ZAR 505, from ZAR 950, request a quote. Public sample /_accounts-preview/b/faraios-demo-cleaning renders all three with descriptions/durations and explicit currency. At 390×844 the corrected service card, price wrapping and spacing were visually inspected; document scrollWidth 375 <= viewport 390. Viewport restored. This SQL seed is not an authenticated editor journey.

Authenticated preview session expired. Sign-in handoff left open; add/edit/save/reload/publish/archive editor and mobile form checks remain pending. No production app deployment/merge authorized or performed. Live Shalean profile remains unpublished; no live services created.

## Authenticated hosted acceptance — 13 November 2026 SAST

Supersedes pending editor checks above. Owner signed into preview; reused existing Shalean business without creating an account/business.

PASS: add service, fixed ZAR 505.25, description/duration, public selection; invalid 505.123 rejected and entered values retained; save/reload and saved private preview. Publish services alone did not publish the draft business page. Explicit profile publish displayed the saved service snapshot. Editing name/price to From ZAR 750 and saving left public output at ZAR 505.25 until service republish. Archive left public service visible until publication, then removed it. Restore made the service private. Request-a-quote mode saved/published without a numeric price. Mobile editor at 390×844 had scrollWidth 375; form fields/pricing controls inspected, duration changed to 180 minutes, saved and reloaded. Public mobile sample had already passed at 390px. Browser viewport reset.

Cleanup PASS: owner's temporary preview profile unpublished; public route shows Page not available. Fictional owner test service archived and empty service selection explicitly published, so future profile publication will not expose that fixture. Its draft retained for reversible restore. Bright & Co demonstration remains published only in preview with three fictional services. Production source remains PR #4; no live catalogue created and live Shalean profile untouched.

Isolation remains covered by native PostgreSQL and hosted rollback-only tests with simulated JWT identities, not two real mailbox-authenticated owners. No real marketing email, Resend-workspace operation or waitlist recovery verification performed.

Decision: PASS for owner preview review. Production merge/deployment requires explicit owner approval, followed by release and live smoke verification. Application candidate remains 27a97ea18b318dd9687b2039c24b65e30c390bbc; later commits are evidence only.
