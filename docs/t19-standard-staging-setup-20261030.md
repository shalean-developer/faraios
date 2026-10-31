# T19 standard integration — staging setup evidence

30 October 2026, Africa/Johannesburg. Owner instruction: “Proceed Staging setup end to end”. **Partially executed; NO-GO for connection/activation because the Plesk→PostgreSQL path is unavailable.**

## Completed shared staging changes

Applied Supabase migration `t19_standard_inactive_storage` to xdmfyrsauvqznkloroxg through the FaraiOS connector:

- New `private_t19_standard.connections` and `oauth_states`, RLS enabled, no browser/API/service-role grants, no public functions.
- `t19_standard_backend`: NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS.
- Only private-schema USAGE and SELECT/INSERT/UPDATE on the two new tables; RLS restricts both USING and WITH CHECK to staging. No DELETE or customer/invoice-table privilege.
- No password, encryption key, Zoho client secret, grant or connection provisioned. Existing custody roles/schema are unchanged.
- Canonical Build Tracker D20 now specifies encrypted server-side token storage within FaraiOS. Appended amendment and setup evidence to the L20 NOTE, preserving its existing value and note. The value was already49,980characters, so appending more history to that value would exceed Sheets' cell limit. H20 remains In progress; H21 remains Not started. Other tasks unchanged.

## Hosted PostgreSQL17.11 verification

`database/t19-standard-native-denials.sql` runs actual SQL permission checks and rolls back. PASS:

- anon/authenticated/service_role token SELECT each denied with SQLSTATE42501.
- Backend SELECT allowed on the two private tables; customer SELECT, token DELETE and production INSERT each denied with42501.
- New tables remain0/0rows; existing public invoice/connection counts remain2/2.
- postgres's role membership restored to INHERIT=false/SET=false after the rollback-only test.

First attempt could not SET ROLE to the new backend: PostgreSQL17 created postgres's ADMIN membership with SET=false. The subsequent test temporarily enabled SET inside its transaction, completed the checks, rolled back and verified the original membership. No persistent SET permission was left behind.

Security advisors before/after report the same three pre-existing informational RLS-with-no-policy findings and leaked-password-protection warning. No new finding from this migration. Existing warning remains outside this T19 change: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Actual Plesk observations

FaraiOS subscription738 / staging site841. System user `faraios.com_7t7rd0yqta5`, UID10463. Node24.22.1. App root `/var/www/vhosts/faraios.com/staging.faraios.com/app`; public root is its `public` subdirectory. Startup `_passenger.cjs`; Git UI reports8acabb1. No startup file, hosting setting or deployment was changed.

Credential-free commands executed using Plesk Run Now under that subscription. The task list was empty before testing; probes were not saved as recurring tasks.

| Probe | Result |
| --- | --- |
| accounts.zoho.com HTTPS | Reachable; TLS verified |
| www.zohoapis.com HTTPS | HTTP404 at root, TLS verified; not a Books API functional test |
| xdmfyrsauvqznkloroxg.supabase.co HTTPS | HTTP404 at root, TLS verified; not authenticated DB access |
| Direct DB IPv4 lookup | ENOTFOUND; direct hostname resolves to IPv6 only |
| Direct DB IPv6 TCP5432 | ENETUNREACH |
| Current session pooler TCP5432 | ECONNREFUSED |
| All three currently resolved pooler IPv4 addresses |34.241.16.247 /108.128.216.176 /52.209.89.87 each ECONNREFUSED on5432 |
| Existing `.faraios-t19` directory | Absent |
| Replacement `.faraios-t19-standard` directory | Absent |

Supabase Connect panel independently confirms `aws-0-eu-west-1.pooler.supabase.com:5432` as this project's session pooler. SSL enforcement enabled. Network restrictions allow all IPs, and no banned IPs listed. These checks do not establish which firewall/router sent the refusal. Hosting egress/routing or provider-side connectivity needs investigation; do not claim that changing architecture fixed networking.

## Prepared source improvements

- Lock-holder database statements now reuse that holder's pg client through AsyncLocalStorage, in autocommit mode. This avoids pool starvation while keeping state consumption/publication durable before external operations. Connection loss prevents subsequent store statements; native independent-process contention/drop tests remain pending.
- `src/t19-standard-postgres.js` pins the verified staging session-pooler hostname/port/project/role and verified TLS/root CA; checks the actual authenticated role and backend TLS on startup; refuses arbitrary hosts, transaction-pooler port, postgres fallback and TLS disabling.
- `scripts/t19-standard-preflight.mjs` is a credential-free network diagnostic, with no SQL, private-file reads or side effects.
- Local replacement suite15/15PASS, zero skips. Includes isolated SQL/RLS, actual local HTTP with synthetic auth/provider, and pinned PostgreSQL option checks. This does not prove native lock contention, host login, callback logging, scheduler reliability or real Zoho behaviour.

## Exact next action and held work

Have the hosting administrator investigate outbound TCP5432 from104.238.222.122 / UID10463 to `aws-0-eu-west-1.pooler.supabase.com` and the current resolved addresses above. Do not substitute an unverified port, disable TLS or purchase a new service. A successful TCP probe is only the first gate; then prove PostgreSQL TLS and restricted authentication with private credentials.

After that: provision the restricted login/password and private backend configuration through a protected channel; mount the direct backend handler with narrowly scoped configuration admission (the current hosted environment guard deliberately rejects provider/database secrets); verify OAuth callback query redaction at the web edge; deploy only the reviewed staging revision; prove unauthorised/foreign-business route denial and public-secret-file denial; qualify background execution before enabling invoice dispatch. Obtain owner interaction for private credentials/Zoho consent when required. No financial write is included in staging setup.

No production change, invoice creation, payment, external message or Zoho consent occurred. Schema installation is not completed end-to-end staging setup or T19 acceptance. Existing inactive startup remains the rollback position. Preserve the new empty schema and evidence; if removal is later desired, review exact objects/dependencies rather than dropping it automatically.
