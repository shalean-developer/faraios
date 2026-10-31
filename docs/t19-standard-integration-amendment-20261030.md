> HTTPS update31Oct2026: [T19-AMEND-20261031-HTTPS](t19-https-amendment-20261031.md) replaces direct PostgreSQL/session-pooler access in the replacement runtime with restricted HTTPS RPCs and durable leases. Earlier port5432 requirements below remain historical. No backend principal is enrolled or Zoho connection activated.

> Subsequent authorised staging setup: inactive private tables and a NOLOGIN backend role installed; native SQL permission checks PASS. Network prevents host DB access. Canonical amendment recorded. See [staging setup evidence](t19-standard-staging-setup-20261030.md); earlier preparation-only statements below describe the initial increment. No connection or invoice activation.

# T19 amendment — standard server-side Zoho Books integration

30 October 2026, Africa/Johannesburg. Amendment ID: **T19-AMEND-20261030-STANDARD**.

Owner authority: current instruction authorises replacing the separate custody-service direction, reassessment, source preparation and isolated testing. It does not authorise shared deployment, credentials, activation or financial writes. **T19 In progress. Implementation candidate incomplete; activation NO-GO.**

## Decision and scope

Use standard Zoho Books OAuth 2.0 Server-based Application inside the FaraiOS backend. Keep independent grants, encrypted tokens, organisation bindings and sync identities for every business/environment. Use backend-only client configuration and AES-256-GCM token encryption, with durable OAuth state and database serialization. No separate custody application, machine-to-machine HTTP, loopback certificates, client TLS keys or custody wake-up in the replacement request path.

This supersedes the separate-process/Vault/mTLS implementation portions of T19-AMEND-20261024, C4/SEC-02 restricted-service composition and their custody-specific execution prerequisites. It does **not** waive security requirements, tenant isolation, owner authority, financial controls, recovery, the Build Plan's acceptance gates or any incident history. A12 needs replacement implementation evidence; it is not automatically resolved.

The standard account-level grant is not provider-enforced organisation isolation. Replace the historical sole-visible-organisation check with explicit verification of the selected organisation, pinned API routing on every request, appropriate consenting-user/role evidence, and negative tenant tests. This is an explicit proposed acceptance-method change; preserve the business isolation outcome. Record this exact distinction in the canonical T19 amendment before hosted activation. Never infer grant identity from an empty invoice list or from the FaraiOS owner's identity.

T19 depends on T18 as before. T04 is not reopened, T05 is not started, T20 remains Not started. No task IDs, other statuses, dependencies or completion dates change.

## Read-only audit evidence

Repository cloned clean; AGENTS.md and docs/blueprint.md read. Preparation branch `t19/standard-server-integration` starts at staging `8acabb1` (PR259). Default main differs materially from staging; do not base the change on main or merge all staging changes into main as part of T19. Read current acceptance/recovery records, invoice/accounting SQL, sessions, hosting wrappers, OAuth/worker/proxy composition and provider adapter.

Canonical Build Tracker A20:L21 read through Google Sheets: T19 In progress; scope includes independent business connections and encrypted hosted credentials; acceptance includes refresh, authorised durable work, uncertain-write reconciliation and recovery. Historical narrative remains extensive; no old summary is treated as current acceptance. The full workbook was also retrieved. Tracker edits below are prepared, not applied.

GitHub open-PR collection retrieved on 30 October: T19-related open PRs 102,105,106,110,114,118,131,160,165,166,182,193,194,195,196,198,204. PR118 targets main; several other historical PRs are stacked. Preserve each PR and its evidence; do not merge stale custody branches into the replacement. No PR was closed or modified. Other open PRs are outside this task.

Live staging schema metadata read using the FaraiOS connection for project xdmfyrsauvqznkloroxg: 2 business_accounting_connections and 2 business_invoices; private_t19_custody connections, operations, prepared_references, machines, machine_businesses, jobs, events, revocations, oauth_clients and oauth_states all report zero rows and RLS enabled. This is table metadata, not proof of credentials, permissions, completed SQL execution or installed service configuration. No financial rows or secrets were read.

| Area | Verified finding | Replacement implication |
| --- | --- | --- |
| Backend | Node24 ESM; Passenger/LiteSpeed wrappers; existing accounting handler injection | Can host the integration in the existing server; deployment qualification still required |
| Authentication | auth-session.read revalidates Auth and memberships; withOwner requires active owner | Reuse server sessions; recheck owner on begin, callback, changes and disconnect |
| Existing routing | accountingProxy hook forwards over mTLS; hosted entrypoint rejects legacy inline adapter/worker | Inject a direct backend handler; do not simply enable the legacy adapter |
| Invoice logic | zoho-books validates non-VAT snapshots, customer identity, totals, receipt and pagination; uncertain mode never creates an absent invoice | Reuse; current adapter is staging-only and supported non-VAT scope must remain explicit |
| Worker | current worker uses machine authentication and custody operation RPCs | Replace orchestration, not just its HTTP endpoint |
| Storage | public invoice/connection tables exist; private custody tables depend on custody/Vault model | Reuse public business records; prepare minimal new private token/state storage without altering old objects |
| Hosting | source supports Node backend and private sockets; prior hosting observations are historical | Current secret injection/permissions, callback routing, logs, scheduler and outbound access remain unverified |
| Recovery | 29Oct current-scope restore PASS is bounded and preserved | New encrypted token state, key backup and outstanding jobs need new recovery coverage |

## Official Zoho verification

Official documentation read on 30 October 2026:

- https://www.zoho.com/books/api/v3/oauth/ — Server-based registration; offline consent; one-use code; refresh; scopes and Books Authorization header.
- https://www.zoho.com/books/api/v3/introduction/ — organisation IDs, regional Books endpoints and API limits.
- https://www.zoho.com/developer/oauth/web-server-apps/get-access-token.html — server code exchange and regional Accounts endpoint.
- https://www.zoho.com/developer/oauth/web-server-apps/refresh-access-token.html — refresh without owner login; form-body parameter support; 1h access-token lifetime and throttling.
- https://www.zoho.com/developer/oauth/revoke-oauth-token.html — POST /oauth/v2/revoke/token, Basic client authentication, form token/token_type; HTTP200 means successful revocation.

Use settings.READ, contacts.READ, invoices.READ, invoices.CREATE. Do not request invoice UPDATE/DELETE, payments or sending scopes implicitly. CREATE effectiveness still requires an approved test draft. /users identity/role evidence may require additional documentation/scope validation; not implemented or claimed here.

Books documents the older /oauth/v2/token/revoke while Accounts documents /oauth/v2/revoke/token. Candidate uses the current authenticated Accounts endpoint; verify its response and actual revoked-token denial at milestone B. Token exchange/refresh use form bodies, never credential-bearing query URLs. Generic OAuth docs show api.zoho.com in examples; Books documents zohoapis regional domains. The candidate rejects mismatched token api_domain rather than silently accepting an alias; confirm actual Books response on staging.

Regional API allowlist inherited from the existing adapter covers US/EU/India/Australia/Japan/Canada/China/Saudi Arabia. Official Books docs also list UAE. UAE support is not claimed and needs an explicitly verified Accounts/API pair before adding it. Do not trust callback accounts-server as an arbitrary egress destination. Config pins one region per deployment in this first slice.

Published Books limits: 100 requests/minute/organisation; daily Free1000, Standard2000, Professional5000, Premium/Elite/Ultimate10000. Actual subscribed allowance must be checked. Refresh throttle: up to10 access tokens/10min per refresh token. Queue throttling/backoff must account for both; a process-local cache alone is insufficient.

Supabase changelog.md retrieval failed with unsupported content-type in the browsing service. No new Supabase SDK feature is used. Candidate uses pinned existing pg/PGlite dependencies and ordinary SQL; current hosted privilege/transport verification is still pending.

## Prepared source and actual limits

| Component | Prepared source | Evidence / limit |
| --- | --- | --- |
| Configuration and encryption | src/t19-standard-secrets.js | Explicit server config; AES-GCM AAD includes environment, business, connection, generation, organisation, region and client; no import-time env reads |
| Provider | src/t19-standard-provider.js | Fixed OAuth/Books endpoints; redirects refused, bounded responses/deadline, form-body secrets, generic errors; all provider tests synthetic |
| Owner connection lifecycle | src/t19-standard-connection.js | Single-use user/session/business/environment state; encrypted grant before org publication; refresh; disconnect fence before revocation; no provider identity claim |
| Private storage | database/t19-standard-store.sql, src/t19-standard-store.js | Two private RLS tables, organisation uniqueness, CAS and session advisory-lock adapter; no hosted migration or runtime grants |
| Backend routes | src/t19-standard-handler.js | Direct in-process handler for existing hook; owner connection/status page; secure Lax callback cookie and same-origin POST checks; not mounted or browser-tested |
| Isolated tests | test/t19-standard-connection.test.js, test/t19-standard-store.test.js, test/t19-standard-handler.test.js | Encryption/substitution, state expiry/replay, role denial, refresh coalescing, revocation failure and real SQL role denials |

This is a **bounded A/B preparation increment**, not the complete A–F implementation. Invoice enqueue/worker adaptation, reconciliation UI and operating-job implementation are still outstanding. Existing source entrypoints were deliberately not rewired to a candidate without a validated worker/storage/deployment boundary. No existing custody source was deleted. The replacement module graph imports no custody module.

The pg store requires a qualified direct connection or session pooler, with TLS verification and session advisory locks with autocommitted statements on the same lock-holder connection. Transaction pooling is unsuitable. Native two-process lock contention, dropped lock-session handling and restart recovery remain required before activation; PGlite does not prove these. Current SQL grants nothing to a new runtime login: prepare its least-privilege permissions after the actual host/database path is qualified. Do not use postgres or service_role as the deployed backend identity.

Unresolved exchanges remain consumed/unresolved in durable OAuth state, blocking new consent through a partial unique index. A crash or DB failure after Zoho exchanged a code can leave an unrecorded grant; operator revocation/reconciliation is required before resolving that hold. Do not auto-clear it. A failed org verification retains an encrypted disabled grant for revocation. New consent cannot overwrite connected or pending-revocation credentials.

## Security and key management

Client ID, client secret, encryption key and key ID come only from protected backend deployment configuration. Per-business refresh/access tokens are encrypted in private database rows. A shared app client may support independent per-business grants; use distinct clients where provider grant lifecycle testing shows independence requires them. Separate staging/production app credentials and independent encryption keys are mandatory; production composition/activation is excluded.

Env vars are delivery, not protection: verify which Unix user and Plesk operators can inspect them; no public prefixes, generated config, browser bundles, process diagnostics or child-process inheritance of secrets. Private credential files, if used, belong outside public/source/deployment roots with reviewed owner/mode/ACLs. Never log request bodies, authorization headers, token responses or configuration objects.

Before callback activation verify edge/proxy/application access logs suppress callback query strings, set no-referrer/no-store, and redirect to a clean completion URL. An OAuth authorization code necessarily arrives via the registered callback; do not claim secrets never appear in a callback URL. The candidate handler sets response protections but cannot configure upstream logging. The candidate handler redirects to the clean connection page after successful callback.

AES-GCM prevents DB-only readers from decrypting/substituting tokens. A compromised FaraiOS backend can read its environment key and tokens: this increases the backend's trust compared with a separate custody service. Accept this deliberate architecture trade-off with least privilege, code/deployment controls, restricted network/DB access and monitoring. Same-process encryption is not protection against server compromise.

Key rotation before activation: maintain reviewed key IDs and a bounded old-key read window; re-encrypt under the new key after disabling work and backing up; verify every envelope; retain old key privately until recovery acceptance; remove old key after retention decision. Current candidate supports one key ID and rejects unknown IDs; multi-key online rotation is not implemented. Back up encrypted data and keys separately, then prove restore without exposing plaintext.

## Smallest complete staging delivery and estimate

Estimate: **6–10 focused engineering days remaining**, plus owner/provider/access waiting time. Planning range, not a delivery commitment; re-estimate after backend DB path and scheduler qualification. Existing tests are reusable but cannot remove hosted gates.

| Milestone | Remaining implementation and evidence | Estimate |
| --- | --- | --- |
| A | Qualify backend DB/TLS/role/config/logging; mount direct handler; test owner/non-owner/foreign-business requests, consent and exact verified Shalean TEST org; consenting Zoho identity evidence | 1–2 days |
| B | Native refresh/disconnect contention and interruption; validate token/revoke endpoints; secret/bundle/log denial; encrypted backup/key recovery | 1–2 days |
| C | Adapt approved invoice intent into durable job tied to connection generation, actor, explicit write approval and immutable snapshot; create one owner-approved synthetic TEST draft, read back ID/totals/status | 1–2 days |
| D | Commit dispatch marker before POST; expired dispatch is reconcile-only; durable retry/backoff, pagination and multiple-match quarantine; kill before/after dispatch/lost-response tests | 1–2 days |
| E | Independent Bokkie grant and TEST org, tokens and jobs; swap/foreign-role/environment tests; revoking one must not affect the other | 0.5–1 day |
| F | Scheduler overlap/restart/missed-run and heartbeat/error monitoring; total reconciliation, operating/rollback/recovery instructions; owner UAT; exact T19-only tracker update | 0.5–1 day |

Milestone order A→B→C→D→E→F is retained. No milestone has passed on live staging in this increment. A “Connected” label or these unit tests cannot close T19.

The invoice worker must freshly authorise the queued actor/business and validate its generation immediately before refresh and dispatch; take a database lock and commit dispatch intent before an external write. Retry only definitely pre-dispatch transient failures, with bounded exponential backoff/jitter and Retry-After handling. Unknown outcomes are held/reconciled against the exact reference and full receipt; absence is not permission to create again. Do not promise general exactly-once provider delivery. Local invoice IDs, explicit customer IDs, snapshot hashes, external IDs, attempts, errors and reconciliation evidence must remain business/environment scoped. No send, payment or edit-existing-invoice operation belongs to this slice.

A durable job table or existing eligible operation journal is needed beyond the two token/state candidate tables. Decide its exact delta after comparing the existing public claim/finish functions and custody jobs. Do not copy custody tables or add another invoice identity table without that comparison. Native tests must prove atomic claims and crashes, not mirror implementation strings.

## Acceptance and rollback

Retain every owner-requested outcome: independent Shalean/Bokkie connections and verified org mappings; backend-only secure credentials; automatic refresh; reliable background work; approved correct draft; retries/interruption duplicate safety; disconnect, revocation and useful errors; staging/production separation; reconciled results; owner staging acceptance; canonical T19 update.

Before any deployment prepare exact SHA, changed files, migration/grant hashes, disabled defaults, host prerequisites, tests, backup/recovery, rollback and requested scope. Before C obtain separate explicit approval naming the TEST org, synthetic customer/invoice snapshot and amount. Existing R875/R410 drafts are not implicitly approved for provider creation.

Rollback: stop the replacement worker/scheduler; fence connections and retain uncertain operations; return to the previous inactive application entrypoint. Keep encrypted data/keys and evidence for recovery; revoke only replacement grants deliberately after reviewing cross-grant effects. Do not automatically reactivate custody, erase old schemas/credentials or resend invoices. No production rollback action is needed because no production change is authorised.

Current decision: **CONDITIONAL PASS for bounded source preparation and isolated tests; NO-GO for hosted activation or T19 closure.**

## Validation record

- Replacement suite: 12/12 PASS, no skips (8 connection/provider/crypto cases, 1 actual local HTTP case with synthetic sessions/provider, 3 store/lock-adapter cases). After the final owner/expiry pre-exchange guard change, affected connection/HTTP tests repeated: 9/9 PASS.
- Store tests execute candidate DDL and SQL in PGlite, including real SQLSTATE42501 role denials, unique pending-state conflict and CAS. This is not native multi-process PostgreSQL, hosted RLS or real Supabase Auth acceptance.
- Existing focused regression: `node --test test/zoho-books.test.js test/zoho-setup.test.js test/accounting-stage-b.test.js`: 55 PASS, 1 native PostgreSQL case explicitly SKIPPED, zero failures. Full repository test suite was not run.
- Existing `npm run check`, explicit syntax checks for all five new modules, and `git diff --check`: PASS.
- The first HTTP test used Fetch to override Host; Node did not send the required configured Host, producing403. Corrected the test client to use native HTTP with explicit Host; final positive/negative routing test passes. No runtime host validation was weakened.
- No remote push/PR, canonical sheet edit, hosted SQL/grant, deployment, credential access or Zoho request occurred. All network-like provider tests used dummy material. No financial write was performed.
