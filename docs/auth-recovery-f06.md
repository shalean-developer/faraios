# F06 Auth and configuration recovery

Scope: faraios-new, 14 November 2026. Operations-only draft, based on main.
No application deployment, paid service, hosted restore or production cutover.

## What this rehearsal proves

An actual Supabase Auth service and PostgREST run against a disposable database.
Two synthetic users are created only inside the target. Their password hashes,
identities and session state are dumped and restored into a fresh database.
The service restarts with a fresh signing key. Password login, identity lookup,
refresh, sign-out, signed-out refresh denial, rejection of the prior signing key,
and actual JWT owner-policy enforcement are tested. The existing retained-backup
workflow can opt into this after its fingerprint/permission/isolation checks.
It must additionally prove a synthetic outsider cannot read existing invoices.

The initial database fingerprint checks remain network=none. The optional real
service phase disconnects that generated container from the none network and
joins a newly created internal-only Docker network. It has no published ports,
no external SMTP, workers, payment service or live configuration. Auth and API
receive only temporary generated role passwords/signing keys. Existing source
users are never logged in. Synthetic email addresses use example.invalid.
The database, service containers, network and plaintext disappear on completion.
Only aggregate reports are uploaded; private command output remains suppressed.

Pinned service tags follow the official Supabase Docker compose at observation:
supabase/gotrue:v2.197.0 and postgrest/postgrest:v14.18; database postgres:17.11.
This is not a complete managed Supabase project restore. PostgreSQL and Auth
version compatibility must be checked before a real recovery; no source data is
removed to make a version mismatch pass.

## Separate configuration inventory

Database archives do not by themselves restore these settings or credentials:

| Component | Source / recovery action | Evidence status |
|---|---|---|
| Auth Site URL, exact callbacks, email/anonymous settings, password and OTP policy | Reconcile hosted dashboard against docs/accounts-release.md and current templates; export non-secret desired settings before a cutover | Earlier release documentation exists; current hosted export/reapplication still required |
| Auth HTML and subjects | supabase/templates in versioned source; apply to the isolated target before hosted acceptance | Source retained; hosted reapplication not proved here |
| SMTP identity and password | Owner-controlled Resend account and Supabase SMTP configuration; enter credentials privately | Existing sender works; secret backup/recovery not proved |
| Signing/API keys and custom role passwords | Generate new keys for an isolated target; update only its private config; require re-authentication | Fresh temporary recovery keys exercised; no live key rotation |
| Private PHP account and mail configuration | Plesk private directories, outside document root; restore from a separately verified encrypted hosting copy | Hosting snapshots inventoried; file-level restore/ciphertext export not yet proved |
| Existing server sessions | Keep live cookies/sessions out of the recovery target; require sign-in after key/config change | Real synthetic sign-in/refresh test; live session transfer not attempted |
| Queues and external integrations | Keep dispatch disabled; reconcile provider acceptance before replay | Existing application gates preserved; no jobs consumed |
| Storage | Re-inventory bucket/object bytes at recovery time | Last source inventory: no buckets/objects; seven image records are database JSON |

Do not copy SMTP/service-role/signing secrets into Git, Library reports, shell
output or aggregate artifacts. An encrypted database backup and a working SMTP
sender are not proof that private hosting configuration can be restored.

## Reproduction

Synthetic real-service check on a Docker-capable host:

```
python3 tests/auth-recovery-boundaries.py
python3 scripts/auth_recovery.py
```

The existing Isolated database restore check workflow gains an explicit
`auth_rehearsal` option, default false. Run it from this draft branch against a
known successful retained encrypted backup only after the synthetic check passes.
No production connection password or URL is supplied to the restore job.

Owner review still needs recovery loss/time objectives, the named incident
responder/acknowledgement process, independent host-down monitoring and production
release authorization. Supabase remains Free. Do not enable booking intake or
republish a business to complete a recovery check.

## Read-only hosted settings inventory, 14 November 2026

Dashboard checked without saving changes: organization Free, faraios-new;
Site URL https://www.faraios.com; exactly two redirect URLs:
https://www.faraios.com/account/index.php?page=confirm and
https://www.faraios.com/_accounts-preview/account/index.php?page=confirm.
Signup enabled, email confirmation enabled, anonymous sign-in disabled, manual
linking disabled; Email provider enabled and all displayed external providers
and custom providers disabled/absent. Secure email change enabled; secure password
change and requiring current password disabled at observation. These are an
inventory, not a proposal to change policy. Email OTP expiry 3600 seconds, length
8, magic links/OTP enabled. The password-minimum field was redacted by the browser;
its current value was not recovered or inferred from older release notes.

Custom SMTP enabled, host smtp.resend.com, port 465, displayed sender name FaraiOS.
Credential/sender-address fields remained masked/redacted and were not revealed.
No SMTP save, provider change, key rotation, password reset or test email occurred.
Read-only database check: 82 Auth migrations, maximum version 20260831180000.

## Verified synthetic run

[Auth rehearsal 43634134038](https://github.com/shalean-developer/faraios/actions/runs/43634134038)
and [backup regression 43634134111](https://github.com/shalean-developer/faraios/actions/runs/43634134111)
PASS on application source c5afff8228a569820b731fd6f8bfa543a54f0185.
Four target-boundary tests also pass locally. The initial fully successful Auth
run 43633517827 retained aggregate artifact 14128723732; its report is committed
at docs/evidence/auth-recovery-synthetic.json. No passwords, emails, tokens,
customer records or raw container logs enter the report.

The synthetic bootstrap follows the pinned official Auth repository:
https://github.com/supabase/auth/blob/v2.197.0/hack/init_postgres.sql .
The Auth role must own its migrated helpers and use search_path=auth. This is
applied only in the empty synthetic fixture; no live role grants were changed.
PostgREST is explicitly configured for the restored public schema, with database
configuration overrides disabled. Hosted gateway/hooks/settings are not thereby
claimed restored.

## Managed API compatibility boundary

The actual restored Auth login/refresh checks ran, but initial combined runs
43633711557 and 43634306651 stopped at PostgREST readiness. A read-only hosted
catalog check confirmed authenticator loads `supautils, safeupdate`, which are
provider-specific binaries unavailable in the plain PostgreSQL image. These
managed settings are preserved and compared before/after the final rehearsal.
They are not disabled to make the service start.

The final probe instead uses a generated NOINHERIT/NOBYPASSRLS API login, granted
only anon/authenticated role switching, with a read-only default and PostgREST
transaction end set to rollback. Its checks are GET-only. This exercises real
JWT subjects and existing row policies without claiming recovery of managed
extension behavior or write-path API settings. Auth uses its restored service
role separately. The temporary login disappears with the disposable cluster.

Latest synthetic source e5925024187a1ec9a0b737867bf7224abc0e7e20:
Auth CI 43634698228 PASS; backup regression CI 43634698236 PASS. The read-only
API mode preserves managed authenticator settings and uses rollback-only API
transactions; it does not validate production write guards supplied by extensions.

## Retained encrypted backup rehearsal — PASS

[Run 43634869219](https://github.com/shalean-developer/faraios/actions/runs/43634869219)
PASS on e5925024187a1ec9a0b737867bf7224abc0e7e20. Backup source run 43626406812,
created 18:25:03 UTC, all 69 snapshot table fingerprints match before synthetic
service tests; three original owner/outsider scopes pass. Real Auth password
login, identity lookup, refresh, sign-out, signed-out refresh denial and old-key
rejection pass. Actual JWT policies return one synthetic owner's row only, and
an unrelated synthetic owner sees no existing invoice IDs. Managed authenticator
settings compare equal before/after. Published ports=0, outbound email=false,
production credentials forwarded=false. Target report elapsed 29.3 seconds;
workflow 40 seconds. This small rehearsal is not an RTO guarantee.

Aggregate artifact 14130285354 and docs/evidence/auth-recovery-retained-backup.json
retain only results. Runner input/evidence cleanup passed; generated containers,
network and disposable plaintext removed. Earlier failed attempts also cleaned
up; no hosted records were written. Current main backup/restore schedules were
not modified. PR #45 remains draft/unmerged and no application was deployed.

Next: prove separately encrypted private hosting configuration recovery and
hosted Auth/SMTP settings reapplication; resolve managed extension compatibility,
independent host-down alerting, recovery objectives and responder acceptance.
The actual Auth service proof is complete within its stated scope. F06 as a
whole remains open; do not enable intake or declare production recovery ready.
