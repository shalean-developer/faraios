# T19 Gate 2 — exact startup and cleanup review (not an approved run)

Pinned local image evidence, captured by owner through two successful non-root read-only inspections:
- `postgres:x:100:101::/var/lib/postgresql:/bin/bash` (image account UID 100, GID 101)
- `/var/lib/postgresql/data` and `/var/run/postgresql` owned by 100:101 in the **unmounted image layer**
- One failed quoting attempt plus two successful short-lived inspections; subsequent `docker container ls --all --filter ancestor=<pinned image ID>` returned no matching containers.

**These do not prove startup compatibility.** tmpfs masks underlying image ownership; tmpfs data and socket directories need explicit ownership/permissions verified under actual runtime. Root entrypoint needs CHOWN and user-switch privileges; forcing `--user 100:101` and dropping all capabilities are both unverified approaches. The image's broader startup requirements (including temporary files and initialization/Vault scripts) and 512 MiB budget are not yet established.

## Proposed bounded execution phases — not executable in this PR
1. Independent reviewer verifies immutable image ID/provenance, approved local-only Docker host, explicit resource name collision denial, signed unique per-run ownership record, memory/PID/CPU limits, mount flags and no networking/port publishing.
2. Reviewer determines safe minimal startup capabilities and initial/final UID, complete writable paths, no hosted connections/credentials, and synthetic password handling. No real tenant data.
3. Owner separately approves the complete exact command(s), time/stop limit, failure paths and emergency recovery, and credentials policy.
4. **After those gates**, a distinct approved executor can create a named disposable container, capture its immutable ID and nonce, inspect enforcement, attempt startup, capture logs and readiness, stop on bounded deadline, and verify zero remaining test resources.
5. Cleanup must be implemented with stop/inspect/name+ID+image+nonce+inventory verification, never `docker rm` by name alone or bulk prune. If state is uncertain or container still runs, refuse automatic deletion and escalate for review.
6. Subsequent PostgreSQL privilege denials / transaction rollback and A12/Zoho integration are **separate**, not authorized by this PR.

New source helper only evaluates identity and prerequisite completeness, deliberately returns cleanupAllowed=false and startupAllowed=false, and does not invoke Docker. This is an evidence gap, not a tested cleanup mechanism.

T19 In progress · A12 unresolved · managed startup NO-GO · Zoho NO-GO · T20 Not started.
