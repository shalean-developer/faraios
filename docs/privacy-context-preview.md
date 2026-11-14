> Production application release is now owner-authorized. See [business-website-release.md](business-website-release.md). The preview-only checkpoints below are historical.

# Contextual privacy links — preview only

Owner instruction: “FIX THEM SO THAT THEY DO CORRECT JOB”, following the audit of privacy URLs and repeated links. Continue PR22 and its preview-only/no-record-change scope. No production merge/deployment or business publication.

## Behavior

One reusable privacy notice with stable sections: overview, accounts, enquiries, bookings, business-records, waitlist, cookies, storage and rights. The section menu, headings and focus targets work at mobile widths. General website/business footers lead to overview; account links lead to accounts; enquiry and booking notices lead to their own sections; waitlist form, confirmation/withdrawal pages and emails lead to waitlist. The existing live canonical is retained; both preview mounts remain noindex.

The notice now distinguishes FaraiOS platform/account/security/waitlist processing from the selected service business's use of customer service records. It identifies submitted booking information, required versus optional details, review/confirmation purpose, price/time-zone snapshots, necessary sessions, provider categories/location, retention differences, rights/contact routes and the Information Regulator. It describes actual sessionStorage draft behavior: restore only within30 minutes; expiry checked on reopening rather than an automatic background timer; successful submission clears the draft. Waitlist withdrawal does not cancel a booking or delete an account.

Enquiry/booking notices name the business from the selected public snapshot (escaped), never from an account/private table or query-supplied name. Existing callers without a public name keep the “this business” fallback. These notices and signup/waitlist form-level links open a new tab with noopener/noreferrer and announce that behavior. The booking notice sits outside the hidden step panels, so its link is available from Service through Review, before address/contact entry. Opening the notice neither submits the form nor copies the parent's booking draft into the policy tab.

Waitlist HTML and plain-text email privacy URLs now use the configured environment's base URL plus /privacy.html#waitlist. HTML URLs are escaped. Existing consent wording/version, token links, subjects, providers, retry/idempotency/suppression and data handling are unchanged. No real email was sent.

## Branches and deployment boundary

- Main feature candidate remains feature/business-homepage-20261114 / draft PR22; only manual accounts-preview may receive its application changes.
- Separate fix/waitlist-privacy-20261114 starts at the existing waitlist preview head001f72a. It contains only the shared policy/CSS, contextual Privacy links, environment-correct email Privacy URL and preview noindex header. It does not import account, homepage, booking, schema or other application features from PR22. Deploy only to manual waitlist-preview.
- Production main is unchanged. The live policy will retain the previous wording until a separately authorized production release. Current preview policy is not described as already live or legally certified.

## Evidence

PASS4 local privacy contracts: complete/unique anchors and hierarchy; link-purpose mapping; actual enquiry template business-name/link rendering; actual wl_message generation for production, accounts-preview and waitlist-preview configuration, plain-text/HTML matching and escaping. Generation only—no send/provider/database call.

PASS actual Chromium policy navigation/focus/no-overflow and axe WCAG A/AA checks at1280/390/320, zero automated violations. Local image docs/evidence/privacy-bookings-mobile.png. Extended existing booking-history browser regression proves privacy opens at #bookings in a separate tab with null opener and empty sessionStorage, original entered name/review state intact, plus existing guarded URLs, Back/Forward/reload recovery and expiry. Existing four-page browser checks PASS at1280/390/320.

PASS disposable native PostgreSQL/PHP suites: account5, enquiry1, booking request1 and waitlist15. Separate legacy waitlist preview patch also runs the same15-test waitlist suite against its own application files. No hosted saves, publications or history removals are used for testing.

## Limits and legal reference

This is an implementation-grounded notice improvement, not a full legal compliance certification. The repository does not supply a verified registered legal entity/address or Information Officer details for FaraiOS, individual business privacy notices, operator agreements or business-specific retention schedules. Those facts must be confirmed before treating a production release as legally complete; no address, legal registration, contract or regulator registration has been fabricated. Rights are described as applicable, rather than as an unconditional deletion promise.

Primary reference checked: POPIA sections18,20–21 at https://www.justice.gov.za/legislation/acts/2013-004.pdf and Information Regulator guidance/contact route https://inforegulator.org.za/popia/. No statutory text copied. Notices reflect actual source behavior; no new collection, tracking or marketing-consent mechanism introduced.

Hosted preview checks and record-preservation checkpoint will be appended after deployment.

## Hosted checkpoint — 14 November 2026

PASS accounts-preview application e805febcb8ccd0fd8438d611f856c80986f8786b deployed through only the scoped manual accounts card. PASS waitlist privacy-only application c5dedb892c0fbcb19544822eea7a5e20502bf344 deployed through only the scoped manual waitlist card, now selecting fix/waitlist-privacy-20261114. Both Plesk tasks completed/Done. Production card remains automatic main/PR21; no production pull, deployment or merge.

PASS16 GET-only hosted checks in tests/privacy-hosted.py, evidence docs/evidence/privacy-hosted-checks.json. Both preview policy responses exactly match the new source bytes and each other. Both preview CSS/policy responses are200/noindex. Signup → accounts; homepage/Contact enquiry → enquiries; booking → bookings; general footers → overview; waitlist forms and confirm/unsubscribe GET pages → waitlist. Form-level new-tab/noopener/noreferrer attributes and actual selected public business name verified. Production privacy SHA256 remains4c56926534f63a6a92be666160b9fa27130af5910f3879e446a4c6ef00ecbc6f (unchanged old live release).

PASS hosted browser: section navigation focuses the Booking requests section; the policy fits390px and320px without horizontal overflow. Screenshot docs/evidence/privacy-hosted-bookings-mobile.png shows the actual hosted policy section at390px. Viewport reset; policy left open for owner review. Personal-form preservation/opener/sessionStorage separation was tested locally, not by entering or submitting hosted customer data.

PASS all15 public-table full-row counts/fingerprints match before/after both deployments and hosted checks. Evidence docs/evidence/privacy-preservation.json. No migration, existing-record update, publication, booking/enquiry submission, waitlist signup/transition, cleanup task or real email send. All history retained.

Draft PR22 contains the primary website/SEO/privacy work; draft PR23 contains the independent waitlist-preview patch and targets feature/waitlist-20261112, not main. Preview policy copies are aligned; production retains the previous release intentionally. A production release and confirmation of the missing legal identity/address/Information Officer/business-specific facts remain separate owner steps.

Final booking-visibility follow-up: accounts-preview application495d5ec0c7845bb3891d2f4249d4d465300f5c4e deployed/Done. The contextual booking privacy paragraph was moved out of the hidden Review panel to remain available throughout the five-step flow, before address/contact entry. Native booking-request and full booking URL/history/privacy-popup/draft-isolation browser tests PASS after this change. All16 hosted checks passed again; they now also assert the notice is outside the hidden fieldsets. Actual hosted browser confirms the link visible on the initial Service step at390px; screenshot docs/evidence/privacy-booking-entry-hosted-mobile.png. Final full-row fingerprint recheck still matches all15 tables. Waitlist application remainsc5dedb8 (subsequent waitlist branch changea198e42 is evidence-only). Production still unchanged.
