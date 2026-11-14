# Contextual privacy links — preview only

Owner instruction: “FIX THEM SO THAT THEY DO CORRECT JOB”, following the audit of privacy URLs and repeated links. Continue PR22 and its preview-only/no-record-change scope. No production merge/deployment or business publication.

## Behavior

One reusable privacy notice with stable sections: overview, accounts, enquiries, bookings, business-records, waitlist, cookies, storage and rights. The section menu, headings and focus targets work at mobile widths. General website/business footers lead to overview; account links lead to accounts; enquiry and booking notices lead to their own sections; waitlist form, confirmation/withdrawal pages and emails lead to waitlist. The existing live canonical is retained; both preview mounts remain noindex.

The notice now distinguishes FaraiOS platform/account/security/waitlist processing from the selected service business's use of customer service records. It identifies submitted booking information, required versus optional details, review/confirmation purpose, price/time-zone snapshots, necessary sessions, provider categories/location, retention differences, rights/contact routes and the Information Regulator. It describes actual sessionStorage draft behavior: restore only within30 minutes; expiry checked on reopening rather than an automatic background timer; successful submission clears the draft. Waitlist withdrawal does not cancel a booking or delete an account.

Enquiry/booking notices name the business from the selected public snapshot (escaped), never from an account/private table or query-supplied name. Existing callers without a public name keep the “this business” fallback. These notices and signup/waitlist form-level links open a new tab with noopener/noreferrer and announce that behavior. Opening the notice neither submits the form nor copies the parent's booking draft into the policy tab.

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
