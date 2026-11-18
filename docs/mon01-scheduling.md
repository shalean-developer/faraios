# MON-01 — Plesk scheduling fallback

Status: Plesk268 and269 activated18Nov2026; credential provisioned. Unattended acceptance in progress. Historical checkpoints below retain prior states; newest dated section governs.

Owner decision: Plesk and GitHub only. This replaces the independent-host prerequisite below; the host-down limitation remains explicit. No Vercel setup is required.

## Evidence and diagnosis

The three scheduled workflows and their relevant commit histories identify
`shalean-developer` as actor/committer. Monitor introduction: `39e89f3`;
six-hour backup/heartbeat change: `c94c71f`. Scheduled runs `44262840889`,
`44212415900`, `44313812135` use that actor and main `138ee5f`.
Repository Actions is enabled, reusable workflows allowed, no Actions policies
exist, and all three workflow states are active. No reproduced owner/settings
fault explains the sparse triggers. This does not prove a GitHub service cause.

Heartbeat `44313812135` ran automatically at 2026-11-18T13:26:57Z and failed;
job `134834514333` explicitly reported backup stale, restore ok. At the live
Monitoring read 15:24:31Z, backup `44212415900` was 14h24m02s old, above the
12-hour warning but below the accepted 24-hour data-loss target. Its encrypted
artifact `14385914630` was retained. Neither a retained artifact nor heartbeat
success proves the full V1-014 incident-recovery target.

## Prepared repair

Run `scripts/schedule-fallback.py` from Plesk Scheduled Tasks
every five minutes. This is an alternative trigger, not an alternative backup
implementation. Only the existing monitor (15 min), encrypted backup (6 hours)
and heartbeat (1 hour) may be dispatched, always on main. Keep native schedules.
The script reads workflow-specific histories, suppresses recent/active attempts,
and records a durable pending intent before submitting a request. Ambiguous
timeouts stop that workflow for operator reconciliation rather than repeat a
possibly accepted request. Accepted dispatch is not reported as successful work.
Errors are sanitized; redirects refused; private files require owner-only access.
Local filesystem locking prevents overlapping timer invocations on one host.

Default invocation is read-only and needs no credential. Execution requires
`--execute --private-dir /absolute/private/path` with an existing owned 0700
directory and a 0600 `github-token` file. The token must be provisioned securely;
never put it in chat, source, command arguments, public hosting or timer logs.
No database/SMTP/encryption secrets leave GitHub.

GitHub requires repository Actions write permission to dispatch. A token scoped
only to this repository still has broader authority than these three workflows;
the script allowlist is NOT a credential-level permission boundary. Prefer a
dedicated GitHub App with short-lived installation credentials and approved
rotation; static fine-grained tokens require expiry/rotation ownership. Credential
provisioning remains a prerequisite. The owner selected the existing Plesk host. Do not reuse
an unrelated existing token or create access without authorization.

An external timer will appear in GitHub as `workflow_dispatch`, not `schedule`.
Acceptance must pair unattended timer receipts with exact returned GitHub run IDs,
conclusions and encrypted artifacts. A person pressing Run workflow is not proof.

## Installation and rollback procedure (activation pending)

1. Use the existing Plesk host as directed by the owner. It can trigger GitHub
   jobs while that host is running; it cannot trigger them during a host outage.
   Native GitHub schedules remain enabled for independent coverage, whose
   demonstrated scheduling gaps are still unresolved. No new provider is required.
2. Install reviewed script read-only for its dedicated unprivileged account;
   provide Python 3, CA certificates, HTTPS access to api.github.com, private
   durable state and the approved repository-scoped credential.
3. Run read-only first. Install a five-minute timer only after reviewing its
   exact command, credential scope and operator alert effects. Existing watchdog
   execution can send operator mail. No customer messages are part of this repair.
4. Preserve native schedules, warnings, backups, concurrency and encryption.
   Capture timer journal start/end/exit, script JSON receipt and exact run ID.
5. Observe at least two unattended backup cycles six hours apart and intervening
   monitor/heartbeat cycles. Verify successful jobs and retained backup artifacts;
   prove monitor/heartbeat freshness remains within thresholds. Test missed tick,
   restart, timeout, expired credential and stopped scheduler detection.
6. Have independent supervision report missed timer receipts: this script alone
   cannot alert if its host is down. Establish that before treating it as reliable.
7. Close MON-01 only once all original criteria are evidenced. Keep V1-014 separate.

Rollback: disable only the new external timer, verify no invocation remains active,
revoke its dedicated credential, retain receipts for audit. Do not delete backups,
disable native jobs or change application files. Reconcile pending dispatches
against GitHub before clearing a pending state record. Never blindly clear state.

## Limits

This still depends on GitHub API/runners and does not solve a full GitHub outage.
Only one fallback host may own the state/lock. A native run may race the final POST;
existing monitor/backup concurrency limits overlap, but dispatch is not globally
exactly-once. Heartbeat is read-only and duplicate checks may occur. The latest 100
workflow runs are inspected; unknown/missing evidence fails closed. Long-stuck jobs
block more dispatches and require operator review. No failed jobs are hidden by
increasing thresholds. The owner has selected Plesk; credentials, activation and automatic
execution remain unverified. No main change is needed for this helper.

## Validation

Run `python3 tests/schedule-fallback.py`. Tests cover cadence boundaries, active
runs, malformed evidence, dry-run behavior, durable intent, ambiguous POSTs, exact
ID reconciliation, API failure, allowlisting, redirects and private state files.
Result on 18 Nov 2026: 10 tests passed. Live read-only evaluation at
15:34:20Z returned due for all three workflows, with no POST or local state
write. Hosted cadence and delivery remain unverified.

References:
- https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- https://docs.github.com/en/rest/actions/workflows
- https://www.faraios.com/account/platform.php?task=TASK-5C4FCF2ED6

Historical preparation decision: activation was pending at that checkpoint.
See the latest activation evidence below. Closure remains pending sustained cadence
and the explicitly retained coverage limits.

## Plesk installation — 18 Nov 2026

Private directory: `/var/www/vhosts/shalean.com/private/faraios-account/mon01-scheduler-v1`
(0700); helper and empty dedicated `github-token` file (0600). Helper SHA256
`8af66a3aaaceea271a2357baa6d0363ae9536ec3dcd370bc641cd7123945e2fd`.
Task 268 saved inactive, `*/5 * * * *`, running the helper with `--execute`
and that private directory. Original tasks 263–267 unchanged. No credentials
reused, grants made, dispatches triggered or messages sent. Hosted read-only
test at15:48:19Z passed: monitor due, backup recent, heartbeat active.

Native scheduled backup44339467194 at15:46:19Z succeeded and retained encrypted
artifact14442124467 (not expired); workflow_run heartbeat44339829409 at15:48:15Z
succeeded. This is native execution, not proof of the inactive Plesk timer.
Monitor remains at44262840889. GitHub requires Confirm access before token setup.
Next: owner completes re-authentication; provision dedicated repository Actions
read/write credential into the private token file without chat/source/log output,
then finish timer receipts/supervision and verify unattended execution.

## Receipt-backed Plesk activation — 18 Nov 2026

Owner approved dedicated credential provisioning. Token23219291 is scoped to
faraios only (Actions read/write, required metadata read-only), expires18Dec2026,
and is stored privately0600. Hosted authenticated read-only access passed for all
three workflows. No token value is in this repository or timer command.

Added `scripts/schedule-runner.py` (wrapper SHA256
26306160c5400be0d828b3655750eff4b8fb8d4201e30450b7b9c3886db2bd5f).
The original hash-pinned helper is unchanged. Wrapper writes an fsynced per-run
start record before dispatch, then final result/exit/timestamps and exact run IDs.
A killed process leaves an unfinished record. All records remain in the private
directory; no routine evidence deletion is configured. Review disk usage as history
grows. A separate latest record supports freshness checking. Each record is 0600.

Plesk268 now uses the wrapper every5min. New task269 checks it at2-57/5 * * * *;
errors-only notifications route through Plesk to the existing alerts@faraios.com
operator mailbox. Identical issues are suppressed for one hour. This uses Plesk
mail transport, not the previously tested application SMTP route; delivery has not
yet been proved. Expiry warns7days ahead and execution refuses at18Dec00:00UTC
(conservative expiry boundary). Rotate/reconfigure before then; do not silently
extend credential lifetime. No application files, native workflows, previous five
Plesk tasks, database permissions, encryption or backup implementation changed.

Check detects missing receipts, timer age over15min, unfinished runs over3min,
failed execution and credential expiry. It is an independent task on the SAME
Plesk host: it detects a stopped fallback task if cron still operates, but cannot
report a whole-host/cron outage. Existing independent GitHub monitor remains,
with its native scheduling reliability unresolved. Do not claim independent timer
supervision or full V1-014 recovery acceptance.

Validation: 10 existing helper tests and8 new runner tests passed. Cases include
write-before-dispatch, exact run IDs, restart gap history, timeout/malformed-output
sanitization, stale/unfinished/future receipts, expired credential refusal, alert
deduplication/recovery, symlink refusal and helper drift. Tests use synthetic local
fixtures, not real token revocation or production outage. Hosted wrapper installed
0600 and exact hash verified. Activation is not proof of success; record actual
unattended timestamps/run IDs below before closing any criterion.

Rollback: deactivate268 and269, keep receipts and pending intents for audit and
reconciliation. Original five jobs/native GitHub schedules stay enabled. No
application rollback is required. Credential revocation is a separate deliberate
operator action; never clear an ambiguous dispatch just to retry.

### First unattended dispatch

Task268 fired at16:30:01Z/18:30:01SAST. Receipt
6f0fe1c845324845b20a9ca6b5a9ded9 finished16:30:06Z, exit0. It dispatched
monitor44347938721 and suppressed recent backup/heartbeat. GitHub independently
confirms workflow_dispatch, main138ee5f, created16:30:04Z. Job134955390622 report
at16:30:31Z: healthy; homepage/preview/Auth200, backup/confighealthy,
alert_sent=false/quiet. Restore-related jobs skipped by normal monitor policy;
this run is not new recovery proof. No manual dispatch/RunNow execution of the
scheduler was used. Plesk RunNow was used only for installation/read-only receipts.

Tracker correction: prior credential update exceeded the3000-character evidence
limit and did not persist despite optimistic in-form read. Replaced with concise
current summary and PR evidence link; preservation of original criteria required.

Task269 automatically checked at16:32:01Z (supervision.checked_at1795019521.3296409):
issues[], notified_at0. This proves the separate cron check ran, not delivery of a
fault alert. First monitor job completed success with cleanup. Live Monitoring
read16:31:59Z shows Independent availability Passed16:30:04Z, encrypted backup
Passed15:46:19Z/artifactpresent, heartbeat Passed16:26:14Z. V1-023 remains
Verified3/3, V1-014 Inprogress2/3. Original acceptance criterion3 can now be checked
for the implemented bounded repair; first trigger-cause criterion and complete
fresh-monitor/backup/heartbeat cadence criterion remain open. MON-01 stays
Inprogress3/5. Full backup-cycle observation and Plesk alert-delivery acceptance
remain; do not claim continuous availability or incident recovery from this run.
