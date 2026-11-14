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
