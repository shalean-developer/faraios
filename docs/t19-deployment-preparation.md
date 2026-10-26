# T19 explicit deployment preparation

Source only, based on staging c62c78acf1930ffa81307041673b67043b47234b. Issue140 remains open; A12 unresolved; accounting activation NO-GO. No launcher, unit, secret, SQL or provider operation was installed or activated. No T20–T23 changes. The PR containing this preparation needs its own review/merge governance; the PR143 exception does not extend.

## Prepared commands

Node24 on the approved Linux host; existing locked dependencies. `scripts/t19-runtime.mjs check /absolute/config.json` validates config and protected file locations without DB/network/listen/provider activity. It reads credentials but emits only a static success/failure label. It does not prove TLS validity, connectivity, ACL containment or authorization. Windows supports check only; deployment execution refuses Windows because POSIX checks cannot establish Windows ACLs. Importing modules alone does nothing.

After the corresponding separate approvals, use exactly one mode:

- `node scripts/t19-runtime.mjs custody /etc/faraios/custody.json`: connect as dedicated DB identity, construct existing service, bind127.0.0.1 only. SIGTERM/SIGINT drain for up to30seconds, then close connections and pool; uncertain durable operations remain for reviewed recovery.
- Select `_accounting.cjs` as the explicitly approved Plesk startup file: existing hosted staging runtime/edge checks plus mTLS proxy from fixed protected `/etc/faraios/web.json`; its publishable-key SDK additionally permits only t19_accounting_status and t19_enqueue_invoice. The previous name matcher rejected digits, so T19 RPC names were blocked; fixed while retaining the exact RPC allowlist. Default `_passenger.cjs` path remains unchanged/inactive. LiteSpeed accepts only these two exact startup names with the existing root/socket/loader checks. There is no standalone TCP web fallback or second web listener. Existing hosted environment-credential rejection remains intact. Source fingerprint includes both startup files and the custody/scheduler command.
- `node scripts/t19-runtime.mjs run /etc/faraios/scheduler.json`: one verified mTLS POST with empty JSON to /custody/run, bounded response, ten-minute deadline, sanitized aggregate result. No automatic retransmission, redirect or token handling. Failure exits nonzero and leaves durable recovery to existing custody logic; a timeout does not prove the server stopped. Check the job ledger before manual repetition. Held operations produce a held count, not a success assertion.

Example systemd source is in deploy/t19; **not installed or enabled**. Operator must verify actual service/node paths, separate Unix users, network controls and filesystem ownership. Rename custody.service.example to faraios-custody.service, accounting-pass.service.example to faraios-accounting-pass.service and accounting-pass.timer.example to faraios-accounting-pass.timer only after review. Timer schedules60seconds after the prior oneshot stops; systemd prevents overlap of that unit, has no persistent missed-run catch-up, and performs no service restart retries. Do not run a second cron/legacy worker. Custody SQL still arbitrates concurrent jobs from other machines.

## Configuration contracts

All modes require exactly version1, mode, boolean enabled and tls with absolute caFile/certFile/keyFile. Config and referenced files must be regular files outside every Git ancestor; symlink files are refused; each file<=64KiB. On POSIX group/other permission bits must be zero. Operator additionally proves ownership, directory protections, web-root exclusion, certificate identity/expiry/revocation, backup and process isolation. Example paths are not provisioned. Keep enabled=false until exact deployment approval. The enabled field is an operational opt-in, not approval evidence.

Custody example (replace placeholders privately, never commit populated config):

```json
{"version":1,"mode":"custody","enabled":false,"port":9443,"tls":{"caFile":"/etc/faraios/custody-ca.pem","certFile":"/etc/faraios/custody-cert.pem","keyFile":"/etc/faraios/custody-key.pem"},"database":{"host":"APPROVED_STAGING_DB_HOST","port":5432,"passwordFile":"/etc/faraios/custody-db-password","caFile":"/etc/faraios/db-ca.pem"},"publishableKey":"APPROVED_STAGING_PUBLISHABLE_KEY"}
```

Web/scheduler each use their own cert/key and separate active machine record/business grants. They receive no DB/password/client-secret/refresh-token config:

```json
{"version":1,"mode":"web","enabled":false,"endpoint":"https://127.0.0.1:9443/","tls":{"caFile":"/etc/faraios/custody-ca.pem","certFile":"/etc/faraios/web-cert.pem","keyFile":"/etc/faraios/web-key.pem"}}
```

Scheduler uses mode scheduler and scheduler-cert/key. Certificate SAN must match the configured endpoint. Custody pins existing staging origin, database URL and actual hosted session cookie. Database user is t19_hosted_custody; no environment/service-role fallback. Plaintext password exists only in the approved protected runtime file/memory; provider grants remain in Vault. No config is added to the web root. Logging must redact callback query strings and request bodies/Authorization at the actual proxy/process layers; application static errors alone do not prove that.

## Verified VAT adapter/receipt requirements

Existing business VAT contract is in supabase/migrations/20261021223123_business_vat_settings.sql: saved customer-total-inclusive snapshots, rate_bps1500 when enabled, vat_cents=round(total_cents*1500/11500), net=total-vat, immutable policy/version/registration and saved agreement. This is the already implemented business contract, not a newly proposed universal tax rule. Legacy null snapshots require explicit disposition; do not infer them from current registration.

The missing integration is broader than an adapter flag. That migration's invoice trigger refuses syncing VAT-enabled snapshots. src/zoho-books.js also refuses them and receipt verification rejects nonzero tax and line tax IDs. Existing audit.finish_invoice_sync checks identity, total and price_lines but does not bind provider tax metadata. Therefore removing only the JS/UI hold would neither implement nor safely validate VAT.

Before implementing any enablement, verify exact organisation-specific tax IDs, rate, inclusive pricing semantics, rounding/line allocation, registration/effective applicability and provider response fields from approved metadata and official provider contract. Map by business/environment/org and version; never accept client-supplied mapping authority. Preserve saved gross amounts and zero-quantity exclusions; never recompute old invoices from current business settings. A provider mismatch must hold, not adjust totals to force acceptance.

Required bounded change set after those facts are verified: trusted persisted mapping and pinned mapping version; create payload with verified tax fields; receipt verification of gross/net/VAT, exact line allocation/rate/tax ID and no unintended discount/adjustment/payment; database receipt/tax binding and a reviewed replacement for the SQL sync hold; UI follows verified capability. Include mixed/zero/exempt cases only if actually supported by the original saved agreement contract. Test cent rounding, immutable history, other-business/org/mapping substitution, missing/stale mapping, mismatch and duplicate/reconcile paths. SQL changes require their own exact approval; no migration or VAT hold bypass is included here.

No verified per-organisation tax mappings or provider rounding evidence are present in the current T19 acceptance record. Creating guessed mappings or interpreting test responses as provider proof is outside this preparation. Existing VAT denial evidence is reused rather than rerun unchanged.

## Acceptance and remaining gates

New targeted tests cover config rejection/no startup when disabled, hosted RPC opt-in denial boundaries, launcher loopback/cleanup and real mTLS scheduler denial. Existing bridge regression is rerun because its composition gained the scheduler client; hosted staging regressions are rerun because that transport changed. Full CI remains repository policy, not a claim of hosted acceptance.

Next: own PR review/merge decision; Issue140 named independent human inactive-only PASS then separate inactive SQL approval; operational managed-role/Vault/rollback assessment and exact grants approval; protected identity/config/key provisioning and approved host deployment; separate Shalean/Bokkie consent/effective permissions; verified VAT mapping and bounded integration changes if applicable; bounded financial/failure/refresh/revoke acceptance and exact per-business totals; separately approved schedule activation. Prior approvals do not authorize these actions. No new consent question is needed merely to continue local code work.

T19 In progress; A12 unresolved; activation NO-GO; T20 Not started.
