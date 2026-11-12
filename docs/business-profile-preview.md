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
