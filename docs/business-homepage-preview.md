# Business homepage upgrade — preview only

Owner scope: 14 November 2026. Base main a8082fd4a561820a286f17601d29a55d1f93f450 (PR18–21 included). No production merge/deployment, publication, intake activation or existing-record changes authorized.

## Smallest complete scope
One server-rendered reusable template in business/homepage.php with scoped CSS. Inspired by Shalean's hero, services, how-it-works, areas and contact hierarchy. No Shalean brand assets, reviews, rating, vetted/insured claims or credentials copied. Published snapshot and published visible non-archived catalogue are the sole public sources. Existing name/description provide hero fallback; logo becomes header branding. With no owner image use a decorative monogram panel, not a fabricated business photo. Benefits only appear when owner supplies them. No review/credential block in this version.

Optional preview Profile → Homepage content: headline (160), introduction (600), raster image (150KB, PNG/JPEG/WebP, 2000px maximum), required image description (200), up to six benefits (200 each). Save draft / explicit publish semantics and version checks retained. Schema validator accepts legacy eight-field documents plus an optional strictly validated homepage object. No table, policy, ownership, grant, RPC or gate changes; migration updates only pure JSON validation. No row backfill, fixture edits or publications.

Template/editor activation is restricted to profile_env preview. Live business-page rendering stays on existing path. Five-step form, booking JS/CSS, price calculation, drafts, URL navigation and header session endpoint unchanged. Homepage buttons open separate ?booking=1 flow at service selection. Service cards show fixed/From/Quote required catalogue prices and note variable rooms/extras. No availability, instant confirmation or payments implied. Existing enquiry protections retained.

## Validation
PASS PHP syntax and whitespace checks. PASS disposable native PostgreSQL17/PHP profile regression and homepage configuration persistence, legacy validation, length/benefit/image rejection and cross-owner denial (5 tests). PASS browser tests at 1280/390/320px: legacy/custom hero, image and escaped benefits, published service filtering and three price modes, guest/authenticated header, anchors, sticky header, no overflow. PASS unchanged booking step URLs/guarded links/Back/Forward/refresh recovery/expiry and header desktop/mobile guest/auth tests. Tests use synthetic local identities and no provider calls.

Hosted evidence appended after deployment. Existing security advisor baseline: intentional deny-all private tables INFO; pre-existing leaked-password protection disabled WARN (unchanged). This task adds no privilege or policy changes.

## Preview and rollback
Only faraios-accounts-preview.git manual deployment target /faraios.com/_accounts-preview may change branch. Production faraios.git remains automatic main; waitlist preview unchanged. Do not submit hosted enquiry/booking, save profiles, publish pages or edit existing fixtures. Compare full-row count/fingerprints for all 15 public tables before/after. Retain all history.
Rollback application preview to previous feature/booking-details-width-20261114 branch; exact base a8082fd main is a safe equivalent booking baseline. Retain optional metadata validator; old documents remain valid. Do not remove optional content or restore an older validator while any document uses it.

Decision: PASS local validation; hosted preview verification pending. Production NO-GO under owner scope.

## Hosted checkpoint — 14 November 2026

Draft PR22, application candidate 4268a013f2a3fe1b72a2e608827e9b89038d2b46. Plesk manual accounts-preview branch changed to feature/business-homepage-20261114; deployment task completed / Done. Production card still main PR21, waitlist preview unchanged. Optional validator migration installed in faraios-new, recorded version 20261114062432. Repository migration filename aligned with that recorded version. No data or permission updates executed.

PASS hosted guest homepage: business-branded sticky header/navigation/Sign in/Book now; legacy name/description fallback and decorative monogram; three service cards (Standard ZAR505, Deep From ZAR950, Office Quote required); request explanation; existing areas; contact/hours/enquiry/footer. Contact anchor remained below sticky header; no desktop horizontal overflow (document1265, viewport1280). Book now opened unchanged separate five-step service selection. No booking/enquiry submitted. Screenshot docs/evidence/business-homepage-preview.png.

No hosted profile save/publication was performed because owner prohibited existing-record edits. Custom content persistence, input bounds, image/benefit handling, second-owner denial and authenticated avatar were verified locally. Hosted viewport override did not change measured width (1280 even after requested390), including a fresh tab; reset afterward. Therefore no hosted-mobile PASS claimed. Local real-renderer browser coverage passed 1280/390/320 with no overflow, usable sticky header/anchors and shared enquiry dropdown. This is a browser-emulation limitation, not evidence of a layout defect.

PASS record preservation: all 15 public-table full-row count/fingerprints match before/after. Bookings13, booking requests5, staff5, assignments7, enquiries9, quotes7, invoices5, invoice payments9, invoice events22, customers2, profiles4, public pages1, catalogues3, businesses3, waitlist subscribers2. Live public pages0; live booking requests0. All history retained.

Enquiry form now opts into shared ui/select only on preview homepage; original public forms retain default behavior. PHP lint and native enquiry regression PASS after change. Booking assets unchanged.

Decision: **PASS preview implementation and desktop hosted verification.** Owner review pending. Hosted mobile emulation limitation documented; local mobile tests PASS. **Production NO-GO — preview-only scope remains in force.**

## Editable standalone pages — 14 November 2026

Owner requested separate Services, How it works, Areas and Contact pages with owner editing. Extend this same preview-only PR. Routes: /b/{slug}/services, /how-it-works, /areas, /contact. Stable menu labels link to these routes with aria-current; brand returns home and Book now stays at the separate root booking flow. Published snapshot, tenant/environment query and public data allowlist remain unchanged. Unknown subpages/unpublished businesses fail closed. Each subpage has its own title, canonical and description; preview remains noindex.

Profile → Website pages edits each title120/introduction600/body3000 and the three How-it-works step title120/description600 pairs. Empty fields use standard copy. Service cards/prices remain managed in Services & pricing; areas/contacts/hours remain existing public profile fields. Draft previews use saved draft content and draft catalogue with private navigation. Existing versioned Save draft / explicit Publish semantics preserved. Optional strictly validated pages object requires no backfill. Validator-only migration20261114064032; no new tables, grants, policies, gate or record changes. No rich HTML; text/steps escaped. Pending-confirmation notice remains fixed.

Contact form keeps CSRF/origin/rate/field validation and shared dropdown. Contact POST errors and success return to /contact#enquire. Non-contact subpage POSTs return405. Booking assets and step behavior unchanged.

PASS local native profile/homepage JSON/isolation suite5; preview HTTP editor save/reload, saved draft subpage preview, publication snapshot isolation, stale version rejection, field bounds, second owner isolation, all four routes and Contact submission/redirect. All on disposable PostgreSQL/PHP; no hosted fixture changes. PASS browser actual renderer: all four routes, navigation/reload, custom/default text and steps, escaping, correct content-only sections, contact action/dropdown and separate booking links at1280/390/320. PASS booking URL/history/recovery regression and PHP lint/whitespace. Hosted verification pending; preserve all existing records. Production NO-GO.

Hosted standalone-page verification PASS: application revision284a7d8fc11de590c4a8e978c1512d3f461945cf deployed only to manual accounts-preview; Plesk completed/Done. Services direct navigation/reload, How it works→Areas→Contact header navigation, distinct content per route, active links, correct standalone canonicals and Contact form target verified. Contact Book now opens root ?booking=1&step=service with all five progress steps. No hosted forms submitted or records saved. Screenshot docs/evidence/business-pages-preview.png. Native/local edit-save-publish evidence above remains the content-edit verification; no hosted edit claimed under record-preservation constraint.

All15 public-table full-row counts/fingerprints exactly match pre-change baseline. Production main remains a8082fd4a561820a286f17601d29a55d1f93f450. PR22 stays draft/unmerged. PASS preview; production remains NO-GO under preview-only scope.

## Business website SEO upgrade — 14 November 2026

Initial candidate checkpoint (superseded by the hosted checkpoint below): continue draft PR22, same feature branch. **Candidate only: no production merge/deployment, publication, live intake activation, hosted profile save or existing-record change.** SEO migration is prepared and tested locally, **not installed in faraios-new**. Do not deploy this candidate editor before the optional validator migration is installed.

### Implemented behavior

- Profile → Search & sharing: separate title120/description300 for Home, Services, How it works, Areas and Contact. Advice recommends concise original titles (~50–60 characters) and descriptions (~140–160), without treating those recommendations as search-engine limits. Blank settings fall back to the selected page introduction plus genuine public business name; homepage uses its owner introduction/description/name. Unicode-safe whitespace normalization and truncation replace byte slicing. Text is escaped in HTML and JSON-LD.
- Optional owner sharing image: raster PNG/JPEG/WebP, max150KB and2000×2000; required image description. Each page can use Auto (sharing image → hero → logo), Hero, Logo, or None. Image metadata includes genuine dimensions and alt text. No invented stock/business image is supplied. Uses the same draft save, stale-version rejection, explicit publication and snapshot isolation as existing profile content. No backfill, table, policy, grant or activation-gate changes.
- Canonicals, Open Graph and Twitter metadata are absolute URLs from trusted deployment configuration, not request host/query input. Schema graph contains Organization, WebPage/CollectionPage/ContactPage and BreadcrumbList. Only public snapshot details appear; no private account name/email, fabricated address, ratings, reviews, credentials, geography coordinates, price range or LocalBusiness eligibility. A public street address is not currently collected. Visible subpage breadcrumbs agree with the graph.
- Recognized content URLs normalize uppercase slug/page names, trailing slash, direct index.php queries, extraneous query parameters and a noncanonical request host/scheme (when the server exposes the scheme). Validated, environment-scoped snapshot lookup occurs before a301; unknown/unpublished pages return404. Backend failure returns503/Retry-After60 rather than a soft404. Query parameters cannot replace a pretty URL's business/page. Old slugs after republication return404; no historical redirect is fabricated because no slug-history table exists.
- Booking/step queries stay excluded from indexing and are never normalized by the new content redirect logic. Their metadata has no content-page canonical, social tags or business schema. The five-step JS/CSS and request submission contracts are unchanged. POSTs never receive a content normalization redirect; non-contact standalone POSTs remain405.
- Dynamic `/sitemap.xml` replaces the static file through the existing Apache rewrite surface. Live output retains the platform homepage and only currently published live snapshot roots. Preview output is an empty urlset and does not enumerate even live business slugs. Stable keyset pagination covers more than500 businesses. No private IDs, drafts, preview URLs, booking steps or fabricated lastmod dates. Failure returns503. **The existing standalone-page/homepage activation gate remains preview-only**, so `/services`, `/how-it-works`, `/areas`, `/contact` are deliberately omitted from a live sitemap until a separately authorized release makes them live/indexable. More than50,000 URLs fails closed and will need a sitemap index before scaling to that size.
- PHP responses emit meta and HTTP noindex for preview/missing/private/booking pages. Apache adds noindex to all `/_accounts-preview/` responses, including static assets/landing pages. robots.txt remains crawlable so robots can see noindex; authentication continues to protect private content. Hosted Apache header/rewrite verification remains pending.
- One visible H1 per page; service/process headings become H2 on standalone pages, retaining H3 within homepage H2 sections. Skip link now focuses the content target. Added44px header-navigation targets, visible focus and breadcrumbs. Service numbering is contiguous after hidden/archived filtering. All displayed images have descriptive alt text or are decorative branding; hero dimensions come from the actual uploaded image and its layout space remains reserved.
- Darkened secondary text after axe measured4.12:1 card contrast,4.34:1 enquiry helper contrast and4.17:1 footer contrast (all below4.5:1). Changes are scoped to the homepage template. No booking styles changed.
- Services/How it works/Areas avoid unnecessary enquiry sessions and select CSS/JS; Home/Contact keep the form assets. Hero uses high fetch priority, actual dimensions and async decoding. CSS uses system fonts and no external font/animation dependencies. Pinch zoom remains enabled.

### Content guidance

The owner editor now asks for original descriptions of actual services, inclusions/exclusions and useful coverage details. Keep one informative Areas page; do not create near-identical suburb pages or keyword lists. Service cards continue to use the published catalogue, prices and genuine owner descriptions. Separate detailed service/area routes are not auto-generated. Original business content and a suitable owner photo remain owner responsibilities; this preview does not claim a ranking, indexing or rich-result guarantee.

### Verification

PASS disposable native PostgreSQL17 and real PHP HTTP:

- Existing homepage/profile suite5: legacy documents, content persistence, publish snapshots, bounds, logo handling, tenant denial.
- Existing standalone-page edit/save/reload/private-draft/public-snapshot/stale-version/Contact submission suite1.
- New SEO suite5: per-page metadata fallback/custom titles and descriptions; escaped script-like text; actual sharing-image multipart upload/save/reload/publish; image dimensions/alt/noindex; preview/private metadata isolation; second-owner denial; normalized routes/host/trailing slash/query pollution;404 and503; non-contact POST405; all booking variants noindex without schema/canonicals; live draft invisibility; live-only sitemap, unpublish removal, tenant-separated graphs; **501 synthetic businesses spanning sitemap batches**; legacy/valid/invalid native JSON validation.

PASS actual Chromium renderer:

- Existing homepage and four standalone-page suites at1280/390/320; custom/default copy, images, navigation/reload, visible published services/prices, auth identity, contact controls and booking entry.
- Existing booking URL/history/recovery and header suites: guarded steps, Back/Forward, restored fields/options/custom controls, expiry and guest/auth header.
- New accessibility scan: axe-core4.14.0 WCAG2A/AA,2.1AA,2.2AA tags; **15 page/viewport combinations, zero automated violations**. One visible H1, no heading skips, no horizontal overflow,44px navigation targets, and keyboard skip-link focus checks. Automated checks do not replace screen-reader or physical-device review.
- Mobile synthetic lab:390×844,4× CPU slowdown,150ms network latency,1.6Mbps down/750Kbps up, three cold runs each for default and owner-image homepage. Owner image fixture is a1200×630 raster padded to the full150KB upload limit. Observed LCP **0.56–1.24s**, CLS **0**, actual tap interaction durations **32–40ms**. Exact rerun values are in `docs/evidence/business-seo-checks.json`; image `docs/evidence/business-seo-mobile.png` shows the tested local Services page. Pointer-hover events without an interactionId are retained in raw evidence but are not counted as INP interactions.

These are **local fixture lab measurements**, not hosted/field Core Web Vitals or a Lighthouse100 score. Native HTTP tests exercise real PHP/database code with simulated Auth/PostgREST transports; browser fixtures exercise the actual template/CSS/JS with synthetic identities, catalogue and raster. Hosted API latency, real owner content/photos, Apache rewrites, social crawlers and Google indexing remain unverified for this candidate. No real customers or providers were contacted.

Reproducible commands (set PHP_BIN,PG_BIN,PG_LIB,LD_LIBRARY_PATH,PLAYWRIGHT_MODULE,BROWSER_BIN for the available runtime):

```sh
python tests/homepage.py
python tests/business-pages.py
python tests/seo.py
node tests/homepage-browser.cjs
node tests/business-pages-browser.cjs
node tests/booking-history-browser.cjs
node tests/booking-header-browser.cjs
AXE_MODULE=/path/to/@axe-core/playwright node tests/seo-browser.cjs
```

The axe browser test requires Playwright, `@axe-core/playwright@4.14.0`, Python with Pillow, Chromium and PHP. These are verification dependencies only; no runtime package/bundle is added to the website.

### Initial hosted status and gate — superseded by the checkpoint below

Read-only review confirms the hosted Services page is still the preceding candidate (H3 cards, no JSON-LD), not this SEO build. Automatic approval review denied observation of the signed-in Plesk administration origin `https://so1.cloud-wex.com:8443` because admin-origin access was not explicit in the preview-only request. No alternate admin surface or deployment workaround was attempted. A specific owner authorization for that administration origin is needed to update **only** manual `faraios-accounts-preview.git` → `/faraios.com/_accounts-preview`, then verify hosted rendering, metadata, headers, redirects and sitemap. Production `faraios.git`/main and waitlist preview must remain untouched.

Hosted Supabase access in this task was read-only: existing validator/table inventory, security advisor baseline and counts. All15 public-table counts match the previous documented checkpoint: requests5, assignments7, bookings13, customers2, enquiries9, invoice events22, invoice payments9, invoices5, profiles4, public pages1, quotes7, catalogues3, staff5, businesses3, waitlist subscribers2. No full-row fingerprint comparison is claimed for this SEO task; **no hosted schema/data write was executed**. Existing security-advisor warning about leaked-password protection is unchanged; its remediation remains https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

After admin authorization: capture full-row preservation fingerprints; apply only the backwards-compatible pure JSON validator migration through Supabase; verify the validator and unchanged permissions; update only the manual preview application; test all hosted routes/headers/sitemap/booking entry without submitting forms or saving existing profiles; compare fingerprints; retain all test history. Do not publish a business or activate live intake. If blocked, leave this candidate in draft PR22 with this limitation. Production remains outside scope.

### Hosted SEO checkpoint — authorized and verified, 14 November 2026

Owner explicitly authorized `https://so1.cloud-wex.com:8443` access to complete the preview deployment. The earlier access block is resolved. **Application candidate9ea17d008c5e6475508bbf9ead11226285e74409 is deployed only to the manual accounts-preview target.** Plesk preview Pull now retrieved “Add preview business website SEO and isolated verification”; the scoped preview Deploy now completed with “Deployment task has completed / Done”. Production card remains automatic main/PR21, unchanged; waitlist target unchanged. PR22 remains draft/unmerged.

The pure backwards-compatible validator was installed in faraios-new through the migration tool, recorded version **20261114071849** (`business_website_seo`). The repository migration filename now matches that version. Verification against existing documents without saving them: invalid_existing0, accepts_seo true, rejects_invalid true. Function ACL, SECURITY INVOKER and empty search_path are unchanged. No tables, policies, privileges, business snapshots or activation gates changed.

**PASS25 read-only hosted HTTP checks**, recorded in `docs/evidence/business-seo-hosted-checks.json`. Reproduce with `python -u tests/seo-hosted.py` (GET only):

- Home and all four standalone pages200; distinct titles, useful descriptions, exact canonicals/og:url, noindex in meta and HTTP headers; Organization/page/breadcrumb graphs use the published demo business only. No fabricated ratings or address. Services/How it works/Areas do not load select.js.
- Six normalization/pollution URLs301 to their correct business/page canonical; trailing slash, uppercase, direct index and query pollution cannot select another business.
- Unknown page and business404, noindex and no misleading canonical/schema.
- Booking root and all five step query URLs200/noindex, with no content canonical, social URL or business schema.
- Preview sitemap200 and empty, no business or live enumeration. Static preview landing/CSS have noindex headers. Private Profile303 and Sign in200 are noindex. Unchanged production sitemap still contains only the platform homepage; **the candidate's dynamic live-mode implementation remains locally verified and undeployed to production**.

**PASS hosted browser mobile checks at390×844:** this turn's viewport override took effect (innerWidth390). Home and all four standalone pages fit without horizontal overflow; active navigation, distinct content and single H1 confirmed. Services and process pages now have H2 child headings. Contact Book now opens root service selection with all five progress stages (Service, Details, Schedule, Contact, Review). No form submitted, no existing profile saved, no publication or live intake activated. Temporary viewport was reset and the tested homepage was left open for review. Screenshot `docs/evidence/business-seo-hosted-mobile.png` is the actual hosted mobile homepage, not a local fixture.

**PASS record preservation:** all15 public-table counts **and full-row fingerprints** are identical before/after migration and hosted testing. Evidence `docs/evidence/business-seo-preservation.json`. Requests5, assignments7, bookings13, customers2, enquiries9, invoice events22, invoice payments9, invoices5, profiles4, public pages1, quotes7, catalogues3, staff5, businesses3, waitlist subscribers2. Public snapshots remain preview1/live0. All test history retained. Security advisor unchanged (13 existing deny-all private-table INFO findings, existing leaked-password protection WARN; remediation https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Remaining limitations: custom SEO/image edit-save-publish behavior and second-owner denial were tested with disposable local identities; no hosted edits were performed under the record-preservation constraint. Live-mode dynamic sitemap and standalone website activation are not production-released. Lab accessibility/performance evidence remains separate from field Core Web Vitals, physical-device/screen-reader testing and social crawler behavior. No indexing/ranking/rich-result guarantee. Decision: **PASS preview SEO implementation and hosted verification. Production merge/deployment/publication remains outside scope.**
