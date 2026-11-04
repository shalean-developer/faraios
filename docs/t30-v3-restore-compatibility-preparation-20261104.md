# T30 — V3 isolated restore compatibility: source-only preparation

Date: 4 November 2026. **Preparation only: no restore helper has been enabled for V3 and no backup, import, deployment, destination creation, credential access or service change is approved.**

## Canonical boundary

Build Tracker T30 is *End-to-end acceptance*: roles, payments, teams, payouts, mobile and recovery; acceptance is linked evidence and resolution of blocking defects. T29 is Done; T31 remains Not started. Reuse accepted T11, T19–T29 and T30 evidence. No new feature, production migration, policy change or deployment method.

Current GitHub staging baseline: `64bf9ecb451505840c9723fe2ffe274e5f9ac8fc`. V3 local `current.json` was activated by the owner, with eight of eight subsequent owner-run hash/ACL checks passing. This does **not** authorize capture. PR #309/#310 source is merged to staging; its source-only deploy restriction remains effective.

## Exact incompatibility found

1. `scripts/restore-staging.mjs` fixes `DESTINATION='zrlojsvkqipuwkkyfrkn'` and imports `config/restore-test.json`, which pins the **historical T11** capture id, SHA256, catalog fingerprints, extension/sequence expectations and `importEnabled`. The target has already been used; never replay V3 there.
2. `validateRestoreBackup()` compares every incoming archive to those old pins; it cannot approve an as-yet-uncreated V3 archive, correctly failing closed.
3. `verificationSQL()` currently rejects tables outside public/audit/auth/storage/supabase_migrations. V3 includes exactly 35 protected tables across seven reviewed private schemas. Merely changing archive or destination identifiers would still fail or omit verification, and would be unsafe.
4. `schemaReplaySQL()`, `validateDestination()`, `catalogCheck()`, `sequenceAssignments()`, `restoreEnvironment()` and the CLI all embed T11 destination/config/SQL assumptions. The old `restore-catalog.sql` is a protected T19/T11 reference and must remain byte-identical. V3 capture's separate `t30-private-restore-catalog.sql` exists, but a V3 restore-specific preflight and managed baseline have **not** been qualified.
5. The V3 capture synchronizes five database dump members under one exported snapshot. The global roles-only dump is outside it; role/schema quiet-window verification and catalog drift checks still apply. It does not cover Plesk secrets, external Storage bytes or provider control-plane settings.

## Smallest safe implementation, after source review

- Keep existing `npm run restore:test`, historical `scripts/restore-staging.mjs`, `config/restore-test.json`, T11 archive, and all original T19/T20 files **unchanged**. Never turn old `importEnabled` into V3 permission.
- Add a separate **disabled-by-default V3 preparation/verification path**, initially limited to offline archive validation and SQL generation in disconnected synthetic fixtures. It must refuse all remote connections and all import/replay until an exact new capture hash, exact distinct destination identity, tested empty managed baseline, and separate owner restore approval are pinned.
- Reuse the existing archive encryption/authenticated-decryption and private ACL checks rather than inventing a format. Require V3 `validateScope` and `matchesCurrentScope`; exact 30 public/audit + 35 protected table names; source/three catalog fingerprints; expected six members and data COPY/RLS evidence. Reject any extra, missing, duplicated, or mismatched member.
- Refactor the V3-only verification SQL to allow **only** the seven explicit `PRIVATE_BACKUP_SCHEMAS` and exact table names; verify private row counts/digests, RLS/owners, functions, policies, triggers, grants and application/managed catalogs. Maintain explicit exemptions for provider-owned migration histories. Never wildcard private schemas and never replay managed Auth/Storage DDL indiscriminately.
- Parameterize destination and new archive pins **only in the separate V3 path** with a reviewed immutable config; forbid source project, T11 destination, nonempty destination, changed extensions/roles/ACLs, unreviewed sequences, and enabled external workers. Ensure complete import preflight is rechecked inside the transaction, then post-commit sequence verification follows the existing guarded two-phase method. Do not enable commands that write until the target has been independently approved.
- Reuse existing errors/rollback semantics: uncertain commit or sequence result means HOLD; no blind retry, credential printing or plaintext dump files. Retain independent role-denial, financial-history, no-provider-effect and post-restore validation criteria.

## Required isolated tests (no hosted access)

1. Historical T11 fixture and fixed restore script remain unchanged, with existing T11 test suite passing.
2. V3 synthetic good manifest covers all 65 pinned application tables and six expected archive SQL members; no real customer rows.
3. Fail closed for private table missing/extra, wrong owner or RLS, count/digest drift, catalog mismatch, stale/incorrect version, wrong source, missing key/invalid archive tag, altered roles-only grant or unexpected sequence assignment.
4. Refuse existing T11 destination and the source staging project before **any** connection; refuse an unpinned/used destination, missing isolation/disabled-provider proof, and unknown archive hash.
5. Native disposable PostgreSQL 17 test eventually exercises exact synthetic private schema replay, grants/RLS, rollback on failure, guarded sequence completion, and both-business denial without source/provider calls. Clean up fixture and prove no residual process.
6. CI at exact head: Foundation, Windows, backup transport, custody, native T11/T19 regression and new V3 tests; record skips/limitations rather than invent passes.

## Separation of approvals and execution gates

**Gate A — source-only:** inspect code and tests; new protected V3 path stays non-operational. This preparation PR is documentation-only; CI on a later implementation head must be checked independently.

**Gate B — staging capture:** separate explicit owner approval after a reversible complete writer-freeze plan. Only then may the existing V3 capture be run privately; produce ciphertext+checksum+separately protected key, independently retrieve and verify. No arbitrary `QUIET` assertion substitutes for a real freeze.

**Gate C — isolated restore:** separate approval of a new empty project, actual cost, exact identity/configuration, isolation of outbound Auth/email/SMS/Paystack/Zoho/cron/notifications and restore command. A fresh archive must be independently approved before enabling V3 replay. Never reuse `zrlojsvkqipuwkkyfrkn`.

**Gate D — acceptance:** verify application/managed catalog, row hashes, private RLS and ownership, sequences, Shalean/Bokkie negative access, independent restored login, no side effects, offsite key retrieval and measured RPO/RTO with limitations. Record source no-change evidence. Only then present owner T30 staging acceptance decision.

## No-change record

This document identifies existing incompatibility and bounded V3 qualification; it is **not** implementation, CI qualification, archive creation, runtime activation, hosted recovery evidence or T30 acceptance. No tracked code, database, Plesk, provider, scheduler, key, backup profile or production changes are requested. T30 remains In progress; T31 Not started.

References:
- `scripts/restore-staging.mjs`, `config/restore-test.json`, `scripts/backup-scope.mjs`, `scripts/backup-private-scope.mjs`, `scripts/t30-private-restore-catalog.sql`.
- `docs/t11-recovery-record.md`, `docs/t30-private-backup-schema-compatibility-20261103.md`, `docs/t30-synchronized-backup-snapshot-20261104.md`.
- Canonical tracker: https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit#gid=1809996177
