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


## Provider-supported connection route assessment (2026-10-27 addendum)

Authoritative current Supabase references:
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits

**New material finding:** Supabase documents that its `Enforce SSL on incoming connections` database setting governs **both** client → shared Supavisor pooler **and** Supavisor → PostgreSQL backend. This is narrower and more actionable than assuming the internal hop can never be covered by provider controls. The prior run's `pg_stat_ssl=false` remains an actual failing test observation; the setting's current state has **not** been independently read, and documentation alone is not proof that it was enabled or effective for that run.

**Preferred conditional path for review:** retain the existing IPv4 Session pooler at its already pinned project/region/port and verify the **existing** SSL-enforcement control state read-only through the Supabase dashboard. If it is disabled, do not switch it on under this decision: Supabase states changing SSL enforcement triggers a database reboot, which requires distinct impact assessment, quiet-window approval and exact owner authorization. After a separately approved change, revalidate `pg_stat_ssl` and verified client certificate/hostname in a single bounded read-only check. Do not infer a secure backend hop from the toggle alone. All future credential-bearing operation remains blocked pending independent confirmation of those results and privilege/recovery gates.

**Alternative conditional path:** direct `db.<project-ref>.supabase.co:5432` removes the pooler hop and is Supabase's recommended connection for migrations and persistent backends. The direct endpoint generally requires IPv6 unless an IPv4 add-on is enabled; GitHub-hosted IPv6 direct reachability previously failed. No paid IPv4 add-on, network change, new execution host, or new connection source is approved. Do not substitute direct-connection credentials or URLs in the existing pinned runner without fresh design, exact SHA and owner approval.

**Rejected for this gate:** transaction-mode pooler 6543, `sslmode=require` without CA/hostname verification, skipping `pg_stat_ssl`, replacing backend proof with browser HTTPS/API acceptance, repeated identical protected runs, changing managed SSL settings without approval, and any privileged SQL or operational migration.

**Next permitted actions, read-only only:** (1) inspect the staging Supabase database settings screen for SSL enforcement state without toggling it; (2) reconcile with existing `pg_stat_ssl` read-only failure; (3) document whether a separate reboot/maintenance approval is required or whether an already-enabled control means a focused provider/transport discrepancy review is needed. If the state cannot be read, leave it UNKNOWN and maintain NO-GO.

**No SSL toggle was read or changed in this assessment, no live connection retest performed, and no hosted privileges or application settings changed.**


## Staging SSL maintenance prechecks — read-only progress, 2026-10-27

Target project `xdmfyrsauvqznkloroxg` returned `ACTIVE_HEALTHY`, PostgreSQL 17.11 (region eu-west-1). Owner screenshot verifies SSL enforcement OFF. SQL audit connection itself reported SSL true; this is not proof of enforcement or of the earlier GitHub pooler backend hop.

An aggregate `pg_stat_activity` / `pg_stat_ssl` read (excluding the audit backend) showed PostgREST (2 SSL), pgbouncer (1 SSL), supabase_admin (1 SSL), pg_net (1 non-SSL), pg_cron scheduler (1 non-SSL), postgres_exporter (1 non-SSL). Local/unix socket traffic can legitimately appear non-SSL; those three entries do not establish externally insecure clients, nor do they prove compatibility after the SSL toggle. A point-in-time connection snapshot cannot enumerate dormant external clients and future scheduled tasks.

Read-only protected baseline: Vault secret count 0, business invoices 2, enabled accounting connections 0. Existing FaraiOS app code uses Supabase HTTPS SDK; accounting worker and outbound dispatch remained disabled in last hosted health report.

Recovery: authenticated encrypted checkpoint exists from 2026-10-26, but exact isolated restore/recovery verification remained NO-GO due managed-catalog compatibility and eligible destination limitations. Configuration rollback by toggling enforcement OFF is NOT database restoration, entails another potential reboot, and requires distinct owner approval.

**Maintenance verdict:** PRECHECK PARTIAL; configuration change still HOLD. Before presenting an execution approval: inventory dormant/direct consumers and SSL client behavior; explicitly accept or resolve incomplete restore evidence; record quiet window/owner operator and objective stop conditions; verify fresh health/baselines. Do not misclassify provider-internal non-SSL entries as remote plaintext. No toggle, SQL changes, secret, deployment or provider action.


## Final bounded consumer/recovery review (2026-10-27)

Repository inspection: the hosted FaraiOS entrypoint connects to staging through the Supabase HTTPS SDK; the read-only B-02 GitHub workflow is manual (workflow_dispatch, pinned staging ref, protected environment), not an always-running database consumer. No new Plesk or accounting launcher activation is evidenced. Database pg_stat_activity single-point inventory showed PostgREST, pgbouncer, Supabase admin and internal pg_net/pg_cron scheduler/exporter identities. Current pg_extension catalog returned **no installed pg_cron or pg_net extensions**, so those named internal processes do not establish installed customer-owned jobs. The `cron.job` query failed with 42P01 (absent relation). No database job was started/stopped. Inactive/offline external clients remain undiscoverable from a momentary DB snapshot; do not assert universal absence.

Recovery evidence: authenticated 2026-10-26 protected v2 encrypted checkpoint; `docs/t19-backup-compatibility.md` explicitly reports restore NOT_RUN / PENDING_ISOLATED_RESTORE. Prior candidate rehearsal failed managed Auth/Storage catalog equivalence and an eligible separate destination was unavailable. It cannot be called a restore PASS. A settings toggle can be reverted only with separate approval and another reboot; it is **not** a substitute for verified database restoration.

**Disposition:** connection compatibility PARTIAL / recovery verification NOT PASS. One-off SSL enforcement maintenance can be considered only as an explicitly risk-accepted staging configuration operation (separate from custody activation), after owner confirms no concurrent staging use, accepts a provider-managed reboot and the residual no-proven-restore exposure, approves maintenance/rollback responsibility, and records pre/post baseline. Do not imply this decision preauthorizes the toggle, rollback, GitHub privileged checks, migrations or accounting. Gate B-02 stays NO-GO.

