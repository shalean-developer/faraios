# Business area pages — preview

Continues draft PR #29, feature/benefit-cards-20261114, base ab12acd. Owner authorized implementation and preview only. No production merge/deployment, Shalean republication or booking-intake activation.

Profile → Area pages supports up to 20 owner-authored pages. Add exact chip name, stable slug, title, introduction, coverage, available service selections, enquiry label and SEO title/description. Save then preview privately. Checking Ready to publish does not publish: explicit Publish saved draft is still required and publishes the whole saved business draft, as stated in the editor. Unchecking and explicitly publishing withdraws the area page while retaining its private draft. Empty unmarked rows are ignored. No coverage names or groups are rewritten.

Public /b/{business}/areas/{area} resolves exclusively from the business/environment public snapshot. Unpublished area documents are stripped at SQL publication, including from direct anonymous table reads. No draft fallback, inferred area routes, booking entry changes or external action URLs. Enquiry buttons use the business Contact page. Selected service IDs resolve only against that business's public visible/unarchived catalogue; unavailable services are omitted. Private preview can use draft catalogue.

Public chips link only on exact area-name matches to published area pages. Other chips stay plain text. Unique default metadata derives from area title/introduction plus business name; owners can override metadata. Canonicals use configured base, three-level breadcrumbs use business → Areas → area. Published pages only enter live sitemaps; preview remains noindex and sitemap remains empty. Unpublished/missing pages return 404 with no canonical or content schema.

Migration replaces the pure validator and existing security-invoker publication function only. No table, grant, RLS, existing row or booking gate changes. Existing owner RLS, CSRF/origin checking and optimistic versioning remain authoritative. Roll back application to ab12acd; validator remains backward compatible. Do not restore old publication function after area drafts exist because it would copy drafts into public snapshots.

Native tests PASS: area save/reload/private preview, draft absent from anonymous snapshot and public route, explicit publication, published chips, metadata/schema/sitemap, withdrawal, retained drafts, malformed fields and cross-owner denial. Existing benefit-card lifecycle and all five SEO/security/pagination tests PASS. Chromium at 1280/390/320 PASS: one H1, accessible three-level breadcrumbs, available services only, contact enquiry action and no overflow. Evidence screenshots use a synthetic Example Cleaning fixture, not Shalean changes.

## Priority content review

Read-only review of Shalean's published snapshot confirmed 43 named areas in five preserved groups, general regional coverage and service descriptions. It contains no distinct suburb-level coverage details. There is insufficient substantiated local content to prepare 5–10 useful original area drafts without duplicating generic text or inventing claims. No Shalean draft or published record has been changed. Candidate names for owner content collection: Claremont, Newlands, Rondebosch, Sea Point, Camps Bay, Woodstock, Century City, Table View. These are candidates only, not created pages. Collect verified address coverage, relevant services and area-specific practical enquiry information before drafting.

Hosted deployment and signed-in inspection follow after native validation. Production remains unchanged.

## Hosted checkpoint

Application candidate f997377 deployed to Plesk manual accounts-preview only. Confirmed feature/benefit-cards-20261114 and /faraios.com/_accounts-preview before deployment. Hosted demo loads homepage.css?v=area-pages-1, retains both original area groups, has zero area links because none are published, and no horizontal overflow. All five existing homepage/profile tests also PASS.

Additive migration installed in faraios-new. Before/after full-row fingerprints identical: business_profiles 5 rows 900880e9d77aef77a45f5e4beb6ea1d9; business_public_pages 3 rows e3cc885f940357f9e12813ca0ab2bfce. No hosted profile saves, publications or intake changes.

Hosted private editor returned an expired-account error. Preview sign-in page left open for owner handoff. Remaining gate: renew sign-in, inspect hosted controls and owner preview. Native lifecycle/isolation tests pass; this is not a claim of completed hosted acceptance. CONDITIONAL PASS for preview; NO-GO for production pending hosted owner review and explicit production authorization.
