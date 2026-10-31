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
