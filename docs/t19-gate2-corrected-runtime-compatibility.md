# T19 Gate 2 — corrected PostgreSQL runtime candidate

Replaces the unverified startup assumptions in the **legacy** `t19-03-docker-candidate.mjs` proposal. New canonical candidate is `scripts/t19-gate2-corrected-candidate.mjs`. The old source remains for historical regression tests; **do not execute its Docker argv**.

## Source-backed findings
- Supabase PostgreSQL 17 Dockerfile at source commit `802e6a10d46963f690ef0766a7d55c29150678c2` derives the entrypoint from pinned upstream PostgreSQL 17 Alpine image, swaps `gosu` for `su-exec`, sets `PGDATA=/var/lib/postgresql/data`, socket path `/var/run/postgresql` and uses `docker-entrypoint.sh`.
- Pinned upstream entrypoint `docker-library/postgres@6edb0a8c` path `17/alpine3.23/docker-entrypoint.sh`, Git blob `c3432be6750e32e22ba98808621217995f0ab19a`, prepares data/socket directories and when invoked as root switches to `postgres` user. The numeric Unix UID/GID, required capabilities and actual filesystem permissions in the cached image have NOT been independently verified.
- Owner's read-only Docker inspection reports `Config.User=""`, `WorkingDir="/"`, `Config.Volumes=null`, `PGDATA=/var/lib/postgresql/data` and `POSTGRES_HOST=/var/run/postgresql`. No host port publishing is permitted.

## Corrected non-executing proposal
- Remove forced `--user 999:999`. Explicitly leave entrypoint initial and effective numeric identities UNVERIFIED, not approved root execution.
- Two proposed isolated tmpfs paths: `/var/lib/postgresql/data` and `/var/run/postgresql`. No host bind mounts and network none.
- CPU 1, 512 MiB RAM/swap, 64 PIDs, read-only root are *proposed limits*, not sufficient-resource proof. The selected tmpfs sizes are unverified and might exceed memory budget.
- Do not assert `--cap-drop ALL` is compatible with the root entrypoint's ownership/privilege switch. Capability policy is UNVERIFIED and omitted from the provisional argv pending a secure reviewed plan. **Never execute the provisional argv.**
- Read-only root may prevent writes to `/tmp`, key-generation paths, or `/etc/postgresql`; Vault key bootstrap and server startup require future compatibility checks.

## Exact-run approval conditions
Pinned image config ID and registry provenance, checked numeric postgres UID/GID and passwd mapping, complete writable paths, verified least-privilege capabilities, resource budget, no real credentials, proven ownership nonce/container-ID and cleanup state machine, permitted synthetic SQL/expected SQLSTATE, reviewer signoff, and a separate owner authorization for *one disposable-only attempt*. An approved runtime runner is **not** present.

No Docker starts/create, SQL execution, hosted migrations, Vault changes, Zoho activation or T20 actions. T19 In progress · A12 unresolved · Managed execution NO-GO.
