# T19 bounded image build and dependency correction

The remaining runtime preparation needs two copy-only local derivatives. scripts/t19-bootstrap-image-build.mjs builds them from their exact cached bases. It accepts only --build, requires the pinned root Linux Node/Docker runtime and default local socket, refuses conflicting base aliases and all existing output tags, uses private allowlisted contexts with exact file hashes, never pulls or runs build commands, and verifies inherited configuration and base layer prefixes. Existing container/network/volume inventory must remain identical, with the original 13 containers exited. The resulting IDs are evidence for a later source update; runtime pins are unchanged and no candidate is started.

PostgreSQL retains the accepted key-path derivative as its base. The new derivative changes only migrate.sh plus attribution. Core pg_stat_statements, uuid-ossp and pgcrypto are created during the vendor init-script loop, while postgres is still a superuser. Supautils normally redirects their creation to supabase_admin. The revised runner temporarily clears privileged_extensions, reloads, and waits for a fresh backend to observe it before the unmodified loop. It then RESETs the override, reloads, and verifies the original value before timestamped migrations/demotion. SQL bytes/order and actors are otherwise preserved. The override lives only in the fresh tmpfs PGDATA, not a host configuration or existing database.

Supautils v3.4.4 registers this setting as PGC_SIGHUP. A session SET or PGOPTIONS change would fail; neither is used. The builder does not execute the SQL or claim that the cached Supautils binary has been version-qualified. Real owner-host startup, configuration restoration and exact extension ownership must still pass before destination qualification. A failed initialization remains an unqualified disposable candidate requiring cleanup.

Storage retains its pinned base and replaces only migrations 0002 and 0062 with the previously reviewed historical bytes plus attribution. Do not activate this image until its ID and unchanged files are bound into the reviewed harness. Hosted tenant migration context versus standalone API runtime remains a separate required source correction; an image build alone does not resolve that difference.

The synthetic harness now installs the application recovery dependency btree_gist 1.7 in extensions as supabase_admin, after checking exact availability and initial absence. Native PG17 CI verifies its version/schema/owner and a real GiST exclusion violation (23P01) inside the rollback-only fixture. This is preparation of a fresh candidate; no hosted extension is installed or reassigned.

Local tests verify byte-bound copy-only contexts, inherited-config/layer rejection and actual shell control flow with a synthetic psql adapter. They prove that a failed reload observation stops before initialization and restoration precedes vendor migrations. They do not substitute for native Supautils startup evidence.

After the build result, update immutable image identities, expected modified-file hashes and derivative inheritance checks in a bounded PR; complete the Storage migration/runtime separation; pass CI and merge before preparing a fresh owner-signed synthetic receipt. Preserve old journals and approvals. Full managed comparison, authenticated security, stability and cleanup must pass before checkpoint use is proposed. No restore, protected-project change, hosted permissions, accounting activation or T20 work is performed by this builder.

References:

- https://github.com/supabase/supautils/blob/v3.4.4/src/supautils.c
- https://github.com/supabase/supautils/blob/v3.4.4/src/extensions.c
- https://github.com/supabase/postgres/blob/802e6a10d46963f690ef0766a7d55c29150678c2/migrations/db/migrate.sh
