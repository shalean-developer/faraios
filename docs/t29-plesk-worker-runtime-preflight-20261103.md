# T29 — Plesk worker and Node.js configuration evidence (3 November 2026)

Evidence source: owner-provided Plesk screenshots showing the configured scheduled task and the Node.js application dashboard; no secrets were captured and no host controls were changed.

## Scheduled Tasks
Plesk page headed "Scheduled Tasks for faraios.com" lists **one enabled** task invoking Node 24 from /opt/plesk/node/24/bin/node with a script in `/var/www/vhosts/faraios.com/staging.faraios.com/app/scripts/t19-standard-scheduled-worker.mjs`. Description: **T19 staging approved TEST invoice worker**. Schedule `*/5 * * * *` (every five minutes). The page is domain-wide; the command path points to staging. Task is not disabled or paused.

Corresponding staging branch source `scripts/t19-standard-scheduled-worker.mjs` validates the private staging worker configuration `environment=staging` and `enabled=true` before running the T19 invoice worker once. Hence the enabled Plesk task is a genuine possible **staging TEST accounting dispatcher**, not inherently inactive. The private runtime config/worker log state is not established from the screenshot. Existing T19 governance must not be disrupted for T29.

## Node.js application
Plesk screenshot headed "Node.js on staging.faraios.com": Node 24.22.2, application URL https://staging.faraios.com, root /staging.faraios.com/app, startup file `_test_payments.cjs`, mode `production` (Node app mode only), status `Idle` at observation time ("No process is running. The application starts on the next request"). This is a snapshot, NOT proof the service always remains idle or is linked to live Shalean.

The source-defined launcher `_test_payments.cjs` loads `t19-standard-runtime`, `t20-payment-runtime` and hosted staging. Actual payments enabled/disabled state comes from private config, which has not been read; source alone cannot certify inactive dispatch. The hosted SDK fetch guard is an allowlist, not an operating-system egress sandbox.

## Other T29 isolation evidence
- FaraiOS staging database: notification settings for both businesses `disabled`; no `pg_cron`, `pg_net`, or `wrappers` extensions and no cron.job relation as previously inspected.
- Latest-head Foundation checks run **41626126005** completed **success** on source/evidence commit `dac6ac949fa8a1d149ce26375eccb7a38351ff9e`.
- T29 disposable in-memory/PGlite synthetic booking, adapter denial and rollback tests passed as part of CI; this does NOT prove Plesk's account/payment workers are disabled.

## Judgment
**Existing T19 scheduled worker enabled. Private TEST payment/accounting runtime settings not yet verified.** Therefore full **hosted** no-outbound-effects gate is NOT PASSED. For the owner-approved **disconnected T29 rehearsal**, an isolated local test can prove it did not call those workers, but cannot prove that unrelated existing staging workers were inactive. Do not conflate these scopes or disable T19 without its own authority.

Next minimal read-only owner action: Plesk Node.js > Environment: inspect only redacted environment variable names, not values; verify T19 worker private `enabled` state only through an authorised non-secret status/report (no private config file copy). Do not click Run Now, Restart, Stop or Disable. Preserve both live systems, no import, deploy, financial changes or T30.

T29 remains In progress pending evidence consolidation and explicit owner staging acceptance. PR #306 Draft.
