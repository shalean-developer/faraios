# MON-01 — external scheduling fallback

Status: prepared, not installed or enabled. MON-01 remains In progress.

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

Run `scripts/schedule-fallback.py` from a separately operated Linux scheduler
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
provisioning and selecting an independent host remain prerequisites. Do not reuse
an unrelated existing token or create access without authorization.

An external timer will appear in GitHub as `workflow_dispatch`, not `schedule`.
Acceptance must pair unattended timer receipts with exact returned GitHub run IDs,
conclusions and encrypted artifacts. A person pressing Run workflow is not proof.

## Installation and rollback procedure (not executed)

1. Select a host outside FaraiOS/Plesk and outside GitHub Actions scheduling.
   Do not put the host-down watchdog on the monitored host. No host or paid plan
   is assumed approved by this preparation.
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
increasing thresholds. Approval to prepare this does not establish a host, provide
credentials, change main or prove automatic execution.

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

Decision: NO-GO for closure/activation until host, credential, timer supervision
and automatic-run evidence are in place. Code preparation is complete only after
the recorded isolated test result passes.
