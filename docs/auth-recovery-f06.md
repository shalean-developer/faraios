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
