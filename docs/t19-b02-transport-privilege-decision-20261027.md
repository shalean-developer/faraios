# T19 Gate B-02 — read-only transport and privilege decision (2026-10-27)

**Decision: NO-GO for hosted privileged PostgreSQL compatibility execution, operational custody SQL and accounting activation.** Source-only decision; no hosted execution authorization. Canonical Build Tracker T19 remains In progress, A12 unresolved, T20 Not started.

## Evidence and scope
- Current staging source baseline at decision: `1ec38f7b19ae4c9b8d79dde17393b1ac5a07680b`.
- The pinned read-only evidence runner checks certificate-verified GitHub client → Supabase Session pooler TLS using the Supabase CA and `rejectUnauthorized: true`.
- The latest protected run recorded `IDENTITY_PG_SSL_UNVERIFIED` / `BACKEND_SSL_UNVERIFIED`. `pg_stat_ssl` reports the distinct pooler → PostgreSQL backend hop. Verified client → pooler TLS does **not** verify backend TLS.
- The evidence collector correctly refuses to collect protected catalog/financial/Vault fingerprints if backend TLS cannot be confirmed. Read-only Gate B-02 therefore has no successful independent before/after baseline.
- The proposed mutation runner `scripts/t19-b02-node24-runner.mjs` is separately approval-gated and is NOT authorised. Prior approval for an older runner does not approve its amended transport.
- The inactive `private_t19_custody` schema was previously installed; do not reapply it. No runtime/OAuth/API custody SQL is authorised.
- Previous source-only/disposable PostgreSQL SQLSTATE 42501 and 55000, collision, rollback and protected catalog tests are useful but cannot substitute for live transport/privilege evidence.
- Normal FaraiOS Supabase HTTPS application and independently authenticated catalog RLS checks PASS in their own scope; these do not validate privileged custody connectivity.

## Privilege disposition
- Existing source inventory shows `t19_hosted_custody` NOLOGIN/NOINHERIT, private custody schema access denied to anon/authenticated/service_role, but `service_role` still has broader managed Vault capabilities.
- Remaining actual hosted privilege closure: complete Vault consumers, effective function/default grants and SECURITY DEFINER paths, actual managed role-owner creation/transfer authority, PostgREST private-schema exposure, and controlled SQLSTATE 42501 outcomes under the restricted identity.
- Do NOT blanket-revoke `service_role` Vault grants without consumer/dependency evidence; do NOT enable runtime/service credentials to compensate.

## Remediation decision
The verified safe remediation now is **preserve the fail-closed B-02 gate and remove any implication that repeated pooler checks or a client TLS success authorises SQL execution**. No transport change is justified by the evidence.

Candidate future transport (NOT approved): a provider-documented path whose client → database security identity and applicable intermediate hop(s) can be independently verified on the actual execution host. Confirm routing, PostgreSQL identity, certificate verification, privilege scope, regional availability and network reachability before proposing exact source amendments. No certificate bypass, altered SQLSTATE expectation, unverified pooler hop, privilege broadening, or secret injection.

## Reopening B-02 requires all of
1. Provider or independent technical evidence for every applicable hop; reproducible successful protected **read-only** identity/certificate checks on the execution path, with sensitive details redacted.
2. Fresh read-only before-state baseline, separate connections, protected catalog/financial/Vault counts/fingerprints and unchanged concurrent state.
3. Actual hosted ACL, managed role creation/ownership, restricted identity, Vault consumer, and API exposure results, not just static SQL or disposable tests.
4. Verified recovery plan and separately authorised exact SQL blobs, source commit, execution path and owner decision before any single rollback-only privileged compatibility test. Operational SQL and provider activation require further separate gates.

## Explicit non-actions
No new SQL, role/grant/default privilege, Vault secret, Plesk deploy, GitHub protected-secret injection, OAuth/Zoho request, credential custody activation, invoice/financial write, production operation, or T20 work.

**Acceptance:** Gate B-02 read-only decision **COMPLETE = NO-GO**; Gate B-02 hosted compatibility **OPEN**; A12/security acceptance and T19 operational activation **NO-GO**.
