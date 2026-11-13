# Online booking requests — FaraiOS New

Owner scope: 13 November 2026. Base main PR16 f28830d373b77b70ca6ff2e4c1f1248ecfdcf663. Inspected branch docs/private-style-release-20261113 production closeout: authenticated styling PASS. Fresh Supabase rxelmugnucfajrqmphhe only. No production release authorized.

## Smallest complete implementation

Published /b/{slug} links to ?booking=1. One published service, contact, address, preferred future date/time and requirements. Existing integer minor-unit prices and zero-decimal currency presentation retained. Fixed / From / Quote required shown; service/currency/zone snapshot verified again transactionally on submit. Stale price/zone/service changes reject rather than silently reprice. Request remains Pending until owner review; no capacity reservation, payment or notification. Desktop summary sticky in flow; mobile compact expandable summary above form, never fixed over controls. No sticky summary on private/manual booking pages.

New Requests sidebar page offers review, decline, create/open quote, accept, and create/open booking. Quote action copies customer/items to the existing quote editor and links the enquiry. From/quote modes require a customer-accepted quote. Fixed requests can be owner accepted at their captured price. Owner acceptance and conversion require a review checkbox. Atomic conversion copies address, preferred instant, saved zone, service duration and agreed document. Per-business serialization shared with existing booking conversion, unique quote/bookings links and repeat conversion return the original booking, including cancelled history. Existing quote conversion detected and linked without modifying it. Linked customer ID retained where present. No matching customers by name.

A past preferred instant cannot become a booking through this flow; owner must review with the customer. This version does not provide availability selection or request rescheduling. Confirmations are handled by the owner outside this application; there are no automatic messages.

## Security and schema

Additive CLI-generated migration 20261113183501_online_booking_requests. Preview gate true; live gate false. No existing records updated. Owner-only SELECT RLS; no direct DML/anonymous table access. Invoker public RPCs delegate to narrow unexposed request_private functions, fixed search_path and explicit owner/is_anonymous checks. Public function deliberately permits bounded anonymous intake through existing enquiry validation/caps (30 per business/hour; 5 per contact/hour), published row lock and UUID idempotency. PHP preserves separate public session, CSRF/origin, honeypot, 2-second age, one-hour expiry, body/field bounds and hashed-IP limit. No service role credentials. Session snapshot hash detects stale multi-tab forms; GET refreshes snapshot. Inputs escaped; JS uses textContent. No new dependencies in application.

## Local verification

PASS native disposable PostgreSQL17.11 / PHP8.4.27 HTTP tests/requests.py: live gate denial; malformed/past schedule, service, snapshot, zone, currency, contact and bounds rejection; identical retry; cross-owner/anonymous/direct writes denied; accept/decline/stale state; simultaneous duplicate conversion; exact price/zone/address/duration; quote/from requirements; existing quote lifecycle with customer acceptance and agreed amount; public timing/CSRF/contact retention/redirect/no repeat; owner page and cross-owner UI denial; helper403; unpublished page404. Auth/PostgREST transport simulated, database roles/RLS real.

Regressions PASS: bookings, quotes, enquiries, staff, invoices, dashboard. PHP lint PASS; whitespace PASS. No paid GitHub Actions. No Resend access or waitlist webhook/recovery checks. Local inherited harness initializes inert existing schema; no actual provider calls or waitlist journey execution.

## Hosted baseline before additive migration

Connected Allanux → fresh Plesk session: production faraios.git follows main PR16 automatically; faraios-accounts-preview.git manual /faraios.com/_accounts-preview at private-style branch; waitlist preview separate. Fresh Supabase history through dashboard_live_intake. Only public page: preview faraios-demo-cleaning; no live pages.

Existing full-row deterministic fingerprints (all environments, before new preview fixtures): bookings11 80c0426e875dbde667e90135a9a25b8e; invoices5 74925701dba50667f000f9cdff5ac737; payments9 37789d4f7c3ae4bf7a7f831a32fe57dd; staff5 9c2ea5a2b5cc12a8996348fe2192f76c. Compare existing-ID subsets after tests; new labelled preview request/bookings may be retained without changing original rows.

## Preview/release and rollback

Install additive schema through connected fresh Supabase SQL editor, record history after success; preview writes only. Deploy only manual accounts-preview repository from feature/online-booking-requests-20261113. Verify published fictional demo intake, owner review/quote/decline/accept/conversion, mobile layout and native rollback-only permissions. Retain preview fixtures; mark new verification bookings Cancelled after conversion. Do not modify existing bookings, invoices/payments/staff, publication or accounts. Show tested preview to owner before production.

Production NO-GO until owner preview review and explicit Deploy instruction. Future release must enable live request gate separately after approval. Rollback application to PR16; disable request_private.ingress for affected environment; retain new schema and all requests/quotes/bookings. Never drop/reset history. No homepage/waitlist changes.

Decision: PASS local validation; hosted preview verification pending.

## Hosted checkpoint — 13 November 2026

Candidate 1f0676eaed611455dc668ee4a49abccdf4421516, draft PR17. Connected Allanux reseller login opened fresh Plesk session. Only accounts preview branch changed and deployed; Plesk returned Deployment task has completed / Done. Production remains main PR16; waitlist preview unchanged.

Installed schema in fresh project through connected SQL editor. First Monaco fill appended to prior SQL, causing a syntax error before any execution. Replaced all editor text with explicit select-all/type; migration succeeded. History entry recorded. Verified RLS=true, anon SELECT=false, authenticated direct UPDATE=false, preview ingress=true, live ingress=false. Public demo snapshot unchanged: Standard505.00 fixed120m, Deep From950.00 240m, Office Quote required180m, ZAR, Africa/Johannesburg.

Hosted Chrome PASS: existing fictional demo → Request a booking; all three published service price modes; missing email/phone rejection with all entered fields retained; fixed-service submission by Fictional Booking Preview Test (booking-preview@example.test), address123 Fictional Test Road, Cape Town, preferred15 Dec2026 10:30; explicit pending-confirmation success. Request cec79b9c-da8a-4cbb-8908-e48499c111fe appeared once in real signed-in preview owner Requests page. Refresh cleared success without another submission. Owner detail retained exact details. Accept without review checkbox rejected; checked acceptance persisted as Accepted. Conversion produced booking6f7fdd8e-08f7-4a9f-a266-1d1a6b1e9ea5 with correct customer/address/time/zone, duration120m, exact ZAR505.00 and no assigned staff. No notification sent.

Submitted this NEW preview booking's status Cancelled using the existing booking editor. Save request completed, but subsequent reload/read, repeat-open and mobile test call timed out without returned evidence. Therefore cancellation persistence, repeat-open hosted verification and mobile results are PENDING, not PASS. Do not create another verification booking. Reopen this exact booking and confirm Cancelled; correct only this new fixture if needed. Existing protected bookings/invoices/payments/staff were not deliberately edited.

Browser subsequently reset and reported that the originating browser context is unavailable. No further hosted write/read, mobile screenshot, protected-row comparison, advisor review or rollback-only hosted script execution could be completed. Need user to reopen this ChatGPT conversation in connected Chrome, then resume using existing tabs or new tabs in the same browser. The signed-in preview owner session was available before the disconnect (FaraiOS Preview Test Business). Do not request a different account or publish Shalean.

A desktop screenshot was visually inspected in tool output: form and separate sticky right summary rendered correctly. It was not saved as a durable screenshot artifact; no screenshot file link claimed. Local Chromium responsive attempt failed at process launch due restricted socket permissions; no local/mobile visual PASS. The temporary browser viewport may or may not have been applied before timeout: reset viewport on reconnect.

Additional local PASS: customers regression; tests/requests-hosted.sql was executed successfully in disposable PostgreSQL against the equivalent local fixture (environment/slug/price substituted). It covers rollback-only anonymous submit, identical retry, direct-write denial, premature conversion denial, accepted conversion repeat and exact price, cross-owner read/action denial. Hosted execution remains pending; these identities are simulated JWTs, not a second real browser login.

### Remaining acceptance checks

1. Reset browser viewport. Confirm NEW booking6F7FDD8E is Cancelled and retained. Requests must open the same existing booking; no new conversion fixture.
2. Hosted quote-required request: submit a second labelled preview fixture, create/open quote; verify copied customer/service, enter offered price, send/get secure link, customer accept, owner accept/convert. Cancel only its newly created booking afterward. Alternatively mark documented hosted quote coverage pending; native complete lifecycle already PASS.
3. Hosted decline request and status persistence; retain fixture. Native decline/stale/isolation cases PASS.
4. Mobile390 public compact summary expand/collapse, live field updates, no overlap/overflow/hidden submit. Desktop sticky scrolling and owner Requests single heading/sidebar/overflow. Save screenshots; reset viewport; leave customer and owner preview tabs open for review.
5. Run tests/requests-hosted.sql through connected SQL editor (ROLLBACK). Inspect security advisors and request_private unexposed Data API schema without changing unrelated settings.
6. Compare baseline original-row fingerprints. For bookings exclude ONLY new id6f7fdd8e-08f7-4a9f-a266-1d1a6b1e9ea5 and any subsequently recorded NEW verification booking IDs. Expected original bookings11 hash80c0426e875dbde667e90135a9a25b8e; invoices5 hash74925701dba50667f000f9cdff5ac737; payments9 hash37789d4f7c3ae4bf7a7f831a32fe57dd; staff5 hash9c2ea5a2b5cc12a8996348fe2192f76c. Check live requests0, request live ingressfalse, public live pages0, rollback probe absent, existing preview fixtures intact.
7. Update evidence and show owner tested preview. No production merge, deployment or gate activation until explicit owner instruction.

Decision: **CONDITIONAL PASS — preview deployed, core hosted flow verified; remaining acceptance checks pending browser reconnection. Production NO-GO.**


## Reconnected hosted verification — 13 November 2026

Owner authorized completion of PR17 preview checks, retaining all records and showing preview before production.

PASS: reconnected original Chrome. Original request CEC79B9C opens booking 6F7FDD8E (6f7fdd8e-08f7-4a9f-a266-1d1a6b1e9ea5), Cancelled persisted. No replacement booking created for it.

PASS hosted quoted lifecycle: fictional request 6e7d4c45-134c-474d-864c-c368bbab9290, quote 4bdd65e2-f0d8-46ab-9a77-d6aa4dafd28e copied customer/service/requirements. Saved offered ZAR1250.00, marked sent (no email), customer accepted via secure preview link, owner reviewed/accepted and converted to f9b930e0-6604-40c6-aa83-1905967d3e4e. Exact address, Africa/Johannesburg 16 Dec2026 11:00–14:00, 180m and agreed amount retained. This NEW booking Cancelled and reload verified. All fixtures retained.

PASS decline: fictional From-price request 96f71cc7-ff6d-4f2c-9b5b-e271b3960906 retained as Declined after reload.

PASS desktop summary computed sticky top20px and remained top20px after scrolling; owner Requests one H1, sidebar and no horizontal overflow. PASS fresh mobile tab 390x844, document width375, compact summary above form, expand/collapse and service/address/date/time live updates. Screenshot showed reachable unobscured submit at bottom. Claimed-tab viewport initially inconsistent; fresh tab resolved and screenshots visually inspected. Viewport reset. Customer and owner previews left open for review.

PASS tests/requests-hosted.sql executed through Faraios Supabase connector in rxelmugnucfajrqmphhe: rollback-only lifecycle, retry idempotency, permissions and business isolation. Simulated JWTs, not second real login. Probe absent after rollback. Data API UI exposes only public and graphql_public; request_private unexposed. Security advisors: intentional deny-all private tables INFO; leaked password protection disabled WARN, unchanged.

PASS original-row fingerprints exactly match baseline: bookings11 80c0426e875dbde667e90135a9a25b8e (exclude ONLY the two new IDs above); invoices5 74925701dba50667f000f9cdff5ac737; payments9 37789d4f7c3ae4bf7a7f831a32fe57dd; staff5 9c2ea5a2b5cc12a8996348fe2192f76c. Preview ingress true; live ingress false; live requests0; live pages0. No original records modified or deleted.

Decision: **PASS hosted preview functional verification. Owner preview review pending. Production NO-GO until explicit owner deployment instruction.** No merge, production deployment or gate activation performed.


## Guided flow preview — 13 November 2026

Owner authorized Zenbooker-style guidance with FaraiOS branding; production remains prohibited. Deployed candidate ecf50e1657949abf81a1b3a61298e92fef7a6309 through Plesk faraios-accounts-preview.git only. Pull showed latest guided-progress commit; Deploy returned completed / Done. Production main PR16 and both live intake/publication gates untouched.

Implemented Service → Details → Schedule → Contact → Review with Back/Continue, current-step indicator, validation and retained DOM entries. Review uses textContent for complete service/price/address/requirements/schedule/time-zone/contact summary. Enter before Review advances only after validation. Server rejection retains POST values and opens first client-invalid step. No-JavaScript fallback shows the full validated server form. Original request_submit, database/RLS/idempotency and owner actions unchanged. No migrations, dependencies, payments or notifications.

Location coverage is presently free-text business service areas, with no structured coverage rule. Details displays the configured areas and states the business must confirm coverage. It deliberately makes no automatic location eligibility claim.

PASS local: PHP syntax, JS syntax, diff whitespace; native PostgreSQL17/PHP tests/requests.py passed twice, including lifecycle, security/isolation, idempotency and HTTP retention. The last rerun included final PHP progress markup and CSS; subsequent change only bumped static asset cache versions.

PASS connected Chrome hosted: empty Service/Details blocked; fixed ZAR505, From ZAR950 and Quote required summary updates; address and schedule retained after Back/Continue; missing contact channel blocked at Contact; complete Review displayed exact fictional details; desktop sticky summary stayed top20px on scrolling. Final indicator keeps all five steps in one row. Mobile390 screenshot confirmed compact expandable summary, expand/collapse, all five steps, unobscured Back and Send controls. Viewport override was reset afterward.

PASS final mobile submission: request cdcd8275-548f-4c1d-98f4-ca7fd79a52e4, Fictional Guided Preview Test / guided-preview@example.test, Standard cleaning ZAR505 /120m, 123 Fictional Guided Test Road, Claremont, 18 Dec2026 10:30 Africa/Johannesburg, requirements "Fictional guided-flow preview verification. Preserve this request." Public confirmation explicitly pending; refresh safe. Signed-in owner Requests list contained exactly one new row; owner detail matched all fields and exposed existing quote/decline/review-checkbox/accept controls. New request retained Pending confirmation for owner review, not converted.

Reopened both existing verification bookings read-only: 6F7FDD8E and F9B930E0 still Cancelled and retained. No existing record edits/deletions; no new bookings/invoices/payments/staff. Prior full protected-record fingerprints remain historical evidence from the earlier hosted checkpoint; they were not rerun for this presentation-only change.

Customer customer-facing preview and signed-in owner detail left open; screenshots visually inspected. Owner preview review pending. PR17 stays draft. **Production NO-GO: no merge, production deployment or live-intake activation.**


### Desktop width correction

Owner reported narrow desktop layout. Preview candidate d987a3343db80ad1699d7325655b7c13faf13fd0 deployed only through accounts-preview. Booking-only canvas expanded from inherited824px to1280px; summary fixed300px, form uses remainder, reduced card padding32px, desktop action sized to content. Responsive stacked breakpoint900px shared by CSS/JS. Removed inherited details top border/spacing inside summary. Asset cache version bumped.

Hosted PASS: at1280 viewport, form815px and summary300px, no horizontal overflow. Fresh desktop full-page screenshot inspected: wider form, single-row progress and right summary; mobile390 screenshot inspected: stacked compact summary, progress fits, Continue reachable. Temporary viewport reset; customer preview left open. Presentation-only change; no records created/edited/deleted, no production merge/deployment/intake activation. Prior lifecycle/security tests retained; no additional database test required for width change.


### Header stepper and published identity — implemented, deployment pending

Owner requested stepper between FaraiOS logo and replacement avatar/author. Booking header now server-renders the single progress navigation between logo and published business identity (published logo/avatar, initial fallback, published business name). No private owner/customer identity is fetched or exposed. Mobile uses logo and identity on row1 and progress on row2. Existing Back/Continue updates the header indicator through document-scoped progress lookup. Body duplicate removed. Nonbooking public pages unchanged.

PASS PHP lint for b/index.php and account/requests-core.php, JS syntax, whitespace; native PostgreSQL/PHP tests/requests.py request/security/lifecycle regression. No records modified. Connected Browser tools are unavailable in this session; local Chromium executable unavailable. This change is saved on PR17 branch but NOT deployed to hosted preview or production and NOT visually verified. Resume by deploying only faraios-accounts-preview.git, then verify desktop centered header, published avatar/name, mobile390 two-row header, step changes and no overflow. Previously hosted preview remains desktop width candidate d987a334. No production release authorized.


### Header hosted verification completed

Browser reconnected; pulled e198c0c9 branch evidence and deployed accounts-preview only, Plesk completed/Done. Application candidate0401840. Hosted PASS: one progress navigation inside header, between logo and published business avatar/name; forward to Details updates header current step2, Back returns Service. Desktop screenshot inspected. Mobile390 full-page screenshot inspected: logo and avatar/name row1, all5 steps row2, compact summary and reachable Continue; document/header width390, no horizontal overflow. Temporary viewport reset; customer preview left open. No request submission or record changes. Header preview ready for owner review; production remains unchanged, no merge or live-intake activation.


### Number-only circular progress

Owner requested avatar-like numbered circles. CSS-only progress treatment plus asset cache bump b8ee91f deployed to accounts-preview only; Plesk completed/Done. Five circles measured40x40px with50% radius; labels visually hidden but retained for assistive technology. Current and completed colors retained. Hosted forward/Back active-step updates PASS; desktop no horizontal overflow. Desktop and mobile390 screenshots inspected; compact number-only header and identity fit. Viewport reset; customer preview left open. No submissions, record changes, production merge/deployment or gate activation.


### Labelled circles with connecting line

Owner requested labels below each number and one line hidden within circles. Preview application313883a deployed only to accounts-preview; Plesk completed/Done. Grid positions circles and labels; continuous connector lies behind opaque circle fills, visible only in gaps. Desktop and mobile390 screenshots visually PASS: all5 labels visible, line stops visually at each circle edge, avatar/header retained. Temporary viewport reset; preview left open. CSS-only plus cache version update; no records changed, no production release.


### Selectable service cards

Inspected requested Sweepsouth /accounts/launch in connected browser: icon/name service tiles and selection action. Adapted pattern with original FaraiOS line icons/branding, published catalogue only, native radio cards, configured Fixed/From/Quote price, duration and published description. Replaces dropdown, retains same service POST name/id and existing server validation. No reference assets or service catalogue imported.

Preview candidate5a12a3d deployed accounts-preview only; Plesk Done. PHP/JS syntax and whitespace PASS; native PostgreSQL/PHP tests/requests.py PASS. Hosted PASS fixed/quote summary updates, From display, Continue to Details and Back preserving selected service. Desktop3-column and mobile390 2-column screenshots inspected, visible selected border/radio, summary and reachable Continue. No new submission or record changes. Viewport reset; customer preview left open. No production merge/deployment/intake activation.


### Compact tiles matched to measured reference

Owner removed all card pricing/duration/descriptions; cards now icon/name only, pricing remains in summary and review. Then measured Sweepsouth /accounts/launch actual service button128x128px, radius8px, parent gap8px. Applied matching fixed dimensions/gap/radius with original FaraiOS icons. Hosted candidate f5f7af88 deployed accounts-preview only; Plesk completed/Done. All3 FaraiOS cards measured128x128px/radius8px, grid gap8px. Desktop screenshot visually inspected. Prior compact selection check confirmed summary ZAR505 still updates. No records changed or submitted, no production release. Preview left open for review.


### Booking introduction cleanup

Owner requested removal of Request a booking title, introductory pending-confirmation paragraph, Business page back link and body Step1of5 text. Preview candidate4f2968e deployed accounts-preview only; Plesk Done. Removed visible introduction/link; hidden step-status remains for existing JS updates. Booking region retains accessible label; header stepper, summary pending-confirmation wording, review and success notices preserved. Hosted DOM and desktop screenshot PASS requested text absent. No submission/record changes; production unchanged.


### Summary hidden during Service only

Owner requested summary hidden on service selection. Candidate5c20217 deployed accounts-preview only (Plesk Done). Existing show(index) sets summary.hidden only when index0 and restores on subsequent steps; service layout uses full width. JS syntax PASS. Initial hosted Service complementary count0 confirmed summary hidden; browser then returned Chat API failure and stalled on follow-up before Back/Continue screenshot verification. Full navigation verification remains pending if connection cannot recover. No requests/records modified; production unchanged.


### Direct service-card progression — 14 November 2026

Owner requested hiding Service Continue and business name. Application2f9b282 deployed accounts-preview only; Plesk completed/Done. Service-card click validates and advances to Details; repeated click on already-selected card after Back also advances. Continue remains on later steps. Header published business name hidden; avatar retained. Hosted PASS no Continue/name on Service; radio click and label/name click each advance to Details; Details shows summary/current step2 and Back/Continue; Back returns Service with saved selection and hidden summary/Continue. This completes previously pending summary Back/Continue verification. Desktop screenshot visually inspected. No submission/records modified, no production release.
