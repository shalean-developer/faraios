# T19-MANAGED-HARNESS-02 — fail-closed disposable runtime design

**Source-only implementation, not execution acceptance.** Based on merged PR #199 at `1961448a8716cdc287f1ce8c4f7e8b0e0e7bbe1c`. The new `config/t19-managed-runtime-spec.json` is a proposed strict upper-bound policy; `scripts/t19-02-spec-validator.mjs` validates it and intentionally has no container-execution implementation.

- Reject privileged mode, missing capability drops, credentials, ports, bind mounts, non-isolated networking and excessive CPU/memory/PID/storage quotas.
- Require exact named disposable ownership proof and stop-and-inspect on unknown outcomes; never auto-delete existing resources.
- Bootstrap identity/least-privilege role grants, Vault, managed migration ordering, complete vendor image provenance and rollback remain explicitly unverified.
- A read-only root filesystem or non-root runtime may be incompatible with pinned PostgreSQL/Auth/Storage image startup, writable scratch, or extension initialization. **Do not relax these settings silently**; design a separately reviewed disposable writable-volume and runtime-user model after verifying exact image requirements.
- No safe network topology for interconnected Auth, Storage and PostgreSQL has yet been approved; `networkMode: none` prevents incidental egress but is not a functioning multi-service bootstrap.
- Existing three SQL SHA-256 pinned files do not represent the complete managed migration and resource catalog.
- Source-only negative tests are not Docker isolation tests, SQLSTATE permission denials, transaction rollback or guaranteed cleanup.
- Next gate: CI + local source validator PASS, qualified diff/governance review, independent runtime architecture and pinned image/actor review, then separate owner authorisation of a bounded *disposable-only* execution attempt.

No Docker create/run/pull/rm, SQL/hosted changes, secrets, provider calls, accounting actions, production or T20. T19 In progress, A12 unresolved, managed execution NO-GO, Zoho activation NO-GO.
