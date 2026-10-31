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

No secret values or sample usable credentials are in source. The host configuration needs backend email/password/UUID, Zoho server-client ID/secret and a fresh32-byte encryption key/key ID. Keep encrypted data/key backups separate and test recovery before activation. The private configuration file and dedicated Auth account have **not** been created.

Plesk's previous browser tab was closed; a fresh visit to the existing host now reaches the sign-in page. Host probes, file setup, callback query-log redaction, source deployment, successful machine Auth/RPC, server restart and owner UI acceptance remain pending. No app startup setting was changed and no request to Zoho was made. Supabase reachability over443 was established earlier; current host-to-RPC acceptance still needs the signed-in Plesk session.

## Next private setup and remaining gates

1. Sign into the existing Plesk subscription. No firewall/root change is required for this path.
2. Provision a dedicated backend Auth user through supported administrative tooling, with email confirmation handled explicitly and no outbound email inferred. Set its password privately. Verify it has no active business memberships. Record its UUID without exposing its password/session.
3. Enroll only the intended staging business IDs in private backend_businesses after owner-authorised credential setup; recheck no user membership and live session. Do not enroll an existing owner/manager account. Enrollment is absent today.
4. Configure a Zoho Server-based staging client with exact HTTPS callback `https://staging.faraios.com/accounting/zoho/callback`; keep region .com and selected TEST organisations explicit. Do not copy production credentials or assume old loopback clients are suitable.
5. Generate the encryption key privately on the host and write the protected configuration; verify permissions/public-path denial without printing contents. Source must pass review/CI before deployment.
6. Verify edge log redaction for callback query strings and headers, select the reviewed connection-only startup, restart and test anonymous/foreign-owner denial, backend RPC success and correct Shalean TEST org. No invoice sync yet.
7. Continue milestones B–F: real refresh/revoke/isolation/recovery, approved synthetic invoice, worker/retry/interruption reconciliation, Bokkie and owner UAT. Previous A–F outcomes and explicit financial-write approval requirements remain.

Rollback: return to the previous inactive startup, stop any replacement job, disable the backend allowlist and retain encrypted evidence/uncertain operations. Do not auto-clear expired leases, delete history or reactivate custody. If helper/API removal is required, review exact dependency/privilege changes first.

**Decision: PASS for bounded source/empty-schema preparation and unauthorised denial evidence; NO-GO for connection activation or T19 closure.**
