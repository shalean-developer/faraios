# OWNER-08 — Read-only monitoring and recovery evidence

Live task: https://www.faraios.com/account/platform.php?task=TASK-AC56CC930C

Scope: owner-only visibility using existing sources. No new monitor, scheduler, alert, retry, restore, deployment control, credentials, database privileges, customer data or business mutations. The page uses the same managed Auth, immutable owner and restricted database session gate as Businesses. Navigation is enabled only after bounded hosted acceptance. Development and Platform Overview remain separate.

## Sources and interpretation

| Source | Bounded read | Interpretation |
| --- | --- | --- |
| Public GitHub main workflow history | Latest 50 runs, fixed repository, GET, 1 MiB, 3-second timeout | Workflow result at run start; no continuous availability claim. Failed runs are a sample, not customer delivery failures. |
| Independent operations workflow | Existing operations-watchdog.yml | Stale after 60 minutes; current workflow schedule is 15 minutes. |
| Database backup | Existing database-backup.yml and up to 30 artifacts for its sampled last success | Stale after 12 hours, matching current main warning policy. Requires exact matching unexpired encrypted artifact with nonzero size. A retained backup is not a restore. |
| Backup/restore heartbeat | Existing database-backup-health.yml | Stale after three hours; existing cadence is hourly. A passing heartbeat is not a new restore. |
| Private preview aggregate | ops-preview/monitor-state.json, at most 16 KiB | Explicit preview scope; stale after 15 minutes. Partial logs, absent heartbeat or malformed facts are Unknown. No raw logs read. |
| Live production tracker | Fixed production base URL and existing private tracker file, 12 MB maximum | Only V1-023/V1-014 status, check counts and update time are projected. No notes/history/customer data returned. A tracker timestamp is not backup freshness. |

At most two unauthenticated public GitHub GETs per refresh. No new token or privileged fallback. Rate limits and missing/invalid sources remain Unknown; historical evidence is not silently replaced with invented current success. Fixed endpoint allowlist, no redirects, TLS verification, response limits. No query parameters or mutation methods are accepted. Private responses are no-store/noindex.

Known limits are displayed: customer delivery queues and current website/configuration archive freshness are not connected. Recovery task links retain historical accepted evidence. V1-014 is In progress 2/3; full incident-to-service-readiness timing remains unproved. Its dependency is preserved, so OWNER-08 cannot be marked Verified while V1-014 is unresolved. This does not block bounded read-only development or imply public release acceptance.

Operator: Farai Chitekedza; Monday–Friday 08:00–17:00 Africa/Johannesburg. Normal acknowledgement one business day, critical one covered hour, outside hours best effort. Accepted targets: 24-hour maximum data loss and eight covered working hours recovery, not customer guarantees.

## Validation and rollback

Local contract tests cover timestamps, stale/missing/failed/queued states, matching retained artifacts, redaction, source bounds and monitor-only runs not establishing restore success. HTTP tests execute the actual PHP page/factory with isolated Auth/database/source adapters. Existing directory/overview routes regress alongside the new page.

Before live enablement: retain the exact existing navigation file and current protected-file hashes privately, stage/lint three additive files, install the protected unlinked page, verify real owner web path and supported-role/expired/anonymous denial, source reconciliation, responsive/keyboard behavior and hosted private-copy restore. Enable navigation last and recheck protected files.

Rollback uses `rollback.py` with the accompanying manifest: verification only by default; `--restore` restores the exact original navigation and removes only matching new monitoring files. Drift in installed files or backup refuses all writes. No schema/configuration/tracker/business rollback is needed. The existing overview and directories remain.
