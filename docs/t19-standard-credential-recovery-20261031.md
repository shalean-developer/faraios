# T19 staging credential recovery preparation — 2026-10-31

T19 remains **In progress**. This amendment adds offline recovery preparation to the standard backend integration. It does not restore the superseded custody architecture, activate production, or alter T20/T04/T05.

## Verified scope

The standard runtime encrypts token material with AES-256-GCM and authenticates business, environment, connection, generation, organisation, API domain and OAuth client ID. It currently accepts one active key ID. Existing protected files on the staging host are same-host rollback material; they are not evidence of independent off-host backup.

This change provides a staging-only encrypted token snapshot plus separately passphrase-encrypted key escrow. Escrow authenticates the exact snapshot digest and backup ID. Restore validates every credential binding, preserves revocation-pending/disconnected status, and rejects mismatched or stale current-state comparisons. Shadow rotation re-encrypts a copy and verifies unchanged token material. There is no database import, runtime activation, provider call or live-key replacement path.

Components: `src/t19-standard-recovery.js`, `src/t19-standard-recovery-files.js`, synthetic runner `scripts/t19-standard-recovery-rehearsal.mjs`, and focused tests. No migrations, dependencies, application routes or hosted configuration changes.

## Isolated evidence

Run `node --test test/t19-standard-recovery.test.js` and `node scripts/t19-standard-recovery-rehearsal.mjs`.

The runner creates two fictitious businesses with synthetic tokens, writes ciphertext and encrypted escrow into separate owner-only temporary directories, and restores in a fresh child process. Its temporary passphrase crosses stdin, never command arguments or environment. Output contains fixed booleans/counts only. It verifies shadow rotation and denial with the old key, then removes only its own temporary directories. It does not read staging configuration or access a network service.

Tests cover exact material recovery; wrong passphrase and escrow substitution; manifest/ciphertext/binding tampering; duplicate business/organisation; production rejection; stale current-state rejection; retention of disconnected and pending-revocation states; old-key denial; overwrite, symlink, hardlink, size and permissions rejection; and fresh-process recovery.

## Security trade-offs and limits

- AES-GCM escrow uses scrypt N=32768/r=8/p=1 and a random salt/nonce. An operator must use a strong independently held passphrase. Minimum length alone does not prove entropy.
- Data contains encrypted refresh/access tokens and their identifying bindings. Escrow contains the encryption key only inside passphrase-authenticated ciphertext. Both remain sensitive restricted artifacts.
- Directories must be canonical Linux paths owned by the executing user with no group/other access; files are exclusive-create, mode 0600, no-follow, single-link regular files. Use owner-controlled protected ancestor directories. These checks do not establish protection against a privileged or compromised host, hostile ancestor renames, or establish physical/off-host separation.
- Separate directories on one host are not independent backup. Do not export real keys, tokens, passphrases or escrow through chat, browser content, logs or this repository.
- Buffer keys are cleared where practical. JavaScript strings and runtime copies cannot be guaranteed erased.
- Escrow does not back up the OAuth client secret, backend login, owner account, database, approval/dispatch state or invoice reconciliation records. Those require their own protected recovery plan. Never restore token snapshots over newer connections or erase unknown-outcome dispatch evidence.
- The child has a bounded input/output size and 20-second timeout; it receives no inherited environment. The synthetic command is a rehearsal, not a durable backup command or proof of active-host restore.

## Remaining operating steps and acceptance

1. Choose owner-controlled off-host ciphertext storage and an independently controlled key-escrow/passphrase destination. Confirm access, retention, recovery ownership and deletion policy without transmitting secret values to chat.
2. Prepare a server-side shadow rehearsal using real staging ciphertext privately, compare against a fresh current snapshot, and output only counts/booleans. No key/token should leave the protected host during this rehearsal. Review its exact script before execution.
3. Prove durable retrieval and isolated restore from the chosen independent destinations. Record artifact identifiers and verification result, never payloads or key fingerprints.
4. Separately prepare coordinated active-key rotation: pause both business workers; wait for leases to drain; preserve all token/connection/job versions; compare-and-swap token envelopes and update private configuration atomically enough to prevent mixed-key execution; validate both connections; test rollback before resuming. The current offline helper alone cannot do this safely. Do not improvise a live rotation or replace/revoke Zoho tokens.
5. Prove disconnect/reconnect isolation, monitoring and held-outcome recovery; reconcile all approved TEST invoices; obtain owner staging acceptance and update the canonical Build Plan.

Rollback for this source-only preparation is to omit/revert these additions. Existing runtime configuration, active token envelopes, scheduled workers, held invoice and historical custody artifacts are unchanged. For a failed file-pair write, preserve/restrict the partial artifact for operator review; the writer deliberately does not overwrite or guess what to delete.

Estimated remaining recovery work: 0.5–1 engineering day for reviewed hosted rehearsal/rotation preparation, plus 0.5–1 day for independent-destination restore and rotation proof once destinations and access are available. This is an estimate, not evidence of acceptance or deployment approval.
