# Independent QA — Shalean TEST verification record

23 October 2026. Reviewer: independent Codex agent `/root/shalean_record_qa`, sharing the host/tool environment; not an external human audit.

Tested candidate: `c8cab677f75ec07dccf608420872c50abbde725e`. No runtime/SQL/test edits made by this reviewer. The verification record is documentation over existing implementation, not activation evidence.

## Fresh independent regression

Node v24.14.1, disposable PostgreSQL17.10, synthetic fixtures only.

| Command | Result | Evidence |
|---|---|---|
| `node --test test/zoho-books.test.js test/zoho-setup.test.js test/invoices.test.js` |45/45 passed;0 failures;0 skips | `qa-focused.txt` |
| `node scripts/run-t19-postgres.mjs` |26/26 passed;0 failures;0 skips; native acceptance and disposable-cluster cleanup markers confirmed | `qa-native.txt` |

The tests' fake OAuth/provider traffic and local loopback are synthetic test machinery; no Zoho API or real OAuth grant is involved. These passes do not certify deployed JWT/session enforcement, hosted RLS, current provider identity, real grants or production credential custody.

## Isolation assessment

- Stage B uses immutable synthetic business/connection/organisation records, composite foreign keys, RLS and role-scoped functions. Its broad-token tests prove FaraiOS routing does not rely on provider token exclusivity.
- HTTP rejects injected organisation and role fields, foreign connection IDs, forbidden roles and untrusted callers. Native PostgreSQL tests repeat actual DB-role/RLS denial and worker fencing.
- Credential envelope AAD and cache context include business, connection, generation and organisation. Ciphertext substitution and stale generation fail; dispatch/disconnect races preserve late-result uncertainty.
- These controls are offline only. Synthetic `synthetic-a`/`synthetic-b`, generated remote IDs and fixture invoice9001 are not real Zoho organisations/invoices.
- Legacy `business_accounting_connections` is keyed by `business_id`, with optimistic `version`; it has no separate connection UUID or credential generation. Version must not be relabelled generation. Its owner configuration permits organisation/alias changes before any invoice provider binding exists and pins them after accounting attempts. Therefore universal legacy immutable association is not established.
- Legacy adapter checks independent credential pins and fixed regional hosts, rejects the new org-substitution test before any request and stops on provider403 without financial writes/fallback. Existing gaps remain: reserved-query hardening, explicit active-profile requirement, generation-aware custody/dispatch integration, actual provider revocation and distributed refresh.
- Independent business aliases and DB uniqueness do not establish independent real grants. Provider revocation is not implemented/proven by synthetic local disconnect. Both must remain separate verification fields.

## Record-review requirements

Only safe current staging reads may establish present DB metadata. Historical identity screenshots and earlier grants cannot establish current identity/membership/grant state. Earlier acknowledged diagnostic revocation is historical evidence, not proof all grants are absent. A current metadata row is not provider-authenticated organisation verification. Provider invoice fields remain NOT VERIFIED without an independently identified TEST invoice and ownership evidence.

The allowed status vocabulary is VERIFIED, RECORDED — NOT REVERIFIED, PROPOSED, NOT VERIFIED, NOT APPLICABLE. A date for historical evidence must not be presented as today's provider verification. No usable grant or invoice absence can be inferred from missing evidence.

## Recommendation

PASS for existing bounded synthetic isolation regression; NO-GO for real Shalean connection acceptance, full T19 acceptance or accounting activation. Keep T19 In progress. A further separately approved, controlled TEST-only profile and known-invoice read remains necessary unless equivalent admissible current evidence is supplied. No new grant, provider call, real credential access, financial write, T04 change, merge, deployment, CI or security-setting change was performed by this reviewer.

## Final record review

Reviewed `docs/t19-shalean-verification-record-20261023.md` and the saved `staging-readback.json` after preparation. The table uses only the required five verification labels and distinguishes fresh DB configuration evidence from historical provider observations and unverified current grants/identity/invoice fields. Readback supports both disabled/version1 bindings and the Shalean aggregate1 internal invoice,0 external IDs,0 provider bindings,0 attempts. Those counts establish no current provider invoice evidence in the queried rows, not absence of invoices at Zoho. I reviewed the saved connector evidence, rather than independently repeating hosted queries.

The report correctly distinguishes legacy business-keyed connection/version from Stage B UUID/generation, and conditional legacy pinning from immutable Stage B identity. It preserves the blocked UI inspection, leaves current profile/account/grant/invoice facts NOT VERIFIED, identifies exact manual evidence, and keeps T19 In progress/accounting NO-GO. No blocking finding in the completed record. Fresh regression results above apply to unchanged runtime/tests at c8cab67; documentation evidence is a later addition, not a live-provider test.
