# Private application monitoring — F06 preview

Scope is accounts-preview, stacked on PR #37. No live activation, Auth setting
change, database writes, customer messages or booking-intake change is included.

Events retain only allowlisted timestamp/environment/type/operation/status/random
correlation fields. Preview bootstrap routes them to `ops-preview` under the
existing private account configuration directory. The directory is mode 0700;
event files, lock, application heartbeat and monitor state are mode 0600. Symlink
log targets are rejected. Raw exceptions, bodies, tokens, URLs and IDs are omitted.
At most two approximately 1 MiB event segments per UTC day are retained for fourteen
calendar days. Cleanup touches only matching old event filenames. Hosting/provider
raw logs remain separate and need their own restricted access/retention policy.

An application request heartbeat is written at most once per minute. A private CLI
monitor probes the preview sign-in GET and Supabase Auth health GET, checks the
recent application heartbeat and bounded error counts, and writes an aggregate
monitor state. It does not authenticate, submit forms, consume queues or send mail.
No recent heartbeat, incomplete logs or invalid configuration returns unknown;
a failed page/Auth probe or fatal/threshold error returns attention. A quiet log
alone never returns healthy. The CLI sets only the fixed preview request context
before loading configuration, so URI-aware private configs retain preview scope.

Operator command (outside HTTP):

```
php scripts/operations-monitor.php --config-dir=/private/account-config
```

A harmless `--canary` writes a fixed monitor-canary event without creating a false
workflow failure. `--status-only` never probes and cannot report healthy. Scripts
are web-denied; events remain outside the document root. There is no public health
endpoint revealing private queues or state. Rollback is PR #37 application source;
new private log files can remain for inspection and require no database rollback.

Local regression covers privacy, permissions, bounded rotation/retention, symlink
denial, missing/stale heartbeat, page/Auth outage and recovery, live-config denial,
and the existing complete application regression gate. Hosted sink/mode/probe and
scheduler results must be recorded separately; synthetic tests do not establish
hosted evidence.

The owner selected the recommended simplest setup: `alerts@faraios.com` is an
alias on the existing `hello@faraios.com` mailbox, preserving `support@faraios.com`.
No additional mailbox, password or paid plan is needed. Preview operator mail
uses the existing FaraiOS sender `notifications@notify.faraios.com`; it does not
consume enquiry jobs or change customer mail gates. The connected Resend plugin
belongs to another domain, so it is not used for FaraiOS sending.

Run the monitor with `--alerts` to send one fixed attention notification, reminders
at most hourly while unhealthy, and a recovery after an accepted failure alert.
Healthy initial runs are quiet. `--test-alert` sends one verification message;
repeating it after acceptance returns `already_verified`. Only the fixed preview
environment, generic state and sign-in link appear in mail; no business records,
raw errors, tokens or customer information. Provider acceptance is not delivery.

Transport loads only the sender and Resend key from the existing external private
enquiry-mail config, never prints credentials, and posts over verified TLS with a
12-second timeout. Optional `--mail-config` must resolve outside the website.
Private `alert.lock` and atomically replaced `alert-state.json` use mode 0600.
The lock serializes cron/manual overlap without blocking application event writes.
A persisted state/key pair survives crashes and ambiguous sends. Retries use the
same message and provider key with 5/10/20/40/60-minute backoff; hard rejections
or pending sends older than 23 hours require operator review before another send,
avoiding automatic duplicates after the provider idempotency window expires.
This monitor runs on the same host: a complete host outage needs an independent
external monitor and is not covered by this delivery.

Offline regression adds three methods covering privacy, fixed recipient/sender,
unknown/stale evidence, failure/reminder/recovery, concurrent deduplication,
timeout retries, hard rejection, retry expiry, filesystem modes, symlink refusal
and CLI live-configuration denial. Hosted sending/scheduling evidence follows
only after deployment and a real delivery check.

Hosted evidence, 14 November 2026: initial runtime 8f771c262b2b843158b782825351d147369878d0
passed manual private canary and actual page/Auth monitor via Plesk PHP 8.4.27.
At 18:49:17 UTC state=healthy, page/Auth/heartbeat=true, error counts zero,
partial_logs=false and alert_sent=false. Private directory mode 0700 and four
files mode 0600 verified in File Manager. CLI script and observability include
return HTTP403; preview sign-in returns HTTP200. Active Plesk task 265 runs
`*/5 * * * *` with Do not notify. No existing worker was changed or invoked.
Initial-head CI 43628438231 PASS (23 suites / 30 Python methods plus PHP assertions).
A final guard makes failed private canaries return unknown and validates heartbeat
schema/environment; local privacy/monitor regression passed after that guard.

Read-only recovery inventory: Supabase Storage buckets=0, objects=0; seven service
image records live in public.business_service_images, whose image JSON is included
in the verified logical backup scope. This is an inventory at observation time,
not a guarantee that future external Storage objects need no backup. Hosted Auth
login/configuration recovery and private runtime-secret restoration remain unproven.
