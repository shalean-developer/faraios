# T19-MANAGED-HARNESS-03 — disposable runtime candidate (NOT EXECUTABLE)

Based on staging commit `5120419f3a8a04ae106e45deb1e245db58f70567`. This PR adds a *pure function* that constructs a candidate Docker CREATE argv vector and fail-closed tests. **No Docker CLI is invoked and no execution approval is granted.**

Candidate Docker-enforceable controls: no image pull, no published ports, network none, 1 CPU, 512 MiB memory/swap, 64 PIDs, read-only root, drop all Linux capabilities, no-new-privileges, proposed UID/GID 999:999, 256 MiB isolated tmpfs scratch, exact disposable name/label. No host bind mounts, credentials or application database configuration.

## Critical compatibility and proof blockers
- The pinned Supabase PostgreSQL image's effective UID/GID and required writable paths have **not** been established. UID 999:999 and single /var/lib/postgresql tmpfs are **unverified guesses** and must not be run before review. Runtime image entrypoint might require additional directories, device access, filesystem permissions or init privileges.
- A 256 MiB tmpfs may be insufficient; 512 MiB total RAM and 1 CPU may be insufficient for PostgreSQL extensions or managed bootstrap. Limits are candidate ceilings only, not evidence of sufficiency.
- Network none is compatible with single-container isolation but *not* a working Auth/Storage/PostgreSQL multi-service topology. An isolated private network design with egress denial and proven ownership must be reviewed separately before any service is started.
- No actual Docker creation, CPU/RAM enforcement readback, process isolation, SQLSTATE negative tests, transaction rollback, start/restart/crash cleanup or Vault compatibility has been exercised in this PR.
- Docker container labels by themselves **do not** prove ownership. Cleanup must verify the recorded exact container ID, image, nonce and ownership before any operation; must never remove preexisting resources.
- Approved full vendor image manifest and managed migration bootstrap order, Auth index worker, Storage freeze/grantor, least-privilege role/ACL, Vault binary and recovery source remain NO-GO.

## Next acceptance gate
Review pinned image effective user/entrypoint and writable requirements from provenance without extracting secrets; design disposable network and cleanup state machine; independently review resulting executor, run negative tests on user-controlled disposable resources *only after a separate explicit execution authorization*. No hosted Supabase/Zoho/production/T20 operations.

**T19 In progress · A12 unresolved · managed execution NO-GO · Zoho activation NO-GO · T20 Not started.**
