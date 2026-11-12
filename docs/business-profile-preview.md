# Business profile and public page — preview

Scope authorized 12 November 2026: logo, description, explicit public contacts, service areas, seven-day opening hours, saved draft, mobile preview, unique address, publish/edit/unpublish. Fresh repository only. No bookings, payments, dashboard, historic import or restored source.

Base: b8547e92 (PR #3 production closeout; merged app 9720f7a9). Owner's account journey acceptance and limitations are recorded in account-details-preview.md.

## Design and privacy

- Existing PHP/Supabase Auth sessions and publishable key; no service-role key, frontend dependencies, paid runner or new hosting subscription.
- business_profiles contains owner-only drafts. Existing businesses RLS is the ownership authority; user metadata is never authorization.
- business_public_pages contains the current public snapshot only. Public column grants expose environment, slug, document and time zone. No owner ID, account email, personal name or draft.
- Strict JSON document key/type/size validation; escaped output and restrictive CSP. Explicit public email/phone/website start empty. Business trading name initializes the public name.
- Logo is a bounded raster payload inside the draft/snapshot (150 KB, 2000px). Public image endpoint revalidates format, serves an image MIME with nosniff, and never serves SVG. No public upload bucket or remote-image fetch. Removing/replacing a draft logo does not change the published logo.
- Seven days, one same-day interval per open day; unticked days show Closed. Overnight/split hours are outside this first release.
- Draft save uses version checking. Publish copies the saved draft under a row lock, checks version and minimum public content. Slug is unique per environment; old published address stays until republish. Unpublish removes the public snapshot while retaining draft.
- No-store public responses allow immediate source unpublish; already copied/downloaded public information cannot be recalled.
- Preview/live records and slugs are separately namespaced. They share the fresh project and business identities, not profile drafts/publications. This is not a separate Supabase project or database. API-owning users remain entitled to their own rows in both namespaces; environment is deployment separation, not an additional identity boundary.

## Verification

Local tests use real PHP HTTP and disposable PostgreSQL 17; only Auth/PostgREST transport is simulated. Four profile suites passed: save/reload/validation, XSS escaping, private-field exclusion, saved preview, publish/edit/address change/unpublish, stale versions, native cross-owner and anonymous denial, unique slugs, preview/live separation, multipart logo upload/reload/removal and published-logo preservation. Five account suites and 15 waitlist suites passed. PHP syntax and diff checks passed. No GitHub Actions budget used.

Hosted preview, mobile screenshots, real hosted policies and owner review remain pending. Do not claim completion or deploy production until evidence is recorded.

## Preview release

1. Additive migration 20261112195239 only; preserve all account/business/waitlist tables and records. Verify RLS/grants and run rollback-only owner/cross-owner assertions.
2. Switch only faraios-accounts-preview.git to feature/business-profile-20261112, keeping manual /faraios.com/_accounts-preview. Production faraios.git remains main; no production pull/merge.
3. Existing private router/config and preview sessions are reused. New authenticated/public PHP entries normalize their config lookup to the existing account/index.php route, retaining exact base-path guards. No private configuration or key is copied to source.
4. Sign into preview; use designated test business and fictional public data. Test draft, reload, preview, unique address, publish, anonymous page, edit, unpublish, logo, mobile and validation.
5. Present preview and limitations to owner before any production release.

Rollback: leave production source alone; return preview repository to prior branch. Retain additive tables/drafts rather than deleting data. Production release later requires separate approval, latest checks and post-release verification. WL-WEBHOOK and WL-RECOVERY are separate and open. Do not inspect the mismatched Resend account/workspace.

## Hosted evidence — 12 November 2026 (SAST)

Application 84528178c90d568c8051466853e6f09e7b9309fc is deployed through the manual faraios-accounts-preview.git repository to /faraios.com/_accounts-preview. Production faraios.git still follows main at the PR #3 app release; no production pull, merge or app deployment performed.

- Additive schema applied using the connected Supabase SQL editor; both new tables have RLS enabled. Migration history recorded as 20261112195239. Existing account/business/waitlist records preserved.
- A fictional Bright & Co Cleaning sample was saved and published only in the preview namespace for the existing designated FaraiOS Preview Test Business. Public contact is hello@example.test. Address: https://www.faraios.com/_accounts-preview/b/faraios-demo-cleaning. This seed used SQL with simulated owner claims, not an authenticated browser editor journey.
- Real public PHP/PostgREST read renders this sample without an account session. Desktop and 390px layouts inspected; no horizontal overflow. Browser viewport restored.
- Hosted rollback-only assertions passed: other owner cannot read the test draft or unpublish it; anon cannot read drafts or private business_id column; live public snapshot count is zero. Owner save changes only draft, publish updates snapshot, unpublish removes snapshot while retaining draft. These native hosted checks use simulated JWT claims, not two real signed-in mailboxes.
- Preview sign-in wall observed. Authenticated hosted editor save/reload, multipart logo and editor mobile controls remain pending fresh owner sign-in. Do not call this feature accepted or production-ready yet.
- Production homepage and waitlist entry rendered in connected browser; no source files changed. Direct network byte/hash regression was unavailable and is not claimed.

Gate: CONDITIONAL PASS for preview review; NO-GO for production until hosted editor verification and owner review.

## Authenticated hosted closeout — 12 November 2026 (SAST)

This supersedes the earlier pending authenticated editor checks. Owner signed into preview with the existing account/business. Application correction c3715003277c22e845b04c820621d58be80a940d was pulled and manually deployed to preview only; production repository/branch/destination were unchanged.

PASS — hosted preview verification:
- Welcome → Business profile opened the existing Shalean Cleaning Services business, without creating another business. Public contact fields began blank, despite the account having a private sign-in email.
- Invalid Monday closing-before-opening was rejected. This exposed and fixed an error-state usability defect: all submitted public fields and day/time selections now remain after an error, with hours expanded. Regression assertions added; all four profile suites passed again.
- Uploaded the existing FaraiOS social-preview.png as a temporary raster fixture (1200×630), saved it through the real multipart form, reloaded and verified successful image loading and saved description/contact/areas/hours. This was an upload test, not a final Shalean logo.
- At 390px the editor and saved preview had no horizontal overflow. Checked and edited Tuesday hours using the mobile controls; saved 10:00–18:00 and reopened the saved preview. Monday retained 08:00–17:00. Desktop logo loading verified. Viewport reset afterward.
- An already-used slug was rejected with clear feedback and entered details retained. Restored the unique shalean-cleaning-preview address and saved successfully.
- The public route was unavailable before publish. Explicit preview publish made the saved snapshot available without an account session at /_accounts-preview/b/shalean-cleaning-preview. It contained only entered public details; private sign-in email absent.
- Changed draft description and removed the temporary logo. Save left the public description and logo unchanged. Republish updated the description and removed the logo publicly.
- Unpublish made the public route unavailable. Reloading the editor retained draft details/address; saved preview reopened successfully. Final state: this user's preview profile is UNPUBLISHED with its draft preserved. Test contacts and hours are fictional, not approved operational details.
- The separate fictional Bright & Co sample remains only in preview for public demonstration. No live profiles were published, no production source was deployed, and no real marketing email was sent.

Acceptance mapping: profile fields PASS; draft persistence PASS; mobile editor/preview PASS; unique address/publish PASS; edit/republish/unpublish PASS; private/public separation PASS; owner isolation PASS with the documented native/simulated-claims limitation. Latest correction has passing native profile tests; prior account/waitlist suites remain applicable because the correction only changes profile error display and its regression assertions.

Gate: PASS for owner preview review. Production remains pending explicit owner review/deployment approval and post-release verification. No waitlist webhook/recovery or Resend-workspace claims are added.
