# T19 staging SSL enforcement — 2026-10-28

## Approved change and observed result

The owner explicitly approved enabling SSL enforcement on staging project `xdmfyrsauvqznkloroxg`, including the required database restart. The dashboard's **Enforce SSL on incoming connections** switch was enabled and remained checked after a full settings-page reload. Pool size remained 15, maximum client connections 200. No password reset, network restriction change, custody provisioning or accounting activation was performed.

Supabase documents SSL enforcement as covering client-to-pooler and pooler-to-Postgres connections, and requiring a fast database reboot: https://supabase.com/docs/guides/platform/ssl-enforcement . This provider guarantee is distinct from an observed authenticated session's backend transport evidence.

## Post-change read-only database check

A single SELECT through the dashboard SQL Editor succeeded after the setting was reloaded:

```json
{"database":"postgres","operations":0,"connections":0,"vault_secrets":0,"custody_tables":[{"rls":true,"table":"connections"},{"rls":true,"table":"operations"},{"rls":true,"table":"prepared_references"}],"server_started_at":"2026-10-28T17:54:29.781968+00:00","prepared_references":0,"enabled_accounting_connections":0}
```

The SQL Editor check establishes database responsiveness and these specific safeguards. It is not an authenticated session-pooler transport test or a complete application health test. The restart timestamp is observed evidence; outage duration was not measured.

The owner previously reported `POOLER_CLIENT_TLS_VERIFIED_NO_LOGIN` from a credential-free Node TLS probe with CA and hostname validation. Direct IPv6 connectivity was unavailable on the owner's host. The selected IPv4 session pooler is `aws-0-eu-west-1.pooler.supabase.com:5432`, database `postgres`, user `postgres.xdmfyrsauvqznkloroxg`. Credentials are not included in this record.

## Evidence and remaining work

- [Enabled setting after reload](evidence/t19-ssl-enforcement-20261028/enabled.png)
- Authenticated session-pooler `pg_stat_ssl` readback remains pending; the dashboard SELECT must not be substituted for it.
- B02 managed-role rollback test, current-scope restore evidence, operational custody, actual authenticated security boundaries, both TEST connections, accounting lifecycle tests and owner UAT remain open.
- T19 remains in progress. Historical accepted local Gate2 receipts are unchanged. T20 payment-account/event implementation remains excluded.
