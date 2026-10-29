# T19 managed-bootstrap lineage findings — 29 October 2026

Decision: **NO-GO for another runtime qualification or checkpoint use.** The first run reaching managed catalogue comparison passed isolation, PostgreSQL bootstrap, Auth migrations, the Auth index worker and Storage's0–73 boundary. It failed managed comparison and verified cleanup. The evidence proves service/bootstrap progress, not a qualified destination or current-scope recovery. The owner retains the private records unchanged; no catalogue data, private ledger fingerprints, backup identifiers or credentials are published here.

## Established differences

The owner compared the retained source expectation with the candidate and confirmed the following. These are content differences, not just row ordering.

- Both Storage ledger mismatches,2 and62, match the exact public SQL revisions at supabase/storage commit `db42280506a07a165376219b2d6ac7bc92ccdfcc`, before the9 October versioning change `f31599e188d7c9c854b1daa76a11b41c6d179462`. The candidate matches the newer bytes packaged in the pinned v1.84.23 image. Source retains buckets_versioning_dark_check; candidate lacks it. Do not refresh/rewrite ledger hashes or declare the two schemas equivalent.
- Candidate has two extra standalone Iceberg tables/five indexes, while six expected Realtime indexes and the supabase_realtime_admin role are absent. Source has three memberships into that role and the log_min_messages parameter grant. The harness compares Realtime metadata but does not bootstrap that service's objects. Dropping those comparisons is not a compatibility fix.
- Source requires btree_gist1.7 owned by supabase_admin. It is an application recovery dependency: database/availability-draft.sql uses it for the cleaner-reservation exclusion constraint. Candidate has not installed it. The older reviewed restore helper distinguishes availability/version preflight from installation during replay; the new synthetic bootstrap must explicitly define its corresponding preparation boundary.
- Source owns pg_stat_statements1.11, pgcrypto1.3 and uuid-ossp1.1 as postgres; candidate owns them as supabase_admin. All versions match. Ownership/ACL mismatches require owner-faithful initialization, not direct catalogue updates or guessed GRANT repairs.
- supabase_admin's role settings differ, and all six Supabase event helper definitions/settings differ. The sanitized readback intentionally suppressed unrecognized search-path values. It does not authorize guessing those values or replacing the helper bodies with arbitrary SQL from a private capture.

## Public source reconciliation

Both altered Storage files were last edited by the same public versioning commit. The preceding0002 file and0062 file are reproduced byte-for-byte, with upstream Apache2.0 LICENSE and attribution, under test-support/t19-storage-history. Public SHA256 and postgres-migrations filename-plus-SQL SHA1 identities are in config/t19-storage-history-proposal.json. Byte-sensitive vendor files are excluded from line-ending conversion, and the three upstream trailing spaces in0002 are preserved; complete SHA256/SHA1 tests still enforce exact bytes. These fingerprints were derived from public upstream bytes; only local match results against the private ledger were shared by the owner.

Pinned Storage migrations branch on storage.multitenant. In0047/0048, hosted multitenant execution skips standalone Iceberg changes. This supports a deployment-context investigation; it does not prove that setting the API server's MULTI_TENANT flag is a safe fix. A future recipe must separate tenant migration initialization from standalone synthetic API runtime and verify complete resulting structure and history. The existing runner stays unchanged until that design and its dependencies are verified.

Pinned PostgreSQL source at802e6a10d46963f690ef0766a7d55c29150678c2 includes two SQL migrations absent from the cached image:20260923021047_update_pgrst_watch_triggers and20261016000001_search_path_for_supa_functions. The latter public file specifies pg_catalog,pg_temp for the six helpers; the private readback does not establish that these exact bodies/settings match staging. No blind replay is authorized.

That source also selects Supautils3.4.4. Its create-extension hook executes configured privileged extension creation under the configured superuser, and the source configuration names supabase_admin. Caller identity alone is therefore insufficient to prove installation ownership. Cached binary/version/configuration and the intended initialization sequence still need verification; full image-to-source binary equivalence has not been established.

## Bounded source-only Storage recipe

The proposed Dockerfile inherits the cached pinned Storage base, replaces only the two migration paths with unmodified historical upstream files and adds attribution. COPY fixes owner/group to0:0 and mode0644 so the nonroot runtime can read the files even when the private host checkout uses umask077. It contains no RUN, environment change, new entrypoint, network operation or ledger UPDATE. The manifest leaves executionAllowed=false and runtimeActivationAllowed=false. The active image pin, file verification manifest and signed harness bundle remain unchanged.

Before a future build, verify the cached base's immutable ID, architecture, configuration and provenance. Refuse a conflicting pre-existing local base tag or output tag; do not overwrite another image. The reviewed local base tag is only a cache alias for the fixed manifest identity, never independent proof of identity. Use an isolated recipe/SQL/attribution build context, no credential/backup input, no pull and no build network. Verify the resulting immutable identity, inherited configuration/layers and unchanged runtime files before proposing activation. This source publication does not build or activate the image.

Tests bind both exact SQL files and LICENSE, restrict the recipe's operations and confirm that a real attempted enabling write fails with SQLSTATE23514 while the stored bucket remains DISABLED. The fixture supplies only minimal prerequisite tables/columns; it is not a full1–73 migration rehearsal. The same constraint test is added to the existing native PG17 rollback-only fixture. CI success remains source/fixture evidence, not native Supabase compatibility.

## Next evidence and implementation order

1. Obtain read-only Realtime migration-version provenance from current staging and match it to immutable vendor sources before preparing bootstrap SQL. Record exact role, memberships, grantors and the parameter ACL already present in the saved expectation. Do not provision another live project or use the protected restore project.
2. Resolve owner-faithful core extension creation, btree_gist availability/version/actor, the role search-path discrepancy and exact helper body/configuration provenance. No direct pg_catalog owner updates, guessed grants or broad reassignment.
3. Review the tenant migration context and standalone service boundary, then build/verify the historical Storage derivative as a separate bounded operation. Do not enable migration hash refresh,0074, object versioning or external stores.
4. Publish the complete revised bootstrap recipe, tests and exact bundle/image identities; pass current-head CI and merge into staging before a fresh owner-signed synthetic run. Preserve every historical receipt/journal. Require full managed/custody/security/stability/cleanup success before proposing checkpoint use.

No staging data, permissions or settings changed. No image build, native rerun, restore, operational custody activation or provider accounting action occurred in this source task. T19 remains In progress at3.8/10 under the same24-criterion rubric. T20 and the protected restore project remain untouched.

## Primary references

- https://github.com/supabase/storage/tree/db42280506a07a165376219b2d6ac7bc92ccdfcc/migrations/tenant
- https://github.com/supabase/storage/commit/f31599e188d7c9c854b1daa76a11b41c6d179462
- https://github.com/ThomWright/postgres-migrations/blob/dbfc5ccd7c71d77c24200d403cd72722017eca67/src/migration-file.ts
- https://github.com/supabase/postgres/tree/802e6a10d46963f690ef0766a7d55c29150678c2/migrations/db
- https://github.com/supabase/supautils/blob/v3.4.4/src/extensions.c
- database/availability-draft.sql and scripts/restore-staging.mjs are existing approved source references, not instructions to operate on their protected destination.
