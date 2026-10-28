# T19 Gate 2 consolidated v2 candidate — DO NOT EXECUTE

Prepared under the 28 October 2026 end-to-end mandate, in existing PR #209. This is an implementation/review packet, not a security PASS, host installation approval, Docker authorization, hosted SQL approval or accounting activation. T19 In progress; T20 Not started.

The canonical tracker, AGENTS.md and current PR #209 review findings govern this packet. Earlier PowerShell/v1 review-only implementations and their original evidence are retained as history. **Do not remove the PowerShell execution block or use its approval switch.** The v2 branch in `gate2Execute` selects `executeGate2` and ignores caller-supplied trust, runner, SQL, nonce and review objects. V1 cannot authorize execution; its forgeable native adapter has been retired.

## Exact implementation boundary

`scripts/t19-gate2-integrated.mjs` integrates Ed25519 approval verification, replay consumption, durable intent, ID binding, bounded Docker, readiness, fixed SQL, cleanup, inventory and restart reconciliation. Its real entrypoint takes an approval envelope only; injected `integratedRun` is a behavioral-test seam, never a remote API or sandbox for untrusted in-process code.

No private signing key is generated, installed or committed by this implementation. The host administrator must separately install independent owner/reviewer Ed25519 public keys in `/etc/faraios/t19-gate2-trust.json`, and provision `/var/lib/faraios/t19-gate2` mode 0700. All path components, bundle files, trust file and exact Docker binary must be root-owned, without group/world write or symbolic links. Host administrators, Node and the operating system remain trusted. Merely putting two keys in a file does not demonstrate independent human custody.

The host trust registry must bind `ownerKey`, `reviewerKey`, `context` (`default` only), `dockerHost` (`unix:///var/run/docker.sock` only), absolute `dockerBinary`, `binarySha256`, and reviewed immutable `imageEntrypoint`, `imageCmd`, `imageEnv`. Credential-named image environment entries are denied. No caller-provided Docker flags, shell command, executable, SQL text, provider credentials or recovery mutation can enter the real entrypoint. Installing this registry, granting Docker access or copying the bundle to a host requires separate authorization.

Both signers sign the same recursive canonical JSON receipt, with exactly:

| Field | Binding |
|---|---|
| version | 2 |
| scope | `t19-local-disposable-start-readiness-synthetic-sql-stop-remove-v2` |
| bundleSha256 | Exact integrated module + fixed SQL bytes + actual Node executable hash |
| binarySha256 | Exact Docker executable bytes, matched to protected registry |
| policySha256 | Fixed create argv and command/timeout/platform/inventory policy |
| inventorySha256 | Sorted exact 13-container ID/name/state baseline |
| context | Reviewed default local Unix-socket context |
| nonce | Fresh 32-character lowercase hex nonce |
| issuedAt / expiresAt | Integer milliseconds; maximum 15 minutes; no future or expired grant |

Signatures are `ownerSignature` and `reviewerSignature`, detached Ed25519, canonical base64. Same-key approvals, extra fields, stale scope, changed code/runtime/binary/policy/baseline and approval booleans fail closed. Expiry is rechecked after async preflight/intent and before each mutating dispatch. Expired cleanup permission quarantines rather than deleting.

## Reviewed procedure to be authorized later

1. Independent reviewer verifies final source SHA, operating-system trust, key custody, replay-store backup/restore policy, registry/image provenance, entrypoint, effective UID100/GID101 and resource feasibility. Owner approves that exact installed bundle and runtime procedure separately. There is no signed approval in this repository.
2. Read local context/image metadata and all-container ID/name/state inventory. Require exact approved 13-container baseline and no target-name collision. Never inspect unrelated contents or operate on existing containers.
3. Exclusively create and fsync nonce tombstone; fsync parent directory. Write/fsync exclusive intent with signed receipt and baseline **before** create. Incomplete entries permanently burn the nonce; never repair/delete/reuse them.
4. Create only `faraios-t19-managed-qa` from pinned local image config ID `sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda`. No pull, ports, host mounts, named volumes or provider credentials. Network none, read-only root, CPU1, RAM/swap512MiB, PIDs64, UID100:101, cap-drop ALL, no-new-privileges and fixed noexec/nosuid/nodev tmpfs paths/ownership. The image's vendor entrypoint remains unchanged; failure does not authorize privilege/storage relaxation.
5. Bind exact returned 64-character container ID durably. Inspect ID/name/image/nonce, image entrypoint/cmd/environment, capabilities, resources, namespace/device/mount/port restrictions and tmpfs before start and before later operations. Startup/readiness have bounded processes and finite polling. Capture logs without provider material.
6. Feed only `database/t19-gate2-disposable-integrity.sql` to container-local psql via stdin (`-X`, `ON_ERROR_STOP=1`). The fixture checks permission denial42501, duplicate23505, schema collision42P06 and operation-precondition collision55000, protected-row integrity, transaction rollback, role disappearance and role/schema/relation catalog fingerprint equality. Require all markers and successful subprocess exit. These are disposable integrity checks, not a full managed restore or accounting/provider E2E.
7. On success, verify immutable durable binding and runtime ownership again; stop only that ID, verify stopped, persist stopped receipt, reinspect, remove only that ID, capture complete post-inventory and require exact original baseline. Any unexpected result is NO-GO/QUARANTINE, including unrelated container-state drift.
8. On timeout, lost output, receipt failure, interruption, mismatched ownership or SQL failure: **no subsequent mutation**. Read-only nonce-to-ID reconciliation and exclusive quarantine evidence preserve the uncertainty. `recoverInterrupted` reads durable intent after process restart, reports identity/binding/baseline and never resumes startup/SQL/cleanup. Recovery cleanup needs its own separately reviewed authorization.

## Test evidence and remaining limitations

Behavioral tests use ephemeral generated test keys, real exclusive/fsynced filesystem journals, concurrent claimers, partial records, restart, a stateful Docker protocol substitute, lost daemon output, per-stage timeouts, ID/env/mount/capability/binding substitution, expiry after asynchronous work and inventory drift. One test terminates an actual harmless Node child and observes SIGKILL; no Docker process is spawned. They prove bounded implementation behavior, not Docker daemon cancellation or kernel-enforced resource/security behavior.

**Windows remains NO-GO.** The v2 real entrypoint currently refuses Windows; POSIX fsync is not Windows crash-consistency evidence. No Windows ACL/reparse-point/process-tree claim is made. A Windows implementation or separately approved eligible Linux/WSL host, independently reviewed custody installation and an actual exact-run acceptance remain necessary. Cross-host ledger sharing, clock rollback and replay-store restore safety need independent operational assurance; the local ledger does not claim global monotonicity. Registry manifest authenticity and full Supabase bootstrap/Vault/Auth/Storage compatibility remain separate unresolved gates.

No runtime resources, keys, credentials, hosted changes, OAuth grants, financial writes or worker activation were performed in preparing this packet. No actual owner 13-container inventory is available in this execution environment, which has no Docker, psql or PowerShell executable. Do not infer its preservation from a simulated inventory; noninterference here follows from making no Docker calls.
