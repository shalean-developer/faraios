# T19 amendment: reuse Shalean’s standard backend integration

Owner direction:31Oct2026, “connect Faraios to zoho like the way shalean live site did”; audit and preparation authorised. T19 only. T20 Not started; T04/T05 untouched.

## Verified source

Read Shalean production branch at f1b645f130e3aeefa28cd292db379d5688e4a13e. This is production-branch source evidence, not an inspection of deployed secret values or proof of current cron execution.

- apps/web/lib/zoho/zohoBooksClient.ts: server-only module; client ID/secret, refresh token, organisation ID and regional domains from server environment. Refresh token is provisioned once (comment describes OAuth playground); token endpoint is HTTPS POST with form body, access token cached in process until one minute before expiry. No hosted callback is part of this module’s setup path.
- apps/web/lib/supabase/admin.ts: Supabase JS HTTPS API client with server service-role credential. No direct PostgreSQL5432 needed by this application path. Do not copy its live key.
- apps/web/lib/accounting/accountingSyncQueue.ts and processAccountingSyncQueue.ts: persistent sync records, due retry selection, bounded exponential delay, visible failed status/external IDs. Cron route uses Bearer secret and withCronLock; batch10.
- apps/web/lib/zoho/zohoBooksService.ts: invoice matching uses deterministic reference plus full source-identity trace checks, then create/update service methods.
- apps/web/lib/accounting/zohoIntegrationSettings.ts and migration20261058: one singleton configuration, one organisation from process env; not multi-business isolation.

Unknown: live host environment settings, initial historical grant flow, effective scheduler configuration/execution, concurrent process token refresh behaviour and exactly-once external financial outcomes. Reading production branch is not live acceptance.

## Recommended replacement

Use the same small in-process standard OAuth/API adapter, one-time owner-authorised private grant setup, automatic access-token refresh, HTTPS database calls and bounded persistent queue worker. No separate custody process, loopback certificates or direct PostgreSQL connection. Stop pursuing Allanux callback-log changes as a prerequisite for this setup route: no real OAuth code will be delivered to the hosted FaraiOS callback.

Proposed onboarding amendment: for initial Shalean/Bokkie staging, use one-time owner-assisted credential provisioning, matching Shalean’s operational pattern, rather than requiring hosted Connect-button OAuth. This changes onboarding implementation, not permission, organisation verification, durable refresh, disconnect or invoice requirements. General self-service Connect remains a separate implementation choice; do not represent private setup as a completed Connect UI.

Keep FaraiOS business/environment-scoped encrypted grants and current restricted HTTPS storage; a global ZOHO_REFRESH_TOKEN/organisation singleton cannot satisfy its multi-business contract. Reuse already verified backend account/RPC instead of introducing Shalean’s broad service-role key. Client credentials and encryption key stay server-only; the two grants and organisation pins remain independent. Environment variables alone are not an encryption/access-control guarantee.

Do not copy Shalean’s raw provider-error logging, payment-write paths, default incoming bank account or process-global token cache unchanged. Adapt redaction, fixed regional origins, per-connection refresh serialization, durable invoice identity/uncertain-write reconciliation and owner permission checks. Its queue’s select-then-insert behaviour is not proof of concurrency safety. Existing FaraiOS tests and invoice contracts remain authoritative.

## Smallest implementation sequence

1. Add an explicit disabled server-side provisioned-grant mode to the prepared standard runtime; preserve existing callback mode/source for rollback. No runtime/public grant-import endpoint. A private setup utility must bind the owner-authorised business/environment/pinned organisation, verify provider organisation/currency and grant before encrypting/publishing through existing generation/lease controls. Inspect official client flow before collecting credentials; never reuse Shalean live tokens or clients. No new Auth/database subsystem.
2. Qualify read-only Shalean TEST refresh/status, restart durability and disconnect; no hosted OAuth redirect and no new certificate requirement. Keep connection UI truthful about setup mode.
3. Adapt existing invoice job boundary to HTTPS-scoped queue calls and scheduled bounded execution; preserve invoice approval, stable IDs, interruption reconciliation and duplicate prevention. Never enable financial writes by changing the connection switch.
4. Obtain explicit approval for one synthetic staging draft; verify exact Zoho ID/totals and retry/interruption behaviour, then repeat isolation with independent Bokkie grant. Complete reconciliation, operating instructions and owner staging acceptance.

No new source runtime is implemented by this audit. Effort should be revised after inspecting the exact existing worker/RPC contracts; no unsupported completion date promised.

## Supersession and rollback

Supersedes treating the hosted /accounting/zoho/callback log-redaction work as a universal staging blocker. The verified synthetic logging finding remains valid for any future hosted callback path and is preserved; it is not a blocker for a setup path that never sends codes there. Existing disabled configuration, migrations, test evidence and PR260 retained. No deployments, credentials, private objects or historical custody code deleted.

Decision: PASS for source audit and bounded simplification proposal; NO-GO for real grant publication, invoice activation or T19 closure until the selected setup flow and source have been implemented and verified. No Shalean live changes, secret reads, provider grants, financial writes or production activation performed.
