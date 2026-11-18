# MON-01 scheduled failure diagnostics

The current scheduled monitor discards response headers. This patch adds evidence to the same public requests; it does not add retries or change the availability criteria, schedules, alerts, credentials or security rules.

Only the exact homepage and preview sign-in probes produce diagnostics. Each failed probe records UTC time, fixed URL, curl exit, HTTP status, classified server, strictly validated CF-Ray/challenge and numeric Retry-After, body length/SHA-256, and fixed error-marker names. No raw body, arbitrary header value, cookies, redirect destination, request header or Auth response is logged. Raw headers are in a private temporary file closed/deleted immediately; only up to 64KiB is parsed. Existing 12-second/2MiB/TLS restrictions are preserved. The first diagnostic log is emitted before private config/Auth/mail handling, so later failures do not erase that evidence. The aggregate report also includes the diagnostics under public_probe_failures.

## Validation

- PHP lint and existing watchdog decision/suppression tests pass.
- 20 parser/privacy/fetch assertions pass, including proxy/final header separation and Auth exclusion.
- Five real CLI fixture scenarios pass: healthy200,403,timeout,wrong-content200,later configuration failure. Confirmed failure exit codes, no notification, no secret text and temporary-header cleanup. No external network or messages in these tests.
- No live 403 cause or repair is claimed. Manual successful probes do not establish unattended cadence.

## Activation and rollback

Runtime delta is scripts/operations-watchdog.php only. Scheduled main workflows checkout main; a branch-only PR cannot instrument their future failures. Apply only after main activation is authorized and confirm any hosting auto-deploy consequences first, preserving all live overlays. Do not merge the earlier probe-only diagnostic branch which replaces the operations workflow.

Rollback is to restore only scripts/operations-watchdog.php from base138ee5fc982c64138fc55de4203da23338c819e8 after checking for intervening changes. No database, scheduler, credential or application-file changes required. Tests and documentation can remain.

After activation inspect the next actual failed unattended run for faraios.monitor-failure.v1, correlate UTC/provider IDs with Plesk/security logs, then repair only a demonstrated cause. Keep MON-01 In progress3/5 until original acceptance criteria pass; V1-014 recovery remains separate.
