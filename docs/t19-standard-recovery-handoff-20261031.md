# T19 private staging backup handoff — source preparation

Owner selection: encrypted backup files in Google Drive; the recovery secret separately in the owner's password manager. T19 remains In progress. This source preparation does not establish an off-host backup or authorise production activation.

## Exact operator operation

After CI/review, verify the deployed source includes this change, then run once as the staging application owner:

```
/opt/plesk/node/24/bin/node /var/www/vhosts/faraios.com/staging.faraios.com/app/scripts/t19-standard-private-backup.mjs --prepare-private-staging-backup
```

The command loads the existing protected staging/worker configuration, authenticates the existing restricted backend identity, and reads only `health` and per-business `connection` actions of `t19_standard_store`. It does not call Zoho, acquire a lease, refresh/revoke a token, mutate connections, invoke jobs, enqueue an invoice, or change a schedule/configuration. Backend authentication may create its normal Auth session/audit event.

Under the existing private directory `/var/www/vhosts/faraios.com/.faraios-t19-standard`, it creates a new owner-only `recovery-export-<random>` directory. Nothing is placed in the web root. It writes:

| File below the new directory | Destination |
| --- | --- |
| `data/credentials.json` | Private Google Drive recovery folder; existing token ciphertext and authenticated bindings |
| `escrow/key-escrow.json` | Same private Drive recovery folder; passphrase-encrypted encryption-key escrow |
| `owner-handoff/recovery-secret.txt` | Owner's password manager only; **never upload to Drive or chat** |
| `receipt.json` | Safe preparation metadata; may accompany encrypted Drive files |

Only the folder basename, backup ID, count and fixed booleans are printed. File modes are 0600; directory modes are 0700. The command verifies the written encrypted pair and compares it against freshly read connection/configuration state before writing a receipt. Changed/refreshed/revoked/reconnected state rejects the attempt, leaving restricted partial artifacts for manual review with no receipt. A subsequent invocation creates a separate directory; it never overwrites an older backup. Existing private artifacts are not deleted.

The recovery secret is 48 random bytes encoded as text. It is stored in a protected plaintext handoff file because the owner must move it directly into their password manager; no secret is returned through this assistant. The host already contains the active key. This temporary same-host copy is not independent recovery. Privileged host compromise and JavaScript memory-zeroisation limitations remain as documented in the parent recovery runbook.

## Owner handoff after an actual successful preparation

1. In your own Plesk File Manager, use the reported **private** directory, outside `staging.faraios.com/app`. Do not share its contents through chat or screenshots.
2. Copy the recovery secret directly into a password-manager secure note named `FaraiOS staging — recovery <backup ID>`. Record its backup ID/date. Confirm the note can be opened using your recovery access.
3. Download only `credentials.json`, `key-escrow.json` and `receipt.json` to your own machine, and upload these three files into a private Google Drive folder for this backup ID. Keep the folder restricted to the authorised recovery owner. Do not download/upload `staging.json`, worker files, plaintext keys or the `owner-handoff` directory.
4. Record the non-secret Drive folder link and password-manager item title, never the recovery secret, in the operating evidence. The Drive tool currently exposed here creates native Workspace documents, not binary/JSON backup uploads or folders; owner File Manager/download/upload is therefore required for this handoff.
5. Retrieve the encrypted files from Drive and the secret from the password manager into a **separate protected recovery directory**, then run a reviewed isolated restore verification. Confirm the backup IDs match, both businesses decrypt with correct bindings, and stale current state cannot be overwritten. No active import or token/provider changes are part of this proof.
6. Only after independent retrieval/restore proof should the owner remove the temporary plaintext secret and local downloaded secret copies, under an exact bounded cleanup instruction. Do not delete current runtime configuration, existing backups, custody history, jobs or uncertain dispatch evidence.

Successful preparation reports `offHostVerified:false` and `activeWrites:0`. Upload confirmation alone does not change that result. Receipt generation proves a same-host round trip only; independent retrieval/restore, live rotation safety, disconnect isolation and final staging acceptance remain separate gates.

## Isolated verification and rollback

Run `node --test test/t19-standard-recovery.test.js test/t19-standard-recovery-handoff.test.js`. Synthetic tests verify encrypted files, secret separation and modes, unchanged source records, stale/config/foreign-business rejection, enrollment failure, and an exact read-only backend RPC sequence. No live credentials/data are used.

Rollback source by reverting the new handoff module, command, tests and this document. There are no migrations or active runtime changes. If preparation was run, its new restricted directory is additional rollback material; removal requires the exact directory and successful independent recovery evidence. Do not delete it speculatively.
