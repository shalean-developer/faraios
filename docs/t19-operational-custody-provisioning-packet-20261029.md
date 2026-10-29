# T19 operational custody provisioning packet — review preparation

29 October 2026. Target xdmfyrsauvqznkloroxg only. **NOT READY FOR HOSTED EXECUTION.** The owner authorized preparation and staging delivery of corrections. This packet does not authorize credentials, hosted SQL, service startup, Zoho consent, accounting activation, production or T20. The held restore project is excluded.

## Bound source and recovery

Use the operational SQL corrected in PR #243, staging commit 418b03f30834cc9c33e155c1e6de6966aa054456, in this order. Never reapply the installed inactive schema.

| Stage | Exact review file | SHA256 |
| --- | --- | --- |
| 1 | database/t19-custody-runtime.sql | 5797da30b84c2a09de30c0b024cb62fe123d6eed610a6ca24867badb7f295f65 |
| 2 | database/t19-custody-oauth.sql | 45a4f0a3bfa8010bcf02ff0a5a28f49d40779fc82855c860ff826a29b981a05a |
| 3 | database/t19-custody-api.sql | 5939789b9da7d37531394f403a5ca45d1db25609c0fa202b39c5bdd3b2419ba2 |

These files remain review-only. Their approved-source-test GUC is a collision/context guard, not owner authorization or project identification. Exact executor code and its pre/postconditions must be bound in the final operation packet; do not improvise an apply command from this table.

The accepted current-scope restore and immutable receipt/journal hashes are recorded in t19-current-scope-restore-pass-20261029.md. That proves the pre-operational scope with reconstructed empty custody. Before any provider/client secret enters custody, extend and test recovery of nonempty encrypted material, operation state and retained external generation/epoch evidence; never restore an old generation into active service.

## Required immediately before each database stage

1. Verify source hashes, approved project/endpoint, authenticated postgres executor, PostgreSQL version, verify-full transport and fresh backend TLS. Confirm owner quiet window and approval for that one exact stage.
2. Save a protected before-state: native full managed/application catalogs and grants, function owners/ACLs/default privileges, role flags/memberships, all protected row/count/digest and sequence state, migration state and inactive custody state. Keep original evidence unchanged. Scope or baseline drift stops execution.
3. Require zero custody/Vault material and disabled accounting for initial provisioning, no running consumers, no runtime LOGIN and no existing operational objects outside the expected prior stages. Assess all Vault consumers and legacy invoice-publication callers before their grant changes. Preserve provider-managed Vault grants unless a separate reviewed change is authorized.
4. Prove exact staged SQL on an eligible compatible disposable candidate, including managed non-superuser installation, forced rollback, collision refusal and effective postconditions. OP-05/OP-06 native regressions establish their specific defects, not the entire managed installation.
5. Recheck private schema exclusion from the actual Data API configuration. No role-setting row alone proves this. Install no generic exposed credential RPC, decrypt endpoint or caller-defined provider executor.

## Stage-specific postconditions

After runtime: runtime owner remains NOLOGIN/NOINHERIT without administrative flags; t19_hosted_custody remains NOLOGIN until separately approved credential provisioning. Runtime-owned private functions have exact narrow ACLs, actor helper is invoker with stored auth.uid dependency, temporary SET/CREATE rights are absent, RLS/policies match the reviewed source, and only the expected runtime objects/columns/indexes/grants/legacy revocations changed. All custody tables and provider material remain empty; original business/financial/Auth/Storage data and sequences remain unchanged. No stage 2 progression until a fresh connection verifies the committed catalog and denials.

After OAuth: only the expected empty OAuth tables/policies and runtime-owned functions are added; only the custody identity may execute the machine OAuth/revocation entrypoints. No OAuth client secret, real state, grant or provider call is created by installing SQL.

After API: public wrappers remain SECURITY INVOKER; private implementations have fixed search_path and exact ownership/grants; anonymous/service roles lack execution; permitted authenticated wrappers continue to check trusted business membership. Actual credentialed HTTP permit/deny evidence belongs to step 4, not source inspection.

Keep each stage separate, transactional and bounded. A pre-commit failure requires rollback and a fresh complete unchanged-state check. An unknown outcome requires readback and quarantine, never automatic replay. A committed defect requires disabling the affected operation and preserving the ledger/material, followed by a separately reviewed forward correction or verified recovery. Do not use DROP/CASCADE or a generic destructive inverse over shared data.

## Private identity and transport provision — separate stage

The source connector now admits only the reviewed staging session pooler or direct host on 5432, derives the custody wire role and verifies the backend bare role, flags and TLS. Direct IPv6 was unreachable in prior owner tests; the session pooler is the already verified IPv4 candidate. No transaction mode, arbitrary endpoint, superuser/service role, insecure TLS option or environment URL fallback is allowed. Actual custody-role authentication and TLS from the intended private OS/service identity remain required.

Use the existing isolated managed custody subscription and source-enforced OS identity/socket/root checks; never substitute the ordinary web identity or leave a root terminal daemon running. Before loading credentials, verify OS UID, web-root exclusion, current source fingerprint, private directories/regular single-link files, owner/modes/ancestors, service lifecycle, redacted proxy/process/DB logs, no public custody routes, exact loopback/private listener and disabled schedules.

Create distinct custody/server, web-client and scheduler-client certificates/keys under the reviewed private paths. Verify CA, SAN, expiry, key ownership and machine fingerprint/business grants. Database password must be entered/generated only through an approved private channel, never this public packet, Git, terminal history, argv or logs. A protected config keeps enabled=false until the separately approved startup test. Keep web/scheduler free of DB/Vault/client-secret/refresh-token credentials.

## Remaining admission and decision

Open items: complete Vault/legacy-consumer closure and current API exposure readback; compatible-candidate whole-stage SQL/rollback evidence; private-host filesystem/logging/lifecycle and TLS identity qualification; actual restricted-role transport; nonempty custody recovery/fencing; final exact execution wrapper/postcondition digests and fresh protected baseline. The full packet must be concrete and reviewable before any execution approval request. No new user secret is needed for this source preparation.

T19 remains In progress; step 3 is not accepted. Accounting activation remains NO-GO and T20 remains Not started.
