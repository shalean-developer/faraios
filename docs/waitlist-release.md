# FaraiOS New waitlist — Plesk + Supabase + Resend

## Approved scope

Dedicated waitlist page linked from all three homepage CTAs. Name, email, business type, six interests, explicit consent, email confirmation, unsubscribe, owner notification and owner export. Preserve the approved homepage. No historic system imports, dashboards, customer login, bookings or payments in this release.

## Architecture

- **Plesk:** static pages and PHP endpoints, necessary sessions, private service configuration, scheduled worker and `hello@faraios.com` mailbox.
- **Supabase:** sole subscriber/queue/rate/delivery-event store. `public.waitlist_subscribers` is visible in the owner's Supabase Table Editor, has RLS enabled, and grants no access to anonymous or signed-in customer roles. Server-only RPC functions run as invoker and are executable only by `service_role`. Queue tokens are in the unexposed `waitlist_private` schema. No SQLite storage or fallback remains.
- **Resend:** automated email from `FaraiOS <hello@notify.faraios.com>`, Reply-To `hello@faraios.com`. A confirmation is queued on signup; a notification to `hello@faraios.com` is queued only on first successful confirmation. Resend is the mail sender; Plesk is the reply mailbox. Supabase Auth is reserved for a later approved phase.

The fresh `faraios-new` project returned by the Supabase connection is `rxelmugnucfajrqmphhe`, organization `lypbvtudsbxxdcnzbqwc`, Ireland, PostgreSQL 17.11. It was healthy with no application tables before work. No old project was used. Hosted migration `20261112123416_waitlist_supabase_resend` was applied after a renewed confirmation on 12 November 2026. The source filename is aligned to the returned hosted version. A service-role hosted signup/duplicate/confirm/owner-job/unsubscribe test was rolled back; no test records or emails were retained/sent. Public/customer function and table grants were checked. Security advisors reported only four informational RLS-without-policy notices, intentional for server-only access; no permissive policies were added. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

The Resend connector is linked to a Shalean team; the supplied browser is logged into the separate FaraiOS team. No cross-team domain claim or transfer was attempted. A new `notify.faraios.com` domain was prepared in the FaraiOS browser account. DNS verification, API credentials and delivery tests are still required. No upgrade/purchase was performed. Free-tier limits, inactivity pausing and hosting allowances still apply; verify the actual account plan before launch.

## Private Plesk configuration

Place `config.php` outside every public document root, normally `/var/www/vhosts/shalean.com/private/faraios-waitlist/config.php`, mode 0600 under a 0700 directory. `FARAIOS_WAITLIST_DIR` can select a separate preview directory. Never put secrets in Git, browser JS, logs or chat.

```php
<?php return [
 'enabled' => false,
 'environment' => 'production',
 'transport' => 'resend',
 'base_url' => 'https://www.faraios.com',
 'supabase_url' => 'https://rxelmugnucfajrqmphhe.supabase.co',
 'supabase_key' => 'INSTALL_SERVER_ONLY_SUPABASE_SECRET_KEY',
 'resend_key' => 'INSTALL_DOMAIN_RESTRICTED_SENDING_ONLY_RESEND_KEY',
 'webhook_secret' => 'INSTALL_RESEND_WEBHOOK_SIGNING_SECRET',
 'secret' => 'GENERATE_WITH_BIN2HEX_RANDOM_BYTES_32_ON_SERVER',
 'sender' => 'hello@notify.faraios.com',
 'reply_to' => 'hello@faraios.com',
 'owner_email' => 'hello@faraios.com',
 'min_seconds' => 3,
 'global_hourly_limit' => 30,
];
```

PHP requires JSON, sessions, OpenSSL and HTTPS streams (`allow_url_fopen`); no database driver or Composer dependency. Supabase and Resend HTTP requests use TLS verification, bounded timeouts, fixed trusted service hosts and no redirects. The Supabase server-only key must stay on the server. Use the new Supabase secret key, or a legacy service-role key if required by the project's gateway, never a publishable key for server-only RPCs.

Create a Resend webhook to `https://www.faraios.com/waitlist/webhook.php` for `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`. Install its signing secret privately. The handler checks the raw-body HMAC with five-minute timestamp tolerance before using any event. Events are deduplicated. Bounces, complaints and suppression disable future confirmation requests for that address. Delivery-before-ack races are handled. No open/click tracking.

## Queue and ownership

Run every 5 minutes using Plesk's PHP task runner and the same private config directory:

`php /path/to/site/scripts/waitlist.php work`

`status` returns aggregate subscription/queue counts; `export` writes a private CSV in the configuration directory. The export includes consent and pending/confirmed/withdrawn/suppressed status and neutralizes spreadsheet formulas. Owner can also view `waitlist_subscribers` in Supabase Table Editor. Do not manually flip consent/status columns: verify user requests through the application flow. Only confirmed and unsuppressed records are eligible for future updates; bulk marketing is outside this release.

Jobs use Postgres row locks/leases, skip-locked claims and one Resend idempotency key per durable job. Network errors, 429 and provider 5xx are retried with the exact same payload/key. Other 4xx are terminal. Maximum four attempts; retry stops after 23 hours, before Resend's 24-hour idempotency expiry. Lost acknowledgments can be reclaimed safely; stale leases cannot acknowledge newer attempts. Accepted by Resend does not mean inbox delivery: inspect webhook status and Resend logs.

Tokens are 256-bit random, stored hashed on subscriber records. Raw links are held only in private pending job payloads and cleared on provider acceptance or terminal failure. Links use fragments to avoid access-log disclosure. GET never confirms/unsubscribes; recipients press an explicit POST button. Confirmation expires in 24 hours and is single-use. A duplicate request cannot overwrite confirmed details or reverse a withdrawal. Pending resend is limited to once per hour, using saved details. Rejoining after unsubscribe requires owner assistance.

Pending entries expire after 7 days; withdrawn/suppressed and terminal queue records after 30 days; confirmed entries after 12 months. Worker applies retention. Exports and hosting/database backups must follow owner retention policy; verify backups before production and reconcile withdrawals after a restore. Session files on Plesk contain only CSRF/timing data; local captured emails exist only under isolated test mode. No subscriber mirror on Plesk.

## Spam and access protection

CSRF, exact origin checking, input length/type/enum validation, request-size limit, honeypot, timing, IP/email/global rate limits. Application rate keys use HMAC, never raw IP. Verify the actual `REMOTE_ADDR` behaviour behind Plesk proxies. This initial protection cannot stop a determined distributed bot; add a server-verified CAPTCHA if needed. No public read/export endpoint and no browser service credentials. Necessary HTTPS cookies are Secure/HttpOnly/SameSite=Strict. Internals, Git, migrations, tests and private-file extensions are denied by `.htaccess`; credentials remain outside document root independently of server rules.

## Testing and release gates

`PHP_BIN=php PG_BIN=/path/to/postgres/bin python3 tests/journey.py` creates a disposable native PostgreSQL 17 cluster, applies the exact migration, and runs real PHP HTTP journeys through a local RPC gateway. The gateway executes actual service-role PostgreSQL functions; Resend is simulated locally. It tests signup/confirmation/unsubscribe/owner notification/export, duplicate concurrency, denial to anon/authenticated roles, invalid inputs, CSRF/origin/cookies, bot/rate/timing checks, expiry/retention, lease retry limits, provider idempotency, permanent failures, signed/replayed delivery events, suppression, delivery-before-ack races and database outage. No hosted writes, real keys or real email are used.

`tests/browser_journey.py` is an optional Chromium test for a capable test host. Local Chromium cannot start in this runtime because its required browser socket is prohibited. Do not claim visual/mobile passes from source tests or downloadable HTML.

Before launch: apply and verify the hosted migration; run Supabase security advisors and role-denial checks; install private keys; verify Resend DNS, webhook and actual owner-controlled inbox delivery including SPF/DKIM/DMARC; test worker/export; verify backups; test all three CTA links and desktop/mobile layouts in the hosted preview. Then obtain owner approval for production.

Production Plesk follows `main` automatically. Keep changes on the draft branch; never merge before preview acceptance and complete hosted checks. After approval, merge/pull/deploy through GitHub → Plesk Git, enable private config, and verify the live journey using owner-controlled data. Rollback source to the prior commit or disable `enabled`; preserve Supabase records. No dashboard/customer authentication/booking/payment scope is implied by using Supabase.

Local validation: 15 native PostgreSQL 17.11 + PHP integration tests passed on the current source; PHP/JS syntax and diff checks passed. Hosted browser, real Resend delivery, DNS, private credentials, webhook/worker and backup checks remain open.
