# FaraiOS recovery and operational checks

Scope: faraios-new rxelmugnucfajrqmphhe and faraios.com. 14 November 2026. Application preparation/rehearsal only; no production activation, restore, paid plan, secret entry or scheduler change authorized by this delivery.

## Verified inventory and gaps

| Component | Observed evidence | Recovery implication |
|---|---|---|
| Supabase application database | Project ACTIVE_HEALTHY, PostgreSQL 17.11.0.019. Database → Backups explicitly says Free Plan does not include project backups. | No managed backup/restore point available through this plan. Do not claim a production RPO/RTO. |
| Plesk subscription hosting | JetBackup shows 8 full snapshots: newest offsite 14 Nov 2026 02:14 AM and local 12:27 AM, labelled Daily (times as displayed by provider). | Inventory is verified; specific private config/session coverage and file restore are not. Hosting snapshots do not establish external Supabase backup coverage. |
| Source | Git repository and stacked preview PRs retain source. | Git does not restore business data, identities or private runtime settings. |
| Workers | Plesk lists active enquiry worker every minute and waitlist worker every 5 minutes. | No task was run or altered. Schedules alone do not prove successful execution or timely delivery. |
| Enquiry queue | Read-only aggregate showed 2 accepted preview jobs, no pending/sending/failed rows at observation. | Provider acceptance is not inbox delivery; no new messages were sent. |
| Restore rehearsal | Native PG17 custom-format dump restored into a new disposable database; 32 table fingerprints, effective table/function permissions/RLS/policies, tenant denial, corrections/ledger, counters and post-restore PHP read passed. | Synthetic application DB proof, not restoration of a hosted provider backup, Auth password/session service or private Plesk config. Same-cluster roles pre-existed. |

## Ownership and proposed recovery objectives

Accountable decision-maker: FaraiOS platform owner (the user). Engineering/operator executes backup verification, incident triage and recovery under that owner's release authority. The operator must be named and the alert destination tested before operational acceptance; no other person was assigned or messaged.

Proposed initial objective for owner decision: at most 24 hours of data loss (daily verified offsite backup) and restoration within 4 hours after access/incident approval. These are targets, not measured capabilities. Financial transaction growth may require a shorter loss window. The small synthetic local restore timing in test evidence is not a production RTO estimate.

## Backup arrangement requiring a decision

1. Managed route: owner enables an appropriate paid Supabase plan, then verify a completed scheduled backup and its actual scope/retention. Separately inventory Auth, Storage objects, role passwords, integrations and private hosting configuration. [Official backup guide](https://supabase.com/docs/guides/platform/backups).
2. Self-managed route: configure an authenticated database export with credentials stored only in the private operator environment; include application schema/data, grants/roles and provider-specific Auth requirements. Encrypt offsite copies, restrict access, define retention and prove a second independent restore. Do not put credentials or backups into Git/CI artifacts. Supabase recommends regular exports/offsite backups for free projects; follow its current CLI/restore documentation rather than assuming a plain dump is a full hosted-service recovery.

No paid plan or self-managed job is enabled. Never use the application's publishable key as a backup credential. Do not read/expose service keys or reset database passwords to complete this task. Storage object bytes and custom-role passwords are not covered by the standard database-backup assumption; see official provider scope.

## Restore procedure (operator runbook)

1. Record incident time, source release, last verified backup, affected businesses and allowed loss window. Preserve current state and evidence. Owner approves any production outage/cutover.
2. Restore into a new isolated target first. Keep booking intake, mail/payment dispatch and scheduled jobs disabled in that target. Do not point the live website or existing worker configuration at it.
3. Verify archive checksum, schema/migration source, data counts/fingerprints, keys/FKs, RLS/policies/grants, ownership, business/environment isolation, issued documents, corrections, ledger totals, invoice numbering/counters and token behavior.
4. Re-establish Auth/roles/configuration and private credentials using the provider-supported process; do not carry live sessions into a synthetic environment. Inventory Storage and external integration state separately.
5. Run the application gate: `python3 tests/release-checks.py` only against its disposable local harness. Then execute a separate approved hosted-target acceptance plan with synthetic users, no real dispatch, actual owner login and mobile journeys. Local harness Auth/REST simulation does not validate real recovery of Supabase Auth.
6. Reconcile changes since the backup, ledger entries, withdrawals/suppression and queue delivery state before considering dispatch. Do not blindly replay outboxes: provider acceptance may have occurred after the recovery point. Resolve duplicates/idempotency explicitly.
7. Present the restored isolated application, reconciliation and loss/RTO evidence. Production cutover requires an explicit owner decision. Retain the previous system/backup until post-cutover verification passes; do not erase records or reset counters.

Rollback of this preview delivery: restore PR #36 runtime source. New monitoring files can remain unused; no schema/data rollback is needed. Never drop existing correction/history structures during an application rollback.

## Operational visibility implemented in preview

`account/observability.php` emits allowlisted JSON `faraios.ops.v1` events for upstream transport/5xx failures, unexpected database/schema workflow failures and unhandled/fatal PHP failures after bootstrap. Fixed fields only: timestamp, preview environment, event, operation family, status and random request correlation. No body, email, tokens, customer/business IDs, URL, exception message or raw query is included. Ordinary validation/conflict outcomes are not promoted into outage alerts. Live activation is off by environment; source is deployed only to accounts-preview.

Unhandled exceptions after preview bootstrap return a generic unavailable response and sanitized event. PHP errors before bootstrap, server access logs and provider logs remain separate and may contain paths or other sensitive details: restrict access, keep bearer URLs private, configure appropriate redaction/rotation/retention and verify the actual sink before enabling operational alerts. This code does not promise all hosting logs are sanitized.

`php scripts/operations-check.php --file=/private/path/to/error.log --minutes=15 --threshold=5` reads only an operator-supplied log outside the web root and outputs aggregate counts. Exit 1 means attention (any fatal or threshold reached), 2 means unknown/incomplete, 0 means no threshold observed. Missing/unreadable log is not healthy; a quiet window is not proof of liveness. Scans are tail-limited to 10 MiB; a partial window remains unknown. No raw log lines are printed, no queue mutation occurs and no alert is sent automatically.

Proposed operator checks: fatal event immediately; 5 upstream/workflow failures in 15 minutes → investigate page/database status; any failed mail job or pending/sending job older than 15 minutes → inspect worker/queue outcomes without rerunning delivery blindly; missing heartbeat or backup past the agreed cadence → recovery readiness blocked. Confirm thresholds against actual traffic before unattended alerting.

Before F06 closure: choose/fund/configure the backup path; prove an actual retained backup restore into an isolated target including Auth/config scope; name the operator and alert destination; configure/verify private log sink/rotation and a tested alert/heartbeat path. Existing task success emails and schedules are not an accepted replacement for this evidence. No new outbound alert, schedule or subscription has been created.

## Evidence and decision

Local report: docs/evidence/release-recovery-local.json. CI retains per-suite logs, runtime/source metadata and restore report for 14 days under foundation-regression-evidence. Only synthetic data enters these artifacts. Browser inventory was read-only; no restore/download/upgrade action was taken.

F05: pending latest-head CI for the expanded gate. F06: local rehearsal and preview observability implementation PASS; production recovery readiness **NO-GO** until the above backup and operational gates are resolved. This is not a statement that hosting snapshots are absent; their inventory is recorded separately.
