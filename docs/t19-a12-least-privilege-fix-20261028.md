# T19 A12 least-privilege fix package — 28 October 2026

Owner requested fixes after the authorized staging metadata refresh. Scope below separates a concrete inactive hardening candidate from operational installation and shared Vault dependency work. Status: source prepared and embedded tests PASS; no hosted change applied.

## Findings and disposition

| Finding | Disposition |
|---|---|
| Custody schema excluded from Data API; app roles lack schema access | Correct current boundary; preserve it. No schema exposure or access grant is a fix |
| Three empty private tables have RLS disabled | Prepare defense-in-depth hardening: enable RLS, create no permissive policies, remove direct schema/table privileges for PUBLIC/anon/authenticated/service_role/custody. Keep postgres ownership and NOLOGIN custody role |
| Runtime owner, functions, machine identities and service not installed | Inactive installation is not broken by being inactive. Existing runtime SQL already enables RLS and restricts function grants, but needs managed-role/recovery/security acceptance and exact owner-approved installation before activation |
| service_role reads decrypted Vault and executes write functions | Verified shared capability, not evidence of secret disclosure (Vault empty). Do not import secrets or give this role to invoice/custody workers. Inventory current and planned consumers and indirect functions before any provider-managed grant change |
| Automatic new-table exposure enabled | Record and assess future global defaults; no automatic exposure setting change here. Private schema exclusion and explicit revokes remain mandatory; RLS does not constrain BYPASSRLS identities |

## Exact inactive hardening candidate

File: proposals/t19-a12-inactive-hardening.sql. Project: faraios-staging xdmfyrsauvqznkloroxg only; control-plane ID must be checked outside SQL. Does not touch production or restore-test.

One transaction,10second statement timeout,3second lock timeout. Requires postgres session/executor, PostgreSQL17+, inactive non-superuser/non-BYPASSRLS NOLOGIN role, no runtime owner/functions, exact three postgres-owned tables and no policies. Locks all three tables NOWAIT, checks all empty, enables RLS, revokes direct schema/table privileges and asserts effective schema/table denials. Existing privilege inheritance that survives direct revocation causes failure and rollback; do not broaden revocation targets to force success. Creates no rows, policies, logins, RPCs, secrets or worker; changes no Vault/public objects, role memberships or global default privileges. Preserves canonical historical inactive source byte-for-byte.

Action-time review must inspect exact SQL/hash and current project/state. Re-run post-apply metadata/zero-row/effective privileges plus fresh authenticated denial tests. On error, verify rollback and current state through a new read-only query before considering any retry. A lock timeout or changed baseline is a stop. A committed hardening rollback would require exact saved before ACLs/RLS states and a separately scoped owner decision; do not invent generic access-restoration GRANTs.

## Operational target matrix — not granted by this package

| Actor | Intended capability | Must remain denied |
|---|---|---|
| Anonymous/browser | Existing approved public app surface only | Custody/Vault table access and runtime/credential functions |
| Authenticated business member | Narrow reviewed status/enqueue/disconnect/reconciliation wrappers after membership and action checks | Direct credentials/tables, caller-selected business authority, foreign-business operations, sealing/publication |
| Invoice web/API worker | Scoped submission/status through approved authenticated/mTLS service | service_role/postgres database credentials, direct Vault/decrypt/publish access |
| Dedicated custody process | Dedicated restricted SQL identity; only reviewed private runtime/OAuth/revocation dispatch functions after machine/business binding | Function-owner role membership/SET, table mutation, generic SQL and arbitrary secret retrieval |
| NOLOGIN function owner | Explicit minimal table/column/function grants and fixed pg_catalog search_path, backend business/generation/lease checks | LOGIN, broad database roles, app assignment, persistent schema CREATE, BYPASSRLS |
| Migration administrator | Exact reviewed install/transfer inside bounded transaction | Persistent caller transfer authority or production changes implied by staging approval |

Source runtime explicitly gives authenticated schema USAGE solely for narrow public invoker wrappers to reach reviewed private business-authorized functions. Do not confuse that future approved operational design with permission to expose the private schema in PostgREST or grant private table reads. It is not installed by this hardening.

## Validation and remaining gates

Six embedded PostgreSQL/WASM tests PASS: direct SELECT returns42501 for anon/authenticated/service_role/custody after revokes; no-policy RLS hides a later synthetic row even if ordinary authenticated SELECT/schema privileges are accidentally regranted; unrelated service_role Vault privilege stays intact; populated table, runtime owner, extra table, existing policy and LOGIN-role changes refuse with55000 and unchanged catalog after rollback. The initial happy-path test uncovered embedded RESET SESSION AUTHORIZATION not restoring the original identity; test explicitly restores the original postgres identity instead. No production control was relaxed. These are actual embedded SQL checks, not actual Supabase authenticated sessions, HTTP denials or native managed-role acceptance.

Hosted application requires the separate exact SQL/grant approval retained in t19-02-hosted-custody-review.md: “Explicit separate approvals required: exact staging DDL/role grants, secrets/key provisioning, service deployment and any real Zoho consent or invoice sync.” The owner's request authorizes preparation/fixes within the review scope; present this exact narrow candidate before applying. No new runtime installation, Vault revocation, credentials, deployment, OAuth/provider write, app data mutation or accounting activation is included.

Next after narrow hardening approval: current protected snapshot and API denials; managed-role B02 acceptance; consumer-specific Vault boundary; exact operational install/identity/service approval; real authenticated machine/business-denial and recovery tests; separately approved TEST provider end-to-end reconciliation. T19 in progress; T20 not started.
