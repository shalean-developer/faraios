# T19-RESTORE-VERIFY-01 — disposable local environment readiness decision

Date: 2026-10-27. **Assessment only. No restore attempted, no isolated destination provisioned.**

## Decision
**LOCAL CANDIDATE: CONDITIONAL / EXECUTION NO-GO.** The existing T19 protected v2 checkpoint cannot yet be declared recoverable. No existing FaraiOS project may be reused. SSL enforcement remains OFF; accounting activation and Gate B-02 remain NO-GO.

## Pinned target stack
- PostgreSQL 17.11.0.003 on an immutable, reviewed platform-matching image digest; Vault 0.3.1 and required installed extensions.
- Supabase Auth v2.197.0, with its index worker and exact four indexes in `auth.users` (not merely its migrations).
- Supabase Storage v1.84.23, migrations 0002 through 0073 and the exact managed roles and ACLs.
- Supabase PostgreSQL source commit `802e6a10d46963f690ef0766a7d55c29150678c2`, including `20250623125453_tmp_grant_storage_tables_to_postgres_with_grant_option.sql` (blob `b499f9273691fd4256349b2be9c8a1dda664957e`) and `20250709135250_grant_storage_schema_to_postgres_with_grant_option.sql` (blob `7440924844c9db690401b5538b4daa872a1fb2f3`).
- These files explain grant intent but **do not yet prove** final grantor/owner and migration histories match the captured managed platform. The executable versions, base image digest, migration checksums and bootstrap actor order must be independently pinned and verified from private candidate evidence.

## Environment eligibility gate
A local destination must be newly created, disposable, exclusively controlled for this rehearsal, with isolated network and volumes, no host production sockets or credentials, no existing workload or shared Docker volumes, no reuse of `xdmfyrsauvqznkloroxg` or `zrlojsvkqipuwkkyfrkn`, and verified teardown. Explicitly record CPU architecture, disk/memory capacity, runtime image digests, isolation tests and secure TLS/client prerequisites. No claim of suitability merely because Docker is installed.

In the current assistant execution container, Docker, Podman and `psql` are unavailable. Therefore **no local platform verification or restore was run here**. User PC or a separate preapproved isolated runner may be eligible only after a confidential capability/inventory check and separate owner decision.

## Recovery acceptance gates
1. Privately verify the 2026-10-26 encrypted v2 archive, receipt, immutable catalog/trust anchors and keys without exposing any secret data or digest in public output.
2. On empty candidate, reproduce the exact managed bootstrap including Auth index worker, Storage table owners, table/default ACL grant options, roles, functions, schema and migration histories; compare a full catalog fingerprint against the protected source; zero unexplained discrepancies.
3. Permit exactly one separately approved restore of the **new** T19 archive only after managed preflight PASS.
4. Independently prove row/sequence counts and digests, Auth/Storage data where in scope, owner/staff business RLS denial and permitted paths, audits and cleanup, without ever connecting an application or provider to the candidate.
5. On any unknown, divergence, network leak, authentication error or unexpected data, stop and retain private diagnostics; no permission-widening or hand-crafted grants to force hashes.

## Non-actions
No new project, no local containers or protected archive use, no password/secret injection, no SQL execution, no SSL toggle, no Plesk operation, no privileged custody, accounting/Zoho activity, or T20 changes. A documentation merge cannot authorize execution.

**Next concrete decision:** owner approval for a *capability-only inspection* of a chosen disposable local/isolated host, followed by a separately approved pinned rehearsal if all preconditions pass. Restore NO-GO remains.
