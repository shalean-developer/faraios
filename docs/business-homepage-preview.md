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
