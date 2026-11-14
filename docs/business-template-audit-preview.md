# Business template audit fixes — preview only

Owner scope: 14 November 2026. Base main `9e4c42d` (merged PR22). Preserve every record, Shalean's live publication, existing content, draft/publish/version controls, tenant/environment boundaries and the separate five-step booking journey. No production merge/deployment, profile save/publication or live intake activation authorized.

## Changes

1. Live buttons lead to Contact enquiries. Preview booking buttons appear only when the read-only availability RPC confirms the ingress gate and a published active service. RPC failure fails closed to enquiry; direct unavailable booking GET/HEAD returns303 to Contact. Unknown/unpublished businesses remain404. Live remains disabled by the unchanged authoritative database gate.
2. Empty services show a useful enquiry action. The enquiry service dropdown exists only when actual visible published choices exist. Forms retain existing protections.
3. Logos retain genuine image dimensions and proportional desktop/mobile display. Compact branding accommodates long names. Decorative fake hero messaging removed; no-photo fallback uses a compact text hero. No photo or business claims fabricated.
4. Scoped spacing, responsive type, compact coverage chips and footer navigation. Owner-authored coverage lines remain separate groups; no inferred region names. Home Services/Areas links lead to standalone pages. Existing page-title controls now also label corresponding home sections.
5. Optional public `presentation` fields: bounded forest/navy/plum brand palette, serif/sans headings, separate opt-in international WhatsApp number, public street/city/region/postal/country. No fields are auto-filled from prose or private business records. Editor guidance warns that these are published public details. Existing draft/save/publish/version and ownership RPCs govern persistence. Existing documents remain valid.
6. Published explicit street/city/country allow LocalBusiness/PostalAddress markup and only existing genuine hours. Without these use Organization. Published contact address is also visible; no guessed address, rating, coordinates, price range or eligibility claim. Small/logo social images use summary cards; sufficiently large actual images use large cards. Existing owner sharing-image upload/alt/dimensions controls remain.
7. Service-card booking links carry only the public service ID; server validates it against that business snapshot. Explicit card entry overrides saved service choice, preserves other draft fields, and removes entry parameter as the booking URL updates. POST errors stay authoritative. Five steps/options/financial calculation remain unchanged.
8. All dynamic HTML and images retain no-store (sessions may add no-cache/must-revalidate). No public/shared fragment cache introduced. CSS/changed booking JS have new version URLs. Session identity remains the private same-origin header endpoint. Fresh publication/unpublish lookup is performed on each request.

## Database preparation

Backwards-compatible validator plus boolean-only public availability RPC installed in faraios-new, migration20261114085730. No table/policy/data/gate change. Validator remains SECURITY INVOKER with empty search_path and existing ACL. Availability uses a public SECURITY INVOKER wrapper over a private read-only SECURITY DEFINER lookup (follow-up migration20261114090043), with empty search_path and explicit execution roles, and exposes only whether an already published environment/slug has intake and active services. No private IDs or documents returned. Existing documents all validate. Verified demo=true, live Shalean=false, unknown=false; live gate=false/preview=true unchanged.

## Verification

Local disposable PostgreSQL17/real PHP: existing homepage/profile5, release journey1, SEO5; new template test validates optional fields/rejections, native public RPC roles, empty service handling, schema, real published service preselection, gate changes/failure cases, draft invisibility and second-owner denial. No real provider calls or customers contacted.

Actual Chromium: Home and standalone pages at1280/390/320, existing booking URL/history/recovery and new empty/closed/wide-logo states. Automated axe zero violations in15 existing page/viewport combinations plus9 new state/viewport combinations. No horizontal overflow. Local throttled mobile lab, six cold runs: LCP0.57–1.25s, CLS0, measured interactions32–40ms. Evidence in docs/evidence/template-performance.json and template-audit-browser.json. These are synthetic fixture lab measurements, not field Core Web Vitals, a Lighthouse100 claim or actual social crawler validation. Physical-device/screen-reader checks remain unverified.

## Content versus defects

Shalean's published service descriptions in prose are content, not published catalogue services. The template must offer enquiries until the owner explicitly configures/publishes catalogue entries and booking is separately authorized. Hours are currently unspecified, so no opening-hours claim is added. WhatsApp/address exist in owner prose but are not automatically parsed into new fields. No owner content, logo, hero, SEO image or publication is rewritten. The new controls can be used later through explicit draft/save/publish actions.

## Preview gate

Hosted preview deployment and read-only verification pending. Production remains NO-GO until owner reviews the tested preview and explicitly authorizes release. Application rollback is the previous preview feature/business-homepage-20261114; keep the additive validator/RPC so no optional saved data is invalidated. No rollback should erase records or replace published snapshots.

## Hosted checkpoint — 14 November 2026

Draft PR25, application candidate02832f36e6ffa17b4307c5d1160c269a3e3809cb. Plesk manual faraios-accounts-preview.git now selects feature/business-template-audit-20261114 and its Deploy now completed / Done. Production automatic-main and waitlist-preview targets are unchanged. A transient branch-selector interaction selected an old manual-preview branch before deployment; it was corrected to the exact tested candidate before Deploy now. No old candidate was deployed.

PASS12 GET-only HTTP checks (`python tests/template-hosted.py`, evidence template-hosted-checks.json): five routes/canonicals/noindex/no-store/business-only graph; preview CSS/booking JS exactly match candidate; production CSS/booking JS exactly match base main; unknown business including booking query404; unknown subpage404; live Shalean slug not exposed in preview404; valid published demo service preselected in booking; production Shalean page remains on its preceding application.

PASS actual hosted browser: five pages at390px, correct page titles/canonicals/noindex and no overflow; Deep cleaning card opens root booking with that exact service selected and all five progress stages. No submission. Reset viewport and left hosted homepage open for review. Screenshot template-hosted-desktop.jpg shows the actual hosted demo, not Shalean content. Empty/disabled service states, wide logos, custom branding/address/WhatsApp editor save/reload/publish and ownership denial were tested with isolated synthetic data; no hosted existing profile edit or publication was performed.

PASS preservation: all15 public-table full-row counts AND fingerprints exactly match pre-change baseline, including Shalean's live snapshot and all test history. Evidence template-preservation.json. Booking requests5/bookings13/enquiries9/public pages2 unchanged. Live request gate remainsfalse, previewtrue. New optional fields were not populated in existing profiles. After the private lookup/invoker wrapper adjustment, security advisors match the preceding baseline:13 existing deny-all INFO findings and existing leaked-password-protection WARN, no new finding. Existing warning guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

The application in preview uses the existing demo snapshot. Shalean's live snapshot was deliberately not imported/copied to preview. Its empty-service/disabled-intake behavior is verified through the equivalent isolated fixtures. Screenshot/mobile capture quality and fixture measurements do not establish physical-device/screen-reader results, hosted load performance or field Core Web Vitals. Public social-crawler behavior remains unverified. Owner content gaps remain listed above.

Decision: **PASS preview implementation and verification; ready for owner review. Production merge/deployment remains NO-GO until separately authorized.**

## Button icons and typography refinement

Owner requested alignment with shalean.co.za. Read-only computed-style inspection at1280/390px: navigation/buttons14px, body16px, desktop lead18px/28px, service headings24px and primary hero48px desktop/24px mobile; section headings approximately46px desktop/32px mobile. Applied that scale to the reusable template with a local system sans-serif stack; Shalean's Geist font is not downloaded or claimed to be identical. Explicit owner serif choice remains supported. Helpers increase to14px and mobile inputs remain16px.

Replaced platform-dependent Unicode action arrows with consistent18px SVG icons (16px in compact mobile header): calendar for booking, message for enquiry, arrow for onward/send actions, external-link for website and up-arrow for top. Icons inherit text colour, reserve space and are hidden from accessible names; labels remain visible. Button/icon gaps normalized,44px targets retained. Booking flow typography and business records unchanged. CSS version advanced to template-type-2 for public and private preview references.

PASS PHP lint, whitespace, existing standalone-page browser suite and empty/closed/wide-logo checks at1280/390/320;24 automated axe scans zero violations. Latest synthetic mobile LCP0.58–1.26s, CLS0, observed interactions32–48ms. Initial audit screenshots/performance evidence above remain historical; final typography screenshot is captured from hosted preview after deployment. No field-performance claim or production release.
