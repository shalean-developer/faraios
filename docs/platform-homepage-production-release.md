# Platform homepage production release — 14 November 2026

Owner explicitly instructed deploy after viewing the tested hosted homepage and adjacent Sign in/Create account buttons. This authorizes PR31's homepage-only application release. It does not authorize activating public booking intake, changing business records/publications, or releasing the separate enquiry-email candidate.

Reviewed PR31 head9a67b77c1bdf00e2666418d5c096690407a3e2ac. index.html blobf75d3bef3b15305fe9581fdfe3488e30a3ecdd05 exactly matches the tested local/hosted source. Only index.html and static evidence/documentation changed. GitGuardian Security Checks completed success; no additional CI statuses present (empty status collection is not a green-test claim). Existing local HTML/JSON-LD/whitespace,1280/390/320 layout/tab/menu/link and three axe scans all passed. Hosted desktop/mobile preview acceptance evidence retained in platform-homepage-current-preview.md.

PR31 marked ready and merged with expected-head lease. Merge88596ffe8e2a0631397e8ef76782d55402215e0f. Plesk faraios.git remained automatic main to /faraios.com. Its Pull now fetched the release and queued automatic file deployment. Fresh live HTTP subsequently returned200 with HTML byte-for-byte equal to the tested index.html (SHA2563dd1bcbd12c312040f12d4c1eff8c41cbca1997cc52a775f2966f8e171f43aca). This verifies the actual deployed content independently of UI progress. No manual branch switch or unrelated target deployment.

Actual production browser: Sign in and Create account use original correct account URLs; desktop both48px high and aligned. Mobile320px both44px high/y64 with no horizontal overflow. Viewport reset; live homepage left open for owner review. Screenshot platform-home-production.jpg.

GET-only verification in platform-home-production-checks.json covers homepage hash/metadata, signup/signin responses/noindex, waitlist, Shalean published page and preview noindex. No account created, form submitted, email/provider action, schema/data/gate change or business republication. Static homepage-only release does not repeat private-feature end-to-end acceptance or claim full database fingerprint comparison. Existing accounts-preview remains temporary combined homepage+enquiry candidate6e51a44467e9ce1bd76d7da992fb43871c7eba5c; that combined branch was not merged into production. Waitlist-preview unchanged.

Rollback: previous main6eee87bcd737f0946f395d96343ac7b41c90655e contains the preceding platform homepage. Prefer reverting only index.html if a correction is needed; preserve all business records, new intervening releases and current environment configuration. This outcome evidence is saved on a separate documentation branch so recording it does not cause another production deployment.

Decision: PASS authorized production homepage release and verification. Field performance, physical-device and screen-reader limitations remain as documented in preview evidence.
