# T19 A12 hosted custody and business-denial test package

Status: prepared, live refresh BLOCKED, not executed. Date: 28 October 2026.

## Authority and accepted prerequisite

Owner accepted the exact corrected local Gate2 disposable test and then instructed “Proceed” to this package. See t19-gate2-owner-accepted-20261028.md. This permits preparation and read-only review within the existing owner-led A12 staging direction; it does not authorize hosted DDL, role/grant changes, credential provisioning, deployment, OAuth consent, provider writes, financial mutation or worker activation. Historical reviewer prerequisites superseded by t19-owner-led-acceptance-20261028.md stay superseded; no independent certification is claimed. Full T19 remains in progress and T20 not started. No tracker edit is made here.

Target staging project: xdmfyrsauvqznkloroxg, previously identified as faraios-staging, eu-west-1. Protected restore-test zrlojsvkqipuwkkyfrkn and production are excluded. Verify current control-plane identity before SQL. A database session's user/version alone cannot establish project identity.

## Current evidence and execution order

| Step | Required evidence | Current decision / boundary |
|---|---|---|
| 1. Refresh identity and inactive installation | Control-plane project identity, authenticated metadata, role/membership/default grants, function owners/search paths, private-schema exposure settings | BLOCKED by connector routing; historical NOLOGIN/three-table baseline is not a new observation |
| 2. Protected before snapshot | Existing read-only fingerprint collector, stable protected business/catalog/migration baseline; Vault counts only, no decrypted secret reads | NOT EXECUTED; use existing t19-b02-readonly-fingerprints.mjs only through approved TLS/session route; retain private evidence |
| 3. Data API private-schema denial | Bounded private-profile GET with publishable key, then separately authorized existing ordinary TEST user; exact status/public code and unchanged state | NOT EXECUTED; configuration screenshot alone is insufficient; never expose schema to make a probe succeed |
| 4. Managed-owner compatibility | Exact existing B02 SQL, one authenticated connection, 42501 denial, scoped permitted transfer, 55000 rollback, independent fresh-connection zero-scratch/protected-state comparison | NOT EXECUTED in this package; action-time approval required; local Gate2 superuser behavior is not managed PostgreSQL evidence |
| 5. Operational custody provisioning | Reviewed exact runtime SQL, minimal owner/runtime/machine identities, private mTLS/config, tested Vault/effective privilege closure and rollback/recovery plan | NO-GO until separate exact installation authority and recovery conditions; preserve inactive installation |
| 6. Authenticated business boundaries | Authorized TEST membership permits its own operation; foreign business, removed membership, forged machine, wrong org/environment/generation/credential version and worker credential retrieval/publish deny without state change | NOT ASSESSED against actual operational runtime; source/TLS fixture checks remain scoped evidence |
| 7. Lifecycle and recovery | Durable leases, concurrent refresh/disconnect both orderings, duplicate and uncertain-write fences, credential-store outage, interrupted generation/restore recovery, other business unchanged | NOT ASSESSED in hosted operation; transaction rollback is not operational restore proof |
| 8. Provider and owner UAT | Separately approved TEST identity/organisations, effective CREATE/refresh/revoke permissions, invoice reconciliation and visible failure/retry for both businesses | NOT AUTHORIZED by this package; no OAuth or provider request now |

## Prepared read-only probe

docs/proposals/t19-a12-readonly-discovery.sql is a metadata-only BEGIN READ ONLY/ROLLBACK probe with10second statement timeout. It reads no credential material or customer/financial row values and performs no DDL. It reports effective schema privileges, private function signatures/ownership/search paths, role membership including SET/INHERIT, global/private default ACLs, extension versions and scratch-name collisions. It is a discovery subset, not a complete protected snapshot or authenticated API denial. Missing rows or unknown configuration mean UNVERIFIED, not PASS. Existing scratch objects are a stop for any later B02 mutation, not permission to drop them.

Use the connector or previously approved restricted transport after target verification. Do not silently substitute SQL Editor, transaction pooler6543, insecure TLS, arbitrary connection strings or production access. Existing session-pooler transport/backend TLS and operational recovery holds remain open unless current verified evidence resolves them.

## Connector blocker observed this turn

Both Supabase get_project and execute_sql returned “This app tool requires a non-empty string link_id argument.” The SQL request was only SELECT current_user/session_user/server_version. No SQL or metadata result was returned and no live project verification is claimed. Plugin discovery confirms Supabase is installed/enabled but supplies no connection identifier. The agent did not invent a link_id, probe credentials, use browser fallback or make changes. Restore/select the intended existing Supabase connection in this session before live read-only checks. No new resource or secret is needed merely to prepare this package.

## Current documentation check

Reviewed official Supabase securing-your-api and breaking-change changelog pages. Current guidance distinguishes grants, RLS and schema exposure: internal custody functions/tables must remain outside the exposed API surface, with actual authenticated probes rather than inference. The changelog.md endpoint could not be rendered by the search tool (unsupported markdown content type), so the official web changelog was searched instead. No hosted feature implementation is performed here. Sources: https://supabase.com/docs/guides/api/securing-your-api ; https://supabase.com/changelog?types=breaking-change .

## Concrete next action

Restore the existing staging Supabase connector route, verify project metadata, then run the prepared read-only discovery and reconcile against the protected baseline. Produce an exact differences/denials report before seeking approval for any operational SQL, identities or deployment. Preserve owner13container baseline, accepted bundle/image, signatures and nonce ledger; none are involved in this hosted discovery.
