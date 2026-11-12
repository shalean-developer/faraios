# FaraiOS New waitlist — release preparation

Scope: fresh homepage only, name/email/business type/six interests, consent, confirmation, unsubscribe, private storage, owner CSV export. No historical implementation, dashboard, account authentication, bookings or payments.

## Hosting requirements and cost

PHP 8.2+ with PDO SQLite, PHP sessions, outbound mail(), HTTPS, scheduled PHP tasks, writable private storage outside all document roots. Plesk inspection on 12 November 2026 exposed PDO sqlite and sendmail. PHP Settings displayed 8.2.35 while its phpinfo page reported 8.4.27; validate the actual web and task runtimes before release.

Existing hosting mail is used; no Resend or CAPTCHA account is required by this implementation. Honeypot, timing, CSRF, request-size and enum validation, IP/email/global send limits provide initial spam controls. A determined distributed bot can bypass these controls; add a server-verified CAPTCHA if traffic justifies it. No paid services or GitHub Actions workflow is introduced. Verify hosting allowances with the provider; no new plan or purchase is authorized.

## Private configuration

Never put subscriber data, exports, configuration or mail capture files into Git or the website root. Default production storage resolves to `/var/www/vhosts/shalean.com/private/faraios-waitlist`. Set a private directory owner-only (0700, files 0600) and create `config.php` there:

```php
<?php return [
  'enabled' => false, // enable only after release checks
  'environment' => 'production',
  'transport' => 'mail',
  'base_url' => 'https://www.faraios.com',
  'sender' => 'hello@faraios.com',
  'secret' => 'REPLACE_WITH_AT_LEAST_32_CRYPTOGRAPHICALLY_RANDOM_BYTES',
  'min_seconds' => 3,
  'global_hourly_limit' => 30,
];
```

Generate the secret locally on the server using `bin2hex(random_bytes(32))`; do not expose it in logs or a PR. `FARAIOS_WAITLIST_DIR` overrides the storage location. Subdirectory previews must explicitly set it to a separate path outside the parent site's public document root. For FastCGI, a local ignored `.user.ini` may set `auto_prepend_file` to a private bootstrap file that calls `putenv('FARAIOS_WAITLIST_DIR=...')`. CLI tasks must pass the same environment variable. Never point preview at production storage.

Production refuses capture transport. Isolated tests use environment `test` and transport `capture` or `fail`. Captured messages contain secret links and must stay private. Preview testing must use synthetic data and be labelled; never send a preview link as a real launch campaign.

## Owner access and ongoing tasks

Use Plesk's existing owner access; there is no public export route. Run with the qualified PHP binary and private-directory environment variable:

- Every 5 minutes: `php /path/to/site/scripts/waitlist.php work` — retries, cleanup; set CLI `max_execution_time=120` for the task.
- On demand: `php /path/to/site/scripts/waitlist.php status` — aggregate subscription and queue status, no personal details.
- On demand: `php /path/to/site/scripts/waitlist.php export` — CSV in private storage, accessible through Plesk Files. Includes pending/confirmed/withdrawn status and consent evidence. Only confirmed entries are eligible for updates. Exports neutralize spreadsheet formulas. Delete exported working copies after use.

Inspect failed/uncertain jobs and server delivery logs daily while running the waitlist. `mail()` returning true means accepted by the mail server, not delivered. Known failed handoffs retry at most four times; an interrupted handoff becomes uncertain and is not resent automatically. Pending entries expire after 7 days, withdrawn records and terminal queue records after 30 days, confirmed entries after 12 months. The worker applies retention. Confirm backups include private SQLite storage consistently; use SQLite's backup API or stop writes for file-copy backups, never copy a live database without its WAL. Hosting backup retention and restoration are owner responsibilities. Restoring an old backup may restore unsubscribed records; reconcile withdrawals before any later campaign. Future marketing/bulk sending and bounce/complaint management are out of scope.

## Security/behaviour

All three homepage CTAs use the dedicated `waitlist.html` page. No homepage layout/style changes except the waitlist note, waitlist page and privacy link. Server never trusts client validation. Tokens are 256-bit random and stored hashed; raw confirmation/withdrawal links are held only in the private pending outbox and cleared on mail acceptance. Links use fragments to avoid access-log disclosure. GET never confirms/unsubscribes; the recipient must press the explicit POST button. Confirmation is single-use and expires after 24 hours. Unsubscribe works before and after confirmation. Repeated signup cannot change confirmed data or undo withdrawal. Rejoining after withdrawal requires contacting the owner. Resend for pending requests is limited to once per hour and reuses saved details; owner can correct details after verifying the requester.

No public read/list/export API, no localStorage of signup details, no tracking pixels. IP rate buckets are keyed hashes, expire after their rate window, and never trust forwarded headers. Verify `REMOTE_ADDR` is the visitor address on Plesk's actual proxy configuration; otherwise the limit may group all visitors. The necessary session cookie is Secure on HTTPS, HttpOnly and SameSite=Strict. `.htaccess` denies internals, Git metadata and sensitive file extensions. SQLite/config remain outside document root independently of web-server rules.

## Required preview/release evidence

1. Run `PHP_BIN=php python3 tests/journey.py` (uses disposable private SQLite, a real local PHP HTTP server and email capture).
2. Syntax-check PHP and JS; inspect desktop and 320/360/390px layouts, no horizontal overflow, normal page scrolling, keyboard focus and homepage navigation, each CTA, success and failure states.
3. In a separate preview deployment, verify PHP SQLite, private-file denial, HTTPS, cookie flags, mail origin/envelope sender, task execution and owner export. Inspect actual mail headers for SPF/DKIM/DMARC and receive a confirmation in an owner-controlled external inbox. Verify confirmation and unsubscribe there. Do not call local capture evidence inbox delivery.
4. Verify Plesk root `main` remains unchanged until owner approves the preview. `main` auto-deploys, so never push an unreviewed implementation to `main`.
5. Only after owner approval: merge qualified branch, pull/deploy through Plesk Git, enable qualified private production config and worker; recheck public submission, confirmation/unsubscribe and export with owner-controlled data. Keep the prior commit for source rollback; never delete private data during a source rollback. Disable via private `enabled=false` if needed.

Current disposition: source/local checks only until hosted evidence and owner preview acceptance are recorded. Not production-ready merely because tests pass.

## Local evidence — 12 November 2026

Twelve real-HTTP/PDO SQLite journey tests passed, including all six interests, validation, origin/CSRF, rate limits/honeypot, duplicate normalization, single-use confirmation, unsubscribe, expiry, failed-send retry, interrupted-send protection, consent export, formula safety and retention. PHP syntax checks, JavaScript syntax checks and `git diff --check` passed. Messages were captured privately; no real confirmation email was sent.

The local Chromium UI test could not start because the runtime forbids a required browser socket. A browser attempt to load the standalone design file was blocked by its URL policy. These are testing limitations, not visual passes. The owner can open the downloadable HTML design preview; it clearly states that no submissions are stored or emailed. Hosted mobile/browser tests, private-file access checks, cron, backup verification and real inbox SPF/DKIM/DMARC evidence remain release gates. Production remains untouched.

Owner UI revision: the waitlist is now a standalone page. All three CTAs navigate to it; modal markup and handlers are removed. The homepage retains its approved layout.
