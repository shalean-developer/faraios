# Booking step URLs and refresh recovery
Step URLs: service, details, schedule, contact, review in the step query parameter. Browser Back/Forward updates visible steps; invalid deep links return to the first incomplete prerequisite.
Booking routes explicitly return X-Robots-Tag: noindex,nofollow in preview and live. Published business pages keep their existing canonical/indexing behavior.
Drafts use sessionStorage keyed by environment-specific pathname, expire after30 minutes and are cleared on successful submission. No CSRF tokens or request identifiers are stored. No personal values in URLs/history state. Storage failures leave a functional booking form without refresh recovery. Changed service catalogues discard the saved draft; current pricing is recalculated and normal server validation remains authoritative.
Server POST errors retain server-returned values instead of replacing them with stored values.
Validation: browser checks passed step URLs, guarded deep links, Back/Forward, refresh with source/custom control/option values, Review recovery, clean URL/history state and expiry clearing. PHP/JS syntax passed. No hosted request submitted.
Run: node tests/booking-history-browser.cjs with Playwright installed; PHP_BIN/BROWSER_BIN/PLAYWRIGHT_MODULE optional environment overrides. Fixture renders the actual PHP form with synthetic catalogue data and no database.
