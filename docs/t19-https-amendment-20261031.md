# T19 HTTPS storage amendment and setup evidence

31 October2026, Africa/Johannesburg. **T19-AMEND-20261031-HTTPS** supplements the owner-authorised standard backend OAuth direction. Work remains T19 only. T20 Not started; T04/T05 untouched.

## Direction

The replacement path keeps Zoho OAuth, token encryption, refresh and authorised application actions inside FaraiOS. FaraiOS uses Supabase Auth and its Data API over verified HTTPS443 for storage. The earlier prepared pg/session-pooler adapter is preserved as history but is not imported by the new runtime. No separate custody app, loopback TLS, PostgreSQL egress, DNS change or website-IP change is required by this new path.

A publishable key alone cannot reach tokens. Use a dedicated Supabase Auth identity with **no active business membership** and an explicit private per-business backend allowlist. Each RPC verifies the identity's live Auth session, rejects a business-user identity and checks its enabled staging-business binding. The machine identity receives no service-role key, JWT signing secret or database login. Ordinary owner sessions remain independently checked by FaraiOS and owner membership is checked again for OAuth state creation/consumption.

This introduces a dedicated backend Auth account and password as deployment credentials. It is not an organisation owner or an interactive customer account. Account creation/enrollment and private credential configuration are still pending; this amendment does not claim an operational connection.

## Verified sources and environment

Official sources read31Oct:

- https://supabase.com/docs/guides/api/securing-your-api — grants, RLS, private helpers and explicit API function permissions.
- https://supabase.com/docs/guides/getting-started/api-keys — secret/service-role keys are privileged, so they are not used by this backend.
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword — standard authenticated session acquisition with publishable app key.
- https://postgrest.org/en/stable/references/transactions.html — request-scoped transactions; HTTPS requests cannot safely share a session advisory lock.

Supabase changelog.md fetch still fails with unsupported markdown content-type in the browsing service. Existing pinned supabase-js2.118.0 and pg/PGlite dependencies were not upgraded. The live staging auth.sessions columns id/user_id/not_after and its RLS setting were verified; no managed-auth schema was modified. A private boolean session checker avoids granting the runtime direct managed-auth table reads.

## HTTPS concurrency model

A new private operation_leases table serializes operations by business/environment. Acquisition is an atomic database operation; every mutation checks the holder UUID, authenticated backend principal, live enabled business binding and120-second DB-clock expiry. State consumption remains committed before token exchange, and tokens remain AES-GCM encrypted with existing tenant/environment/org/generation AAD.

An expired lease is **not automatically reclaimed**. Crashes, lost acquire/release responses or expiry require recovery review. Late publication and refresh writes are rejected. This favours duplicate safety over automatic availability; operator recovery remains mandatory. The background invoice worker is still a separate remaining implementation, and no exactly-once external-write guarantee is claimed.

Storage guard checks run before OAuth exchange, refresh, organisation verification, revocation and entry to a guarded access callback. A future invoice worker must invoke the supplied guard immediately before every provider dispatch and persist its dispatch marker before POST. A lease alone does not make provider writes transactional.

## Shared staging changes actually executed

Applied migration `t19_standard_https_storage` to project xdmfyrsauvqznkloroxg:

- New private backend_businesses allowlist and operation_leases tables, both RLS enabled.
- Private `live_backend_session()` boolean SECURITY DEFINER helper owned by the migration role; EXECUTE available only to the NOLOGIN function role. No Auth row data returned or runtime Auth-table grant.
- Private `https_store(text,jsonb)` dispatcher owned by t19_standard_backend; fixed empty search_path, named actions only, no supplied SQL, principal/business/environment checks, SQL CAS and leases.
- Public `t19_standard_store(text,jsonb)` SECURITY INVOKER wrapper, granted only to authenticated. PUBLIC/anon/service_role EXECUTE explicitly revoked. Private table reads remain denied to ordinary authenticated users.
- Narrow function-role column reads/policies for active business/owner membership metadata; no customer/invoice grants. t19_standard_backend remains NOLOGIN and has no schema CREATE privilege.
- No backend enrolled; allowlist, leases, tokens and state remain0rows. No credential, owner consent, invoice or payment was created.

The first two migration attempts failed with private-function EXECUTE permission during ownership/grant ordering; each transaction rollback and original SET=false membership were verified. Final source creates the wrapper and grants access while the migration role still owns the private function, then transfers ownership and removes temporary SET/CREATE authority. The final migration succeeds without persistent broad grants.

## Verification

- Focused replacement + existing staging-server tests:70/70PASS, zero failures/skips.
- Tests exercise allowlisted live machine identity, human/business-user rejection, foreign scope, production denial, missing/revoked session, state replay, independent RPC clients competing for a lease, stale/expired holder denial, disabled-token refresh denial and pinned HTTPS-only egress.
- Actual local HTTP test proves manual invoice-sync POST is blocked by connection-only mode even if legacy metadata says enabled. No enqueue/provider write occurs.
- Dedicated backend-client test uses synthetic Auth responses with pinned identity verification; it does not prove actual backend login or JWT validation by the hosted gateway.
- Broader local hosted/staging run:75PASS/2FAIL, the two failures are Unix-listener EPERM. Both failures reproduce on unchanged8acabb1 in isolated baseline worktree. They were not waived or weakened.
- Native PostgreSQL17.11 rollback-only tests: anonymous/service-role RPC denied; unenrolled authenticated RPC denied; authenticated token-table read and private session-helper EXECUTE denied, each SQLSTATE42501. Function owner and NOLOGIN/no-CREATE checks pass; all four private table counts0.
- Real HTTPS RPC request from the execution workspace, using only the staging publishable key: HTTP401/code42501, unauthorisedDenied=true. This is denial evidence, not a successful machine/owner/provider integration.
- Security advisors before/after are unchanged: the same three old informational no-policy findings and leaked-password-protection warning. Existing warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- Syntax checks and npm run check PASS. Complete repository suite not claimed.

## Connection-only deployment source

`_standard_accounting.cjs` explicitly composes the new HTTPS runtime. The default `_passenger.cjs` is unchanged. It loads a private fixed-path configuration, authenticates the dedicated backend identity, requires an enrolled-health result and mounts the direct in-process connection handler. It sets accountingConnectionOnly=true: legacy enqueue RPCs remain outside the app's SDK network allowlist and manual invoice sync is blocked server-side. No scheduler or financial dispatch is enabled.

Protected configuration is `/var/www/vhosts/faraios.com/.faraios-t19-standard/staging.json`, outside app/public/Git. Loader requires canonical Linux path, protected ancestors, owner/root-only regular file, no symlink/hardlink, bounded descriptor read and stable file identity. It accepts only version/enabled/backend/zoho fields. The staging origin/project/Zoho region are source-pinned. Backend configuration is read from that private file because the existing blanket process-environment credential guard is retained. This is server-only deployment configuration, not a browser secret store.

No secret values or sample usable credentials are in source. The host configuration needs backend email/password/UUID, Zoho server-client ID/secret and a fresh32-byte encryption key/key ID. Keep encrypted data/key backups separate and test recovery before activation. The disabled private configuration and dedicated Auth account are now created. The owner entered its password privately; no credential values were inspected. Shalean alone is enrolled, with its approved TEST organisation/API domain pinned in private metadata. Bokkie remains unenrolled until milestone E.

Hosted verification on31Oct2026: backend authentication and exact principal verification PASS; RPC health200/ready=true; Shalean staging connection read succeeds and returns no token record; Bokkie and production requests denied42501. Diagnostic logout succeeded and replay with the revoked session is denied42501. All private token/state/lease counts remain0; standard startup remains disabled/undeployed.

Native Auth-schema defect: the restricted role had helper EXECUTE but no managed auth-schema USAGE. A grant attempt reported success but native post-check proved no ACL change: managed postgres cannot delegate it. Preserve that failed attempt as historical evidence. The corrective dispatcher reads the PostgREST-verified request sub directly, retaining the existing private live-session boolean checker and all membership/enrollment/lease checks. The backend still has no auth-schema USAGE, auth.users/auth.sessions SELECT or private-schema CREATE. Isolated tests now model restricted auth-schema grants and pass5/5. This is an acceptance-found correction, not evidence that unit tests alone verified hosting.

## Next private setup and remaining gates

1. Sign into the existing Plesk subscription. No firewall/root change is required for this path.
2. Provision a dedicated backend Auth user through supported administrative tooling, with email confirmation handled explicitly and no outbound email inferred. Set its password privately. Verify it has no active business memberships. Record its UUID without exposing its password/session.
3. Enroll only the intended staging business IDs in private backend_businesses after owner-authorised credential setup; recheck no user membership and live session. Do not enroll an existing owner/manager account. Only Shalean is enrolled today; Bokkie remains deferred to milestone E.
4. Configure a Zoho Server-based staging client with exact HTTPS callback `https://staging.faraios.com/accounting/zoho/callback`; keep region .com and selected TEST organisations explicit. Do not copy production credentials or assume old loopback clients are suitable.
5. Generate the encryption key privately on the host and write the protected configuration; verify permissions/public-path denial without printing contents. Source must pass review/CI before deployment.
6. Verify edge log redaction for callback query strings and headers, select the reviewed connection-only startup, restart and test anonymous/foreign-owner denial, backend RPC success and correct Shalean TEST org. No invoice sync yet.
7. Continue milestones B–F: real refresh/revoke/isolation/recovery, approved synthetic invoice, worker/retry/interruption reconciliation, Bokkie and owner UAT. Previous A–F outcomes and explicit financial-write approval requirements remain.

Rollback: return to the previous inactive startup, stop any replacement job, disable the backend allowlist and retain encrypted evidence/uncertain operations. Do not auto-clear expired leases, delete history or reactivate custody. If helper/API removal is required, review exact dependency/privilege changes first.

**Decision: PASS for bounded source/empty-schema preparation and unauthorised denial evidence; NO-GO for connection activation or T19 closure.**


Current setup checkpoint: steps1–3 and the private encryption-key/password portion of step5 are verified. Organisation pins and request-principal correction are applied to staging and included in PR260; new exact-head CI must pass before any source deployment. Steps4 and6 remain pending. Callback log protection, Zoho client configuration/consent, provider refresh/disconnect, reliable invoice worker and all financial acceptance remain unproved. No financial writes or production changes.


## Hosted callback-log qualification —31Oct2026

Synthetic HTTPS request from104.238.222.122 to the exact staging callback returned404 with verified TLS (new handler remains undeployed). Plesk Apache SSL/TLS access log at07:09:47SAST explicitly recorded `GET /accounting/zoho/callback?code=T19_SYNTHETIC_LOG_PROBE_20261031&state=T19_SYNTHETIC_STATE HTTP/1.1`. These are harmless synthetic markers; no real grant/code/token was used. Full callback query logging is therefore verified, not hypothetical.

Plesk domain841 Apache & nginx page exposes only common MIME/handler/index/expiry/header/symlink settings; no additional virtual-host directives or log-format controls were present. No settings were saved. Do not infer that application redirection/header controls remove an edge access-log record.

Required hosting change: Allanux must protect only staging.faraios.com OAuth callback logging across its active LiteSpeed/Apache/proxy, error and WAF/audit layers, excluding sensitive query strings, Authorization/Cookie headers and request bodies while retaining useful safe path/status/time logs and existing unrelated-site logging. Use the provider-supported configuration; no unverified Apache/nginx directive is prescribed for LiteSpeed. Preserve rollback/configuration evidence and repeat synthetic code/state and header/body checks before any real OAuth consent. Include HTTP-to-HTTPS handling and referrer/error capture in verification.

Decision: NO-GO for real OAuth consent/activation until hosted logging acceptance. Dedicated Zoho Server-based staging client registration may be prepared separately with homepage https://staging.faraios.com and exact redirect https://staging.faraios.com/accounting/zoho/callback; old clients/credentials must remain preserved. No real provider grant, financial write, source deployment, recurring task or production change performed.
