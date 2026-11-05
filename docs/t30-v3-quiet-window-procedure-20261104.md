# T30 V3 write-freeze procedure — review only

Date: 2026-11-04. **Not approved to execute.** No service stop, DB permissions change, provider setting change, backup, restore, merge or deployment is authorised.

## Scope and baseline

Source: FaraiOS staging Supabase `xdmfyrsauvqznkloroxg`, PostgreSQL 17. Plesk Node.js `staging.faraios.com` uses `_test_payments.cjs`, with standard accounting runtime and TEST payment handler. Separate Plesk T19 invoice scheduled task is enabled at `*/5 * * * *`. The application can start on request even when Plesk reports Idle.

A read-only DB inspection observed idle client sessions, but this is a snapshot, NOT a persistent write fence. The FaraiOS DB does not have installed pg_cron/pg_net job extensions, but shared-cluster background processes exist.

Before any pause, the owner/operator must securely record exact current cron task identity/schedule/state, Node.js runtime/startup file/app root/status, deployed source fingerprint, TEST payment settings, private worker configuration and current in-flight/pending job metadata. No keys, passwords or personal/financial rows may be copied into GitHub.

## Quiescence gate

**Each writer must have an independently observed reversible pause and an explicit resumption plan.** The inventory is:

- Plesk T19 scheduled job: preserve the exact `*/5` definition; plan reversible task deactivation; observe any currently running child to completion. Do not discard invoice jobs or override provider uncertainty.
- Node.js app: record original settings and plan disabling the request-triggered web process; verify web mutations cannot start again. Stopping it alone is not a global DB lock.
- Paystack TEST webhooks: prevent ingress without acknowledging unpersisted events; establish provider retry/reconciliation for callback requests received during the hold. Preserve immutable transaction references and idempotency.
- Direct Supabase REST/RPC clients: identify machine credentials, automation, browser SDK and independent integrations; ensure new writes are actually prevented for the duration.
- Supabase Auth: identify signup/login/reset/session writes, admin actions and any other Auth producer; verify Auth can be held without lost sessions or false acknowledgements.
- Manual SQL/backend or deployment writers: block migrations, owner SQL updates and service workers during the maintenance window.
- Unidentified external writers: if any cannot be attributed and controlled, **abort the capture** rather than asserting quiet.

Do not change RLS, database privileges, provider secrets or service-role keys as an improvised freeze. A maintenance banner, idle connections, Node Stop, or app-level HTTP block alone is insufficient evidence.

## Reversible operating sequence (requires separate owner approval)

1. **Baseline:** record exact time, fingerprint, DB project identity, writer inventory, expected restore order, and financial/provider event continuity. Obtain an operator who can independently observe DB writes and stop/resume each writer.
2. **Pause ingress:** use a separately approved bounded maintenance procedure to stop new app requests and TEST webhook processing without reporting false success; preserve retries.
3. **Pause scheduler and independent workers:** reversibly deactivate the recorded T19 Plesk task; drain in-flight runs; block other direct REST/RPC/Auth/SQL writers with independently verified controls. Do not alter pending financial entries.
4. **Prove quiet:** observe no new writes for the agreed bounded interval; independently verify no active/in-flight worker or unacknowledged provider operation; confirm stable protected V3 profile and all capture catalog fingerprints. If proof is incomplete, terminate the attempt and restore original settings.
5. **Backup gate:** ask for explicit separate approval for an actual encrypted V3 capture. Only then use existing owner-only backup process with hidden password, required `QUIET` evidence and private key custody. The current PR code does not grant backup authority.
6. **Restore original operation:** reactivate the exact cron, Node startup and all paused clients; process held webhooks by verified provider state and idempotency, not by manual replay without checks. Verify scheduler status, pending jobs, Auth/API access, no duplicate financial effect and no unauthorized messages.
7. **Recovery later:** separately approve a fresh isolated restore destination, real archive retrieval and measured full V3 restore/RPO/RTO. Never reuse the old T11 target.

## Evidence and hard stop rules

Recording an idle database is NOT proof of no writes. The only acceptable quiet-window result has independent operational evidence for **every** writer and the rollback procedure. The source-only pure assessment in `scripts/t30-quiet-window-evidence.mjs` cannot independently observe or authorize a freeze, even when all supplied flags are true.

STOP if any writer remains uncontrolled, an in-flight T19/payment job is uncertain, protected profile/catalog changes, or a provider callback cannot be safely held. Restore only known baseline settings; preserve uncertain events for review.

**Current decision: HOLD.** Source preparation and synthetic tests are allowed; no staging/production modifications or capture/restore are approved. T30 In progress; PR #311 Draft/unmerged; T31 Not started.
