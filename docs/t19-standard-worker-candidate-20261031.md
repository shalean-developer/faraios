# T19 standard invoice worker candidate — 31 October 2026

Scope: source and isolated testing. T19 In progress; T20 Not started. No hosted migration, scheduler, invoice approval or financial write is part of this preparation.

The standard staging connection lifecycle is already evidenced. This candidate adds a durable invoice job queue to the standard backend and uses the existing immutable invoice agreement, draft-only Zoho adapter, exact receipt verification and invoice receipt publication. It does not use the separate custody application, loopback TLS, Vault or direct database networking in the active worker composition.

## Components and controls

- `database/t19-standard-jobs.sql`: private queue with one permanent write identity per invoice. A live authenticated business owner approves an existing invoice/customer binding. The backend never accepts browser snapshots or caller-selected approver identities. New RPC actions require the existing live dedicated-backend check and a held business/environment lease. Jobs bind to connection ID, generation, exact organisation/domain, actor and customer. Reconnect, revoked ownership and cancellation quarantine old jobs.
- `src/t19-standard-worker.js`: one invoice per business per invocation. It obtains access through ordinary standard token refresh under the existing connection lease. Every request is guarded; dispatch is committed before POST. Dispatched/interrupted attempts reconcile only. An uncertain receipt remains review-required; reconciliation never creates an absent replacement.
- `src/t19-standard-https-store.js` supplies only an in-process copy of the held lease context. No browser receives it. The backend client permits the one new fixed HTTPS jobs RPC, not arbitrary table access.
- `scripts/t19-standard-invoice-worker.mjs`: an explicit one-pass command, never imported by web startup. It requires a separate owner-only `invoice-worker.json` with version 1, environment staging, enabled true and a bounded UUID businessIds list. Missing/disabled configuration fails closed. No worker file or scheduled task has been created on hosting.
- Provider failures before dispatch use exponential backoff, capped at five attempts. Dispatched or ambiguous outcomes remain visible for reviewed reconciliation. A lost response to dispatch retains its durable marker even if the caller cannot acknowledge it.

## Security trade-off and migration review

The new narrow job RPC and approval function are Postgres-owned SECURITY DEFINER functions with an empty search path. They can update approved invoice execution metadata through explicit scoped checks without granting the runtime direct invoice/token table access. This is a deliberate privilege boundary requiring complete diff/native-denial review before installation. Approval verifies an actual live Auth session and current owner membership; worker actions reuse the existing live backend/session/enrollment/lease boundary. Existing historical custody objects are preserved. Do not activate both workers.

Initial staging queue approval is owner-only; existing manager invoice read/manage permissions are unchanged. This staging pilot does not claim manager enqueue acceptance.

Any invoice carrying a historical attempt or external ID enters the replacement queue as reconciliation-only, even if its legacy status says failed. This conservatively preserves uncertainty without depending on the old custody tables at runtime.

No legacy public accounting connection is enabled. Claim builds the provider context from the verified standard connection and checks any existing invoice provider/customer pin. The stored original invoice tax agreement is preserved; the existing adapter rejects unsupported VAT and unmatched receipts. This does not reopen T04 or change tax policy.

## Required evidence and activation sequence

Local isolated tests must prove owner/foreign-business/session denial, one verified draft, no duplicate under lost response or interruption, overlap denial, revoked ownership and reconnect fencing, bounded retries and receipt publication. CI also runs the actual create/finish path against a new disposable PostgreSQL cluster; this does not substitute for hosted enforcement or live provider acceptance.

After exact-head CI and review, prepare the concrete staging migration and permission inspection for owner approval. Do not activate a scheduler as part of migration. Verify hosted table/RPC denial and approval scope before preparing a named synthetic draft/customer/amount for explicit financial-write approval. Only after that approval may its owner approval record be created. Enable one bounded staging pass; reconcile its Zoho ID, then repeat interruption/retry checks. Independent Bokkie enrollment and final owner staging acceptance remain separate milestones.

Rollback: disable/remove the worker enable configuration or scheduler entry first; restore source/RPC exposure as reviewed. Preserve queue rows, dispatched markers, approvals, invoice receipts and historical connections. Never drop a dispatched job or clear an uncertainty flag to obtain a fresh create.

Remaining limitations: no job-status/enqueue UI yet; no hosted migration or scheduled execution; no live invoice write; Bokkie not enrolled; no final acceptance. Current source testing does not claim those outcomes.
