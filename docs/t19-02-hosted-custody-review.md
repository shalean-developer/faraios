# T19-02 — Hosted staging custody: review-only implementation proposal
Date: 2026-10-25 · Target: faraios-staging (`xdmfyrsauvqznkloroxg`, eu-west-1) · Status: **DESIGN / NO-GO FOR APPLY**

## Authority and baseline
Governed by `AGENTS.md`, canonical Build Tracker T19, approved restricted-custody direction and D4. Staging Git SHA at preparation: `760ee514c7745155101820c801f69d4a767fecf6`. Preserve T18, completed work and T20 Not started. No production change, OAuth/Zoho operation, hosted SQL execution, credential provisioning or invoice activation authorized by this document.

Read-only connected Supabase findings: PostgreSQL 17.11; `supabase_vault` 0.3.1 and `pgcrypto` 1.3 installed; `vault.secrets` has **zero rows**. Two `business_accounting_connections` records are disabled; credential reference metadata exists but cannot be assumed usable. No dedicated `t19_custody` login role found. `service_role` has Vault privileges and bypasses RLS; ordinary invoice workers MUST NOT receive it. Existing `vault.create_secret`/`vault.update_secret` are SECURITY DEFINER and executable by service_role. RLS applies to existing public business tables. These are read-only observations, not a tested hosted permission boundary.

## Minimal architecture (proposed; not provisioned)
1. Isolate a custody runtime from web/API and invoice workers. Supply an independently controlled **machine identity**, separate from browser sessions and public Supabase keys; require authenticated mutually trusted job submission with immutable operation ID, validated server-side business identity and action allowlist. Never export tokens, decrypt endpoint, generic publication endpoint or caller-defined provider outcome.
2. Dedicated PostgreSQL LOGIN principal for custody; NOLOGIN minimal function owner for private schema. Invoice worker can submit/scoped-status only. No `service_role`, `postgres`, Vault decrypted view or general database access in web/invoice runtime. No role inheritance or SET ROLE route into the custody owner. Provision strong credentials outside Git; rotate and revoke independently for staging/production.
3. A **non-exposed private schema** holding durable connection and operation state. Bind business ID, environment, provider, connection ID, Zoho organisation ID, generation, credential version, lease, attempt/epoch and sealed reference. Private SECURITY DEFINER RPCs have fixed search_path, dedicated minimal owner, explicitly revoked PUBLIC EXECUTE and narrow custody EXECUTE grants. Never rely only on RLS or request-supplied bindings.
4. Credential encryption: use approved Vault or comparable managed key service **only after validating effective grants and runtime access**. Encrypt and associate credential material with the seven-field binding; never store real tokens in public business tables, logs, client env or Git. Since Vault grants to `service_role` exist, isolate custody via effective-role controls and consider key-management boundary separately; Vault installation alone is NOT isolation proof.
5. Refresh sequence: authenticate operation; lock current generation/connection; persist dispatch intent before provider egress; refresh once; seal successor without publishing; atomically verify current binding, lease expiry, active connection and prepared reference; publish exactly once. An interrupted/dispatched/unknown outcome is quarantined for reconciliation, never blindly retried. D4 disconnect fences undispatched work, quarantines uncertain dispatched attempts, increments generation once; reconnect uses fresh consent and new generation.
6. Stage separately: (A) reviewed SQL and identity/privilege tests in disposable PostgreSQL, (B) review grants and rollback, (C) obtain explicit owner approval for exact hosted changes, (D) apply staging only, (E) effective permissions tests on real hosted identities, (F) independent security assessment, (G) separately approved Zoho consent/identity confirmation, then accounting E2E.

## Proposed SQL objects (names and permissions for review, NOT runnable migration)
- `private_t19_custody.connections`: business+environment+provider+connection+org+generation+version, enabled/disabled state, sealed-reference pointer, audit timestamps; guarded unique constraints.
- `private_t19_custody.operations`: immutable durable job identity, C1 snapshot, lease/expiry, attempt/epoch, dispatched/uncertain/recovery state; unique pending-operation constraint.
- `private_t19_custody.prepared_references`: sealed-reference C1 binding and one-time consumption; publish in same transaction as state advancement.
- `private_t19_custody.read_current(binding)`, `claim(operation_id)`, `mark_dispatched(...)`, `prepare_reference(...)`, `publish(...)`, `quarantine(...)`, `disconnect(...)`: private, minimal, narrowly granted RPCs.
- Role design: NOLOGIN owner; separate custody LOGIN and sealer identity only if tested effective separation can be demonstrated; app/invoice/anon/authenticated/legacy publisher denied all credential/state mutation RPCs and decrypted material. Do not grant `service_role` to custody merely as shortcut.

**Do not run this as SQL.** Before executable migration, inspect actual default privileges, schema exposure, Vault grants/decrypted view, role memberships/SET ROLE, installed extensions, backup identities, security-definer overloads, existing accounting constraints and exact rollback impacts. Avoid dropping or rewriting existing accounting tables.

## Acceptance / denial matrix
| Actor / attempt | Expected |
|---|---|
| Anonymous/authenticated browser reads Vault or custody private schema | DENY, unchanged state |
| Invoice worker reads credentials, calls publish, SET ROLE custody | DENY |
| Legacy publisher uses any SQL path / overloaded RPC to publish | DENY |
| Custody worker with correct identity and scoped authorized durable operation | PERMIT only exact business/env/org/generation/version |
| Custody worker substitutes foreign business/org or stale generation | DENY |
| Replayed operation/nonce/lease, expired claim, disconnect race | DENY, unchanged state |
| Interrupted provider refresh / lost acknowledgement | RECOVERY_REQUIRED, never auto replay |
| One business's connection rotated/disconnected | Other business unchanged |
| Concurrent publication vs disconnect (both orderings) | Serialised, no stale successor resurrection |
| Credential store unavailable / key withheld | FAIL CLOSED, no token/log disclosure |
| Recovery from backup across generation boundary | Cannot reactivate retired credential |

## Rollback and go/no-go
Preflight: capture SHA/migration state, role/grant snapshots, encrypted-state inventory counts **without secret values**, business connection states, tested recovery point and authorized operator. Staging DDL must be additive and versioned, with restore plan separately validated on isolated restore-test—not ad-hoc DROP against a shared project. On error: freeze operations, disable new work, preserve uncertain-operation ledger and encrypted prior material, restore only with independently verified epoch/generation fencing. Never undo a committed provider refresh by replaying older state.

**Explicit separate approvals required:** exact staging DDL/role grants, secrets/key provisioning, service deployment and any real Zoho consent or invoice sync. This proposal is neither those approvals nor A12 closure. T19 In progress · accounting activation NO-GO · T20 Not started.
