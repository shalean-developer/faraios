# T30 — protected-schema backup compatibility source change

Date: 3 November 2026. Status: **SOURCE-ONLY DRAFT; NO BACKUP OR RESTORE AUTHORIZED**.

## Why the historical T11 capture helper currently refuses staging

The 20–21 October T11 snapshot had 15 public and 2 audit tables. Current FaraiOS staging has 27 public, 3 audit and 35 protected application tables in exactly seven additional schemas. The old helper's manifest `unexpected_schemas` rule rejected the latter, so changing local catalog hashes alone would not make a complete, consistent backup.

The 35 table names are pinned in `scripts/backup-private-scope.mjs` from read-only source metadata. No protected table **data** was inspected or placed in GitHub. The current script already requests schema and data SQL for ordinary application schemas; it previously rejected those private tables at manifest validation, and did not include their definitions in both recovery fingerprints.

## Correction

- Require a protected local backup profile **version 3** with `privateTables` exactly matching the reviewed inventory. Legacy version 2 profiles remain valid only when no private tables exist. Current v2 will continue failing closed.
- Include only the seven named private schemas in the manifest's supported set, portable application catalog, source structure hash and sequence metadata. Any extra schema/table fails. Avoid wildcard `private_*` inclusion.
- Require private tables to have RLS and the expected owner, verify all expected table names, and assert the encrypted database dump contains full row-COPY coverage and RLS enable statements for all private tables. Never publish raw rows, tokens or keys.
- Preserve AES-256-GCM encrypted archive, SHA-256 sidecar, local private ACL guards, existing TLS trust, no plaintext SQL files and separate key custody. No changes to payment or accounting runtime behavior.
- Source-only synthetic regression tests exercise valid and rejected profiles, missing/extra tables, wrong ownership, disabled RLS, missing data rows and missing dump RLS entries.

## Still blocked; do not bypass

1. **Owner local profile:** existing `~/.faraios-backup-profile/current.json` remains v2 and unchanged. It must **not** be edited merely to match new hashes. New v3 profile including 27+3+35 table names and reviewed three catalog hashes requires a separately controlled owner procedure, preserving old ACL and history.
2. **Write freeze:** existing T11 capture prompts to stop staging and confirm a genuine quiet window. Plesk T19 TEST invoice scheduler is enabled every five minutes; T20 TEST payment and other possible writers need an explicit, reversible, separately approved no-write plan. An app web stop alone is insufficient. Do not disable cron or use real providers during T30 source verification.
3. **Backup completeness:** Auth/control-plane, Plesk/private T19/T20 files/keys and other non-database settings require separate protected inventory. Current Storage metadata is zero, but later object bytes require separate capture.
4. **Restore:** the previous T11 restore helper is pinned to an older archive and already-used inactive destination. Do not reuse it. New isolated empty target and any project cost require separate approval and recovery/role checks.
5. **Acceptance:** do not mark T30 recovery PASSED without current encrypted archive, off-site retrieval and key verification, an authorised isolated recovery, full RPO/RTO measurement and no-source-change evidence.

This PR modifies code and synthetic tests only. It must pass all latest-head CI and independent source review before owner considers the next gate. No production, staging data, backup/profile, worker, service, provider or T31 change was performed.
