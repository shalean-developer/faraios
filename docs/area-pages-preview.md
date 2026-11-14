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

## Signed-in hosted verification

Owner renewed preview sign-in. Confirmed current account is FaraiOS Preview Test Business and opened its existing Bright & Co demo Profile. Expanded Area pages → Add area page. Verified address, exact coverage name, title, introduction, coverage details, SEO title/description, enquiry label, three business-specific service checkboxes and unchecked Ready to publish control. Publication explanation explicitly states that other saved business changes publish together. No fields changed, forms submitted, records created or publications made. Editor left open for owner review. Hosted editor-inspection blocker resolved; persistence/publication/isolation remain proven by native disposable tests. PASS hosted editor inspection. Production remains gated by explicit owner authorization; Shalean is unchanged.

## Business owner tools audit — 14 November 2026

Baseline main bb2efc8b0df03b72181955b1c82fafc2afac67b1 (footer PR #32). Read benefit-cards-preview.md and this document, then audited Profile, business/areas.php, public routing, SEO/sitemap helpers and the existing publication migration. Requirements 1–5 are implemented already; extend the existing editor rather than create a second area store or publishing mechanism. Publication remains a whole-business saved-draft action, explicitly explained in the editor. No per-area publication RPC is introduced.

Two preservation fixes: retain hidden/archived/missing service IDs in the editor's submitted selection so an unrelated text edit does not silently discard them; those services remain excluded from public rendering. Reject a missing/malformed area payload and blank rows carrying publication/service selections instead of treating them as empty content. Truly blank add rows remain ignored. Clarify page count, private/ready draft state, stable URLs, save-before-preview and the withdrawal sequence.

PASS isolated native PostgreSQL/PHP area lifecycle (save/reload, private draft, publish, public links/metadata/breadcrumbs/sitemap, withdrawal, malformed SQL documents and cross-owner denial). PASS PHP editor regression for unavailable selections, malformed form payloads and blank rows. PASS five-test existing homepage/profile/security/logo suite. PASS Chromium area layout at 1280/390/320 including public-only services, enquiry link and no horizontal overflow. Evidence images are synthetic Example Cleaning fixtures, not hosted business content.

Priority draft preparation remains conditional on verified local content. Existing evidence identifies eight candidate names (above), but does not substantiate distinct local coverage/service claims. No 5–10 generic or invented drafts created. No hosted data writes, profile saves/publications, migrations, booking flow changes, intake activation or email changes performed in this task.

Hosted accounts-preview Profile currently redirects to sign-in. Updated branch deployment and signed-in hosted acceptance are PENDING. Automatic approval review rejected opening the signed-in Plesk hosting origin because its controls include production state; no alternative access path attempted. Owner authorization for the preview-only Plesk operation is required before resuming that blocked step. Production merge/deployment remains outside this task's authorization. CONDITIONAL PASS for prepared changes; hosted preview gate incomplete.

## Authorized hosted owner-area checkpoint — 14 November 2026

Owner approved Plesk access and accounts-preview-only deployment. Plesk manual repository faraios-accounts-preview.git selected feature/business-owner-areas-20261114, candidate c4509f00bad4dcf38b110a0b65863503bf88193b, target /faraios.com/_accounts-preview. Deploy now completed and reloaded Profile showed the new Area pages (0/20) controls. Production main repository remained on footer release and its Deploy now control was not used.

Authenticated as FaraiOS Preview Test Business, editing the fictional Bright & Co Cleaning demo only. Inspected all eight text fields, three catalogue service choices, unchecked readiness choice and draft/publish guidance. Created ONE clearly labelled synthetic private test area at claremont-owner-preview with exact name Claremont, preview-only copy and no asserted local coverage, Standard cleaning selected and Ready to publish unchecked. Save returned “Draft saved. Your published page has not changed.” Reloaded editor showed Area pages (1/20), persisted selected service and unchecked publication choice. No publish action performed. The test draft is retained for owner inspection, not counted as verified priority-area content.

Private saved-area preview loads the title, introduction, coverage disclaimer, Standard cleaning link, enquiry action and three-level breadcrumbs. Robots noindex,nofollow. Public /_accounts-preview/b/faraios-demo-cleaning/areas/claremont-owner-preview shows Page not available. Published demo Areas page retains the original names and groups with zero area-chip links. No Shalean record accessed or published, no booking intake or email settings changed. Existing hosted records retained; only the fictional demo's preview draft was saved. No whole-database equality claim.

Hosted private area preview has no horizontal overflow at observed desktop width 1280 and mobile width 390. Mobile screenshot includes service and enquiry action. Temporary viewport restored. Evidence: area-owner-hosted-desktop.jpg and area-owner-hosted-mobile.jpg. Saved draft preview left open for owner review.

PASS hosted draft save/reload/private-render/public-exclusion/layout verification. Publication lifecycle, SEO sitemap and business-isolation checks remain covered by disposable native tests; no hosted publication was used to prove those paths. Production release still requires explicit owner authorization after preview review. Priority production drafts remain blocked on substantiated area-specific content.
