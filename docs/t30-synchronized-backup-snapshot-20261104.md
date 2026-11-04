# T30 — synchronized PostgreSQL 17 snapshot source review

**Status: Draft / synthetic-only; no hosted backup, no Plesk interruption, no restore.**

## Reason for change
Existing T11/T30 helper produced five database dumps plus one cluster role dump using separate PostgreSQL transactions and two independent before/after manifests. That approach needs a fully enforced write-freeze to represent one committed application/database state; seeing an idle backend at one instant is not a writer fence.

PostgreSQL 17 offers `pg_export_snapshot()`, `SET TRANSACTION SNAPSHOT` and `pg_dump --snapshot`. The exporting transaction must remain open while each other transaction imports that snapshot.

## Scope of current draft
For protected profile **version 3 only**, a Node PostgreSQL connection using the already pinned pooler host, source project identity and root CA opens `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`, exports one transaction snapshot, and remains open until all database exports and manifest verification complete. All five `pg_dump` members receive the identical backend-issued, regex-validated token via `--snapshot`; both read-only manifest transactions import the token immediately after their BEGIN. The keeper's unexpected end or failure rejects capture. Tokens are never written into the resulting archive metadata or CI logs. The legacy v2 code path remains unchanged. Source is tested using no-credential fakes and a disconnected, disposable PostgreSQL 17 fixture exercising a concurrent write against a `pg_dump --snapshot` read.

The sixth archive member, **`pg_dumpall --roles-only`**, is global metadata and **cannot import the same database snapshot**; role memberships and role-related permissions still need a separately verified, operator-controlled no-change window. To reduce silent drift risk, T30 now re-reads the **unpinned live portable application/managed catalog** in independent read-only READ COMMITTED transactions before and after capture. This fingerprint incorporates role capabilities, role memberships, permission grants, functions, schemas and default ACLs, and is compared with both the synchronized manifest fingerprint and the first live read. A mismatch rejects the archive. It is not a lock: changes made and reversed between samples can go undetected, and these observations do not ensure the global roles-only dump was atomic. The backup cannot claim atomic coverage of platform configuration, private Plesk T19/T20 files/provider secrets, or external Storage bytes. No source-only patch changes those boundaries.

## Remaining gates
1. Latest-head CI must pass all jobs, including the isolated native PostgreSQL 17 snapshot and role-change-detection tests, existing T19 byte-pins and historical T11 verification.
2. An independent review must verify snapshot keeper lifetime, SSL hostname/CA validation, session-pooler suitability on the actual Supabase staging plan, cancellation cleanup, catalog/role drift, and no plaintext files. No hosted test queries are permitted merely to prove this.
3. `current.json` is still V2 and the owner-only 65-table V3 candidate is **inactive**. Any activation needs separately scoped owner approval and fresh pin checks.
4. A future staging backup still requires an authorised quiet window for role/schema changes, inbound webhook/TEST payment handling, T19 cron, Auth/direct clients and provider references; a synchronized snapshot improves data read consistency but is not a substitute for operational reconciliation.
5. No offsite backup and no new isolated recovery target have been approved. T30 recovery acceptance and T31 stay blocked.

Do not merge/deploy this draft as an automatically usable recovery capability. No production or staging data changed.

## Owner-authorised, non-capture hosted session-pooler compatibility probe
The owner approved a narrowly scoped read-only hosted compatibility test on 4 November 2026. The connected Supabase SQL tool does not expose a dedicated, kept-open PostgreSQL client session and does not accept a cross-session exported snapshot. Do NOT treat an independent single SQL request as proof of shared snapshot compatibility, and do not extract credentials from Plesk or Supabase.

For an owner-operated check on the existing Windows workstation only, the staging repository includes `scripts/t30-probe-session-pooler.mjs`. Run `node scripts/t30-probe-session-pooler.mjs` in a private terminal after regular trusted `npm ci` setup. The helper prompts privately for the **existing** staging database password, connects to the pinned session pooler at port 5432 with the pinned Root 2021 CA, opens one read-only transaction exporting a snapshot, creates an independent second read-only PostgreSQL session, imports the exact snapshot via `SET TRANSACTION SNAPSHOT`, verifies the pinned database/role, then rolls back and closes both sessions. No dumps, data exports, archives, writes, restore, or Plesk configuration changes. Output is either `T30_POOLER_SNAPSHOT_IMPORT_PASS` or `T30_POOLER_SNAPSHOT_IMPORT_NOT_VERIFIED`; share only that one status. The script never prints the password or snapshot token. Never paste database credentials, log files, connection strings, or terminal screenshots into the conversation.

Until the operator executes it and the single result is independently checked, hosted session-pooler compatibility is **NOT VERIFIED**. This probe does not test `pg_dump` source compatibility or the roles-only capture; those remain separate qualification gates.
