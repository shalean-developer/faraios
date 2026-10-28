# T19 A12 staging read-only refresh — 28 October 2026

Status: metadata refresh complete; operational acceptance NOT PASSED. Owner expressly approved signed-in browser fallback after Supabase connector routing failed for missing link_id. Used browser:control-browser skill with the existing Chrome staging dashboard tab. No direct browser API calls, credential retrieval or alternate projects were used.

## Verified target and method

Dashboard General settings confirmed project faraios-staging, ID xdmfyrsauvqznkloroxg, eu-west-1, Supabase Postgres build17.11.0.003. SQL Editor single-statement metadata SELECT reported current_user=postgres, session_user=postgres, server_version17.11. The dashboard's main branch carries Supabase's Production branch badge; project identity is the explicitly selected staging project, not the separate live business project. The platform displayed a general technical-issue banner while project overview reported Healthy. Neither substitutes for service availability acceptance.

Executed two successful SELECT-only discovery queries through the authorized dashboard fallback. One intermediate editor replacement inserted new SQL into old text and produced42601 before execution; corrected by clearing the editor and entering one complete SELECT. No DDL, DML, role/privilege change, provider operation or runtime activation was attempted. The dashboard may retain a private Untitled query snippet automatically; it contains metadata/count queries only. This was not the managed-role B02 transaction or its transport/TLS acceptance.

## Current observations

| Observation | Result | Meaning / limit |
|---|---|---|
| Data API exposed schemas | graphql_public and public checked; audit and private_t19_custody unchecked | Private custody excluded in current visible configuration; authenticated HTTP denial still unexecuted |
| Automatically expose new tables | Enabled | Record for future grant/default-privilege review; no setting changed |
| t19_hosted_custody | NOLOGIN, NOINHERIT, non-superuser, no BYPASSRLS or CREATEROLE | Inactive role, not a usable operational login |
| t19_runtime_owner | Absent | Operational runtime owner not installed |
| Private tables | connections, operations, prepared_references; each postgres-owned; RLS and FORCE RLS false | RLS is not the installed isolation boundary; current schema/grant restrictions must remain effective; defense-in-depth review required before operation |
| Private table counts | All three zero | No credential, operation or prepared-reference material in this schema |
| Private functions/default ACL entries | Both zero | No private runtime RPC installed; global defaults not fully reviewed this turn |
| Private schema effective USAGE/CREATE | Both false for anon, authenticated, service_role, t19_hosted_custody | Metadata denial evidence only; not separate authenticated API/login tests or indirect-function-path closure |
| Vault schema | anon/authenticated/custody lack USAGE/CREATE; service_role USAGE true, CREATE false | Vault is not isolated from service_role |
| Vault count | secrets zero | Count only; no decrypted secret values read |
| service_role Vault relations | SELECT true on secrets and decrypted_secrets; INSERT/UPDATE false | Capability to read decrypted material if later provisioned; no current secret disclosure inferred |
| Vault create_secret/update_secret | SECURITY DEFINER true; service_role EXECUTE true | Narrow table DML denial does not prevent writes through functions; app/worker must not be given this role as custody shortcut |
| Custody membership | postgres member of t19_hosted_custody, ADMIN true, INHERIT false, SET false | Creator/admin metadata, not a verified SET route into the role; operational membership review remains |
| Extensions | pgcrypto1.3, supabase_vault0.3.1 | Presence alone is not credential isolation |
| B02 scratch collision check | Roles0, schema0 | Names absent now; no authority to create them follows |

## Required next package

1. Preserve current private-schema exclusion and inactive zero-row installation. Complete protected business/catalog snapshots and global default ACL/effective/indirect privilege review using the existing collectors. Do not infer financial equality from metadata-only queries.
2. Run approved bounded private-profile API denial with a publishable key and separately authorized existing TEST identity; log only public response category/status. Do not expose the schema or retrieve real customer sessions to test it.
3. Reconcile managed-role B02 syntax/transport and operational recovery holds. Local accepted derivative startup does not settle managed LOGIN, ownership, Vault or pooler-backend TLS behavior.
4. Prepare exact operational SQL/identity/service changes and least-privilege grant matrix addressing service_role Vault consumers, scoped custody identity, private functions/search paths and RLS defense in depth. Do not blanket revoke provider-managed Vault grants without dependency analysis. No operational provisioning is authorized by this metadata refresh.
5. After separately approved provisioning, test actual mTLS/login/API cross-business permissions, durable refresh/leases/generation/disconnect/recovery and later separately approved TEST provider accounting flows.

Gate2 bounded local test remains owner accepted. A12 operational custody remains NO-GO; full T19 in progress; T20 not started. Browser evidence screenshot: evidence/t19-a12-readonly-20261028/dashboard-readback.png. No canonical tracker, GitHub publication or staging deployment changed by this refresh.
