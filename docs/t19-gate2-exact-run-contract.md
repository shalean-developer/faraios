# T19 Gate 2 exact disposable acceptance — execution HOLD

Based on staging `75c835542c50aac38c0a941cac6bc0fa95a5d59a`. Source-only candidate; no Docker invocation, PostgreSQL session or cleanup execution. The checked-in module lists the missing proof fields and always refuses execution, including forged approval flags.

## Minimum exact-run envelope
- Dedicated **new** disposable resource with pinned PostgreSQL image `sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda`; compare local config ID and independently authenticated registry manifest first
- Reject any existing resource-name collision. Require durable nonce and container-ID ownership receipt, unique temporary network/volume IDs and no host data mounts
- Limit CPU to 1, RAM and swap to 512MiB, PIDs to 64, no published ports, no-new-privileges, all capabilities dropped, no credential environment, and immutable image
- Proposed UID/GID 999:999 and writable tmpfs are **UNVERIFIED** against the image entrypoint; do not run before checking actual image user and required writable paths
- Network none is suitable for initial single-container inspection but cannot validate Auth/Storage interconnection; separate isolated non-routable multi-service network acceptance required
- SQL scope for future explicitly authorized test: synthetic role privilege denial (assert SQLSTATE 42501), transaction rollback, collision rejection (SQLSTATE 55000), no real business records, no hosted connections
- Failure/unknown result: stop, inspect, and retain evidence. Cleanup only when exact ID, nonce, image and ownership receipt match; never delete pre-existing resources; capture post-cleanup inventory and prove no leaks

## Acceptance required before executing
Reviewer must inspect exact Docker args, image identity/provenance, writable user model, credentials/egress controls, resource budget, collision and cleanup failure recovery, expected SQL, and owner-signed exact-run approval. Until separately approved, `EXECUTION_NO_GO`.

T19 In progress · A12 unresolved · accounting/Zoho activation NO-GO · T20 Not started.
