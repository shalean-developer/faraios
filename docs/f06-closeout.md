# F06 — recovery and operational visibility

14 November 2026. Scope: faraios-new (rxelmugnucfajrqmphhe), existing hosting,
accounts-preview and isolated disposable recovery. This completes F06's technical
acceptance within the boundaries below. Application feature release, live booking
intake and Shalean republication remain separately gated.

## Proven recovery

| Check | Result and evidence |
|---|---|
| Retained encrypted database backup | Run [43639754033](https://github.com/shalean-developer/faraios/actions/runs/43639754033) PASS; source backup 43626406812, captured 18:25:03 UTC; all 69 snapshot table fingerprints equal, three existing business scopes pass. |
| Real Auth and API | Same run: password login, refresh, sign-out, signed-out refresh denial, prior signing-key rejection, actual JWT owner isolation and outsider denial against existing invoices pass. Three synthetic users only. |
| Managed database guard | Restored authenticator retains its settings and loads pinned supautils/safeupdate binaries; unsafe DELETE guard rejected and rows unchanged. No workaround role replaces authenticator in the final test. |
| Auth policy replay | Exact live/preview callbacks, Site URL, email confirmation and anonymous/signup settings applied to the isolated service; unconfirmed login denied. Masked hosted password-minimum value is not inferred. |
| Private hosting configuration | Run [43638624621](https://github.com/shalean-developer/faraios/actions/runs/43638624621) PASS: four allowlisted files restored byte-for-byte, hashes equal, directories 0700/files 0600; overwrite/symlink/wrong-password/tamper tests fail closed. Captured 20:30:16 UTC. |
| Recovered SMTP | Restored Resend credential authenticates over verified TLS to smtp.resend.com:465. Fixed operator verification delivered, provider ID 01a1dbc9-7106-70de-bb85-912e15021d03. No customer email. |
| Independent host-down route | GitHub runner, independent of Plesk, sends fixed operator test/attention messages; both delivered. Final [43639843101](https://github.com/shalean-developer/faraios/actions/runs/43639843101) PASS: homepage, preview sign-in and Auth 200, backup/restore healthy, encrypted configuration recent; recovery delivered, ID 01a1dbd6-29a5-70ce-8b6e-f079997906c1. |
| Private application visibility | Existing preview monitor observes sanitized application/mail/workflow events, database/Auth and backup health every five minutes; prior preview evidence remains in PR44. No customer content forwarded. |
| Hosting logs | Existing Plesk rotation inspected: daily, seven compressed files, no email forwarding. No raw-log export. Private application diagnostics retain 14 days. |
| Storage | Source re-inventory: zero buckets and zero objects. Seven image records are database JSON, covered by the logical snapshot. Recheck before any real recovery. |

Initial network=none snapshot verification; Auth/API then run in a generated
internal-only network with zero published ports. Production credentials are never
forwarded to those services. Existing users are not logged in, modified or emailed.
Temporary containers, network and decrypted files are removed on all paths.
Final target checks took 46.35 seconds on this small dataset, not a service RTO.
Provider libraries are rebuilt from pinned source, not claimed byte-identical to
the managed Supabase server. Full provider infrastructure restoration is excluded.

## Operating cadence and responsibility

Primary recovery owner: FaraiOS platform/repository owner. Operator destination:
alerts@faraios.com; use GitHub Actions failure notifications as the fallback when
configuration, GitHub or SMTP itself cannot be read. Delivery was verified; human
reading/acknowledgement and 24-hour staffing are not claimed.

- Daily database export: 01:00 UTC; ciphertext retention 30 days. Missed/failed,
  expired or older-than-30-hour backup fails health checks.
- Weekly Sunday 03:00 UTC recovery: latest retained backup, fingerprints,
  permissions/isolation and real Auth/API provider-guard rehearsal. Older-than-eight-
  day restore fails health checks.
- Independent monitor: every 15 minutes on GitHub, plus manual dispatch. Healthy
  repeat checks send nothing; failure transition sends once, unresolved conditions
  remind hourly, recovery sends once. Persisted idempotency keys protect retries;
  uncertain sends older than 23 hours require operator review before replay.
  GitHub scheduling may be delayed; it is not a guaranteed paging service.
- Preview application monitor: existing five-minute Plesk task. It remains preview
  scoped; production feature activation is not bundled into F06.
- Private configuration: encrypted capture after every configuration/credential
  change, before resuming changes. Latest independently retained copy is refreshed
  by the monitor; capture age over 30 days alerts. Artifact refresh never pretends
  to be a new configuration capture. Plesk snapshots remain the additional layer.
- Platform-owner working targets: database recovery point <=24 hours when daily
  exports succeed; recovery time <=4 hours from incident response starting. These
  are planning objectives, not measured production guarantees or staffed SLAs.
  Configuration recovery point is the most recent verified capture; recapture
  after changes. Preserve a separate passphrase copy in the owner's password manager.

## Incident and recovery procedure

1. Acknowledge in an owner-controlled incident record. Record UTC time, last healthy
   run, affected services and chosen backup. Keep public intake and external dispatch
   disabled. Inspect aggregate reports first; never paste private logs or secrets.
2. If the latest backup failed, preserve earlier copies and investigate read-only
   export/credentials before retrying. Never reset the live database password merely
   to obtain a backup. An unavailable monitor is an incident, not a healthy result.
3. Dispatch `Isolated database restore check` with a known successful backup ID and
   the real Auth/API checkbox enabled. Initial restore must have network=none;
   only generated internal services may join its internal network, with no ports.
4. Retrieve the separately encrypted configuration bundle and passphrase through
   owner-controlled channels. Use `private-config-recovery.php --action=restore`
   into a NEW private directory outside the web root. Check four files, equal hashes
   and private modes. Never overwrite the original private files or execute recovered
   PHP just to inspect it. Optional `--smtp-test` sends only to the operator inbox.
5. For a real hosted replacement, use the provider-supported role/extension setup,
   new signing/API credentials and current compatibility checks. Reapply versioned
   Auth templates and non-secret settings; enter recovered/reissued SMTP credentials
   privately. Require fresh sessions. Verify callbacks, confirmation and permission
   boundaries before any cutover. The rehearsal does not authorize hosted cutover.
6. Compare all counts/fingerprints, financial documents/payment history, published
   content and tenant denial checks. Re-inventory Storage and recover object bytes
   separately if any now exist. Keep workers/payments/mail paused until provider
   acceptance is reconciled; do not replay uncertain sends blindly.
7. Show the tested replacement and obtain the production release decision. Change
   routing/configuration only after approval; keep the prior target and encrypted
   archives. Verify live journeys/alerts after cutover and record actual loss/time.

## Configuration recapture

On Plesk PHP CLI, run the versioned `scripts/private-config-seal.php` using
`config/recovery-public.pem`. It reads only the four fixed private files, without
executing them, and writes an AES-256-GCM sealed packet under the private ops
folder. Transfer only ciphertext to the `configuration_action=import` workflow,
using the retained encrypted-key run. Verify its restore receipt and SMTP delivery;
retain an independent encrypted bundle. Never enter plaintext configurations in
workflow inputs. A credential change is not complete until this capture succeeds.

The independent encrypted recovery bundle is also retained with the foundation
plan as FaraiOS-encrypted-private-configuration-2026-11-14.zip. It contains the
ciphertext packet, public key and passphrase-encrypted private key, never plaintext
configuration or a plaintext recovery key. Losing the separate passphrase prevents
recovery. Keep weekly/monthly database copies outside expiring Actions artifacts.

## Boundaries and next priority

Supabase stays Free; no new paid subscription. Actions/storage quotas still apply.
No hosted database replacement, live SMTP setting save, source credential rotation,
customer booking, publication change or application feature production deployment
occurred. F06 proves recovery and visibility for the current foundation scope;
it does not finish the cross-industry platform. Next: owner review of the tested
accounts-preview and explicit production release decision for F01–F05, then specify
the shared core/capabilities for mobile services, appointments and quote-led work.
