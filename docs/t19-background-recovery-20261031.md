# T19 background execution recovery amendment — 31 October 2026

T19 only; In progress. T20 remains Not started. Owner authorised proceeding with staging background checks after independent Bokkie TEST invoice acceptance. No production activation or additional financial write is included.

## Finding and replacement

The installed HTTPS store acquires an existing business/environment lease only when explicitly released. Process death skips release; expiry alone therefore leaves the integration unavailable indefinitely. This blocks reliable recurring execution.

The additive `t19-standard-lease-recovery.sql` retains the current private function owner, live-session checks, organisation/domain pins and ACLs. Its sole behavioural change permits replacement when released OR expired for more than 30 seconds. Lease duration remains 120 seconds; every mutation still checks current holder, principal, environment and expiry. Grace is additional recovery delay, not a claim that a paused process has terminated.

This supersedes the blanket prohibition on automatic expired-lease takeover in the HTTPS amendment and worker bridge plan **for this standard staging worker only**. Historical decisions remain preserved. Safe takeover depends on permanent per-invoice identity and the durable pre-POST dispatch marker: a successor reconciles dispatched work and cannot issue a replacement create. A paused former process is fenced from database updates; provider calls already in flight cannot be cancelled by SQL. Receipt uncertainty remains visible for review, never automatic recreation.

No table, credential, token envelope, invoice approval or financial receipt is migrated or deleted. This migration replaces the current function body with only the lease-acquire predicate changed.

## Verification and release gates

Focused SQL tests check active contention, expiry within grace, recovery beyond grace, and denial of old-holder guard/release/token mutations. A separate disposable native PostgreSQL cluster test launches the actual worker in a child process, has a synthetic provider accept one create, kills the child before receipt delivery, advances only the synthetic lease timestamp, and runs the successor. Expected: matched receipt, one total POST, then idle. No hosted credentials or real accounting API are used. Native CI is required; skipped local native tests are not acceptance evidence.

Before hosted installation: require final-head CI including `T19_KILLED_WORKER_RECOVERY_NATIVE_PASS`, compare deployed function to the current source baseline, preserve previous definition, and verify no active lease/job. After installation: check function owner/ACL and scoped backend denials; run bounded idle checks for each TEST organisation. Do not simulate a crash by creating another external invoice without exact approval.

## Proposed bounded staging schedule

Only after recovery verification, create protected 600 `invoice-worker.json` (private 700 parent), version1/environment staging/enabled true, containing only the verified Shalean and Bokkie business IDs. Host command uses Node24 and `scripts/t19-standard-invoice-worker.mjs --run-once`; one invoice per business per invocation, every five minutes. Never import the worker into the web process or enable custody. Existing approval and mapping checks apply to every job; unsynced unapproved drafts remain untouched.

A saved recurring schedule and evidence of at least two separate invocations, overlap denial/recovery, safe logs, failure visibility and disconnect fencing are still required. Web health currently reports its own worker disabled; connection-page activation wording must be made truthful before exposing scheduled status. Do not claim recurring reliability from manual runs.

Rollback: disable/remove only the new staging schedule and set its protected worker flag false; retain mappings, credentials, invoices, dispatch identities and receipts. Restore the saved function definition only after all workers stop and no held lease remains. Never clear dispatch markers or reactivate custody. Reconcile uncertain jobs read-only. Estimated remaining recovery/scheduler work: 2–4 engineering hours plus final staging observation and owner acceptance; VAT-on support and final T19 acceptance remain separate open requirements.

## Recovery verification and scheduler preparation follow-up

PR271 merged staging9547325d433f0cc8ff2792fdfab3aecc9c9d19d8. All five final-head checks passed; native log includes the actual killed-worker test PASS and `T19_KILLED_WORKER_RECOVERY_NATIVE_PASS` (31 October 19:29 UTC). Installed `t19_standard_lease_recovery` on staging after exact deployed-body comparison and zero active jobs/leases. Post-install comparison verifies only the acquire predicate changed; owner and ACL unchanged. Hosted refresh/organisation/AAD/cross-business lease/production denial probe PASS for both businesses, financialWrites0. Security advisor unchanged from pre-install baseline (five intentional default-deny private/audit table INFOs and one existing Auth leaked-password WARN outside T19 scope).

Scheduler source uses `t19-standard-scheduled-worker.mjs`, calling the existing guarded single-pass CLI. Fixed 600 no-follow log under the protected root; rotate at64KiB to one previous log. Only whitelisted IDs/statuses and UTC times are recorded. No raw child stderr, provider bodies or credentials are retained. Child runtime bounded to110seconds with hard kill; its abandoned lease/dispatch recover by the tested path. A failed job may be safely recorded for bounded retry even when the scheduled invocation itself completed; consult per-invoice state. Log `ok` records command execution, not financial acceptance.

Plesk task: `/opt/plesk/node/24/bin/node /var/www/vhosts/faraios.com/staging.faraios.com/app/scripts/t19-standard-scheduled-worker.mjs`, cron `*/5 * * * *`, description `T19 staging approved TEST invoice worker`, notifications off (no email authorisation implicit). Enable protected worker file only for Shalean612be091-b1d7-4911-9c3b-143446a9fe27 and Bokkie0cc3f518-d64e-40c2-8817-bc14d1ef1420. No browser visits are required for execution. Check protected latest log for start/finish per invocation, safe error marker and both business results; inspect owner invoice review for financial errors. Rollback first unchecks Active in this exact task, then sets enabled false; retain all receipts/identities/logs. No exact future invoice is approved merely by enabling the worker.

Connection page wording is corrected to explain explicitly approved staging drafts and invoice-level verification, without claiming scheduling or financial acceptance from Connected. Web health `accountingWorker:disabled` refers to in-process dispatch; the separate Plesk task/log is the scheduler evidence. Full T19 remains open pending observed scheduled execution, operating checks and owner staging acceptance.
