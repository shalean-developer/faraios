# V1-003 — interrupted saves and safe manual retries

A new delegated customer form previously had no record identity until the POST ran. If that write committed but its response was lost, a manual retry generated a fresh UUID. With the explicit duplicate-confirmation checkbox selected, the retry created a second customer. A red native PostgreSQL/PHP test reproduced one committed row followed by two rows after retry. `reproduction.json` records this; the installed original delegated SHA256 was verified451d51d8790e4131d74861fefbf874954a6caa419b6fb950ff9de12076725aae.

The repair gives every new delegated form a stable, hidden record ID and version before submission. Missing/malformed IDs reject before a command, retaining entered fields, so an already-open pre-repair form cannot silently save under a new server-generated identity. Payment forms must also supply their original payment ID. Existing CSRF, scope, membership, version, selection and financial guards remain unchanged. There is no automatic retry, browser persistence, SQL change or new permission.

Only generated `account/delegated.php` is deployable, from `docs/sc04/delegated.php`. `runtime-manifest.json` pins its prior and candidate hashes and the V1-004 owner-page preservation hash. Other staged files and inherited branches must never be deployed. Original accepted repair manifests and frozen baselines remain intact; the preview builder accepts only the explicit one-file hash transition for its existing copied-RPC tests.

Native fault injection now supports a response failure after an actual committed command. Four new CI methods cover Manager/Receptionist customer and accepted-quote booking retries, Manager payment retries and changed-payload denial, and missing submission identity denial without a command. Exact saved rows, counts and input retention are checked. Existing test HTTP submissions now take the hidden ID from the rendered form rather than inventing one.

An additional opt-in browser method covers ten cases: Manager customer/booking/payment and Receptionist customer/booking, each at390/1280. It performs the actual HTTP request and database commit, then aborts delivery of the response, confirms retained input/key and one saved row, toggles offline/online without replay, and performs one explicit retry. Each result remains one record. This closes the former before-send-only network-abort coverage gap. See `browser.json`.

Reproduce: `PG_BIN=<bin> PHP_BIN=<php> python3 tests/retry-recovery.py`. Add `FARAIOS_MOBILE_BROWSER_CHECK=true FARAIOS_CHROMIUM=<chromium>` for the browser method. All fixtures are disposable; no credentials or provider sends.

Hosted acceptance uses only existing synthetic owner A/live, normal owner PHP forms and existing authenticated APIs. It discards response bodies at the client after the PHP save, then confirms the committed row and retries the original payload. It preserves original live and preview history. Delegated after-commit browser faults are covered against the exact deployed candidate in the native harness; no hosted delegated access activation or new physical-phone acceptance is claimed. Synthetic roles remain closed. The hosted script is CLI-only and guarded against blind reruns.

Full local gate PASS38 suites/129 reported methods plus PHP checks. See `regression.json`.

Release/install/final verification receipts will record the bounded deployment and tracker decision. Backup/rollback retains only the previous delegated file privately; on rollback, stop if its installed hash has drifted. Never restore a database or overwrite later legitimate activity. The broader launch remains on hold.
