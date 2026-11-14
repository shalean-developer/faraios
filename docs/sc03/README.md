# SC-03 — shared event/command and compatibility foundation

15 November 2026. Candidate implementation; no release authorization. Parent is unmerged SC-02 PR #54 head `8bae37db940d357a014a5ffdd561aba82a0b0d4a`, tree `55d0a8ea9d32e63983ff35c877b306aa4fa160fe`. Main was audited at `e0d45923b441d7833e048faa041a3f0e16cfe1e2`. F01–F06 remain complete.

## Deliberate adoption boundary

`foundation.sql` is executable candidate SQL outside automatic migrations. The native suite installs it only in newly initialized loopback PostgreSQL. It adds three denied-by-default public tables and two internal invoker functions. It does not replace any legacy RPC, introduce a public dispatcher, migrate historical records or give an application role EXECUTE. This is a shared record/transaction substrate, not implementation of lifecycle transitions, delegation, visits, reservations or outbound delivery. Future adapters must validate entity transitions, snapshot schemas, capabilities, ingress and delegated roles before calling this foundation. No caller-controlled SQL, table name or dispatch function is executed.

A future separately reviewed migration can adopt these objects; source preparation does not enable them. Do not run this candidate on hosted databases. No merge, deployment, hosted schema/permission, intake, messages, publication, billing or subscription changes. Supabase stays Free.

## Contract v1

| Field | Contract |
|---|---|
| Actor | Required UUID equal to nonanonymous `auth.uid()` and the business's current owner. Auth is simulated in tests. Supplied actor is never sufficient by itself. No system, staff, customer, support or delegated actor support in v1. Internal trusted caller must establish verified claims; client roles cannot execute. Authorization is checked again before replay. |
| Reason | Required original text, 4–1000 trimmed characters; retained exactly in immutable command. No silent trimming or generated explanations. No customer content in diagnostic logs. |
| Scope/key | Required business UUID, exact preview environment (live commands denied) and UUID idempotency key. Key namespace is business + environment, across all aggregates/actions. Preserve completed commands indefinitely pending a reviewed retention policy; deleting a key would make a retry unsafe. |
| Changes | At most 1 MiB serialized JSONB, 1–100 exact five-field objects: kind, UUID id, expected_version, schema=1, snapshot object. Duplicate aggregate keys rejected. Kinds are bounded lowercase identifiers, not SQL names. IDs are lowercase canonical UUIDs. Batch ordering is normalized by kind then ID using C collation. Object key order is JSONB semantics. |
| Version | Required nonnegative integer per aggregate. Absent aggregate means version 0; first stored version is 1. Every accepted change increments once. Existing row versions and document schema versions are separate and untouched. Stale version raises SQLSTATE 40001; refresh/reconcile before making a new command. |
| Retry | Equal canonical full envelope returns the original ordered result, before rechecking aggregate versions. Actor, reason, expected versions, schema and snapshot are all compared. Changed content under the same key raises 22023. JSONB equality is used directly, avoiding digest collision ambiguity. Null, unknown and malformed contract fields reject. |
| Event | One immutable event per changed aggregate, deterministic ordinal, expected/new versions, snapshot schema and command reference. Command stores actor/reason, original canonical envelope, result and transaction time. Event version uniqueness prevents duplicate sequence positions. Snapshot describes new shared record state only; it is never an issued invoice or implicit agreement. |

`shared_core_apply` is the single fixed command in this package: atomically apply versioned shared snapshots. Domain command names and legal transition graphs belong to later adapters. Snapshots can contain sensitive data; use the same restricted encrypted backup and retention controls as commercial documents. No customer data is used in fixtures.

## Transaction and lock protocol

Validate scope, actor and exact envelope, then take a transaction-scoped advisory lock for business/environment. This conservatively serializes commands for one tenant/environment, including creates of absent aggregates and idempotency claims. Hash collisions only reduce parallelism; they cannot share records. Under that lock, inspect replay, then lock/update aggregates in canonical C kind/UUID order, insert the command and all events. Return only after successful statement execution. Commit belongs to the calling transaction.

There are no caught database failures or autonomous writes. A stale later aggregate or event insertion error rolls back earlier updates and command/events. Caller rollback discards all work. No network/provider action occurs inside a transaction. Multi-business transactions and acquiring legacy locks before this command are unsupported; future adapters must establish one coordinated ordering before adoption. Legacy commands do not honor this lock today, so this package claims no race protection over legacy mutations. Default READ COMMITTED is rehearsed; serialization/deadlock errors at stronger isolation require retry of the entire transaction with the same key and envelope.

## Compatibility and recovery

All 148 frozen runtime/config/assets and all 31 SQL baseline sources remain byte-identical. SC-02 fixtures and fingerprints remain frozen. Existing unversioned and scope.schema=1 readers, immutable issued documents, tokens, sender/time-zone snapshots, invoice numbering, original/replacement/payment histories and five booking steps remain unchanged. No historic event is invented and no legacy row version is reinterpreted.

[Preservation/recovery manifest](preservation-manifest.json) adds the three shared records and their ordering/foreign-key/ACL dependencies. Existing logical backup enumerates every public table, so these objects require no new schema allowlist or backup format. Native proof checks the actual `database_recovery.fingerprints` helper includes each table; custom-format pg_dump/pg_restore preserves rows, functions, RLS, denied EXECUTE and replay results in a fresh database. Legacy records are fingerprinted before/after new commands and manual rollback. Disabling future adapters must retain command/event/aggregate records; DROP/TRUNCATE is not a rollback strategy. Restore all three together from a consistent snapshot, never events alone.

## Validation

Run `python3 tests/sc02-baseline.py`, and with PG_BIN/PHP_BIN configured, `python3 tests/sc03-native.py` or `python3 tests/release-checks.py`.

Native tests cover identical retries, conflicting reason/payload/version, malformed schemas, wrong actor/business, live-environment denial, stale writes, multi-record partial failure, injected event failure, immutability and all API-role denial. Independent psql sessions race identical retries, same-version distinct keys, same-key conflicting payloads and reversed aggregate order. One winner is asserted where required; no deadlocks or duplicate events. Replay reconstructs latest shared snapshots. Existing invoice reader and public/financial/private row fingerprints survive shared writes and manual foundation deactivation. A fresh restore preserves public fingerprints and idempotent replay.

Evidence is generated under `test-results/release/sc03-native.json` and release logs/summary, not committed customer or database dumps. Tests use disposable PG and simulated Auth/REST only. See validation.json for executed outcomes and limits.

Remaining gaps: hosted drift and real-record fingerprints, managed Auth/API equivalence, Free quota/load headroom, performance of conservative tenant serialization, deployed browser acceptance, external backup/global role/config recovery and later domain adapters. SC-04 authorization, SC-06 agreements, SC-08 reservations and SC-10 outbound remain separate gates. This package makes no claim that their capabilities are implemented or safe to enable.
