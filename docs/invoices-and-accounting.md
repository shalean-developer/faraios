# T19 — Invoices and accounting

Document T19-PLAN, version 1, 19 October 2026. Engineering owner: Codex; financial/product authority: Farai. Scope source: original tracker T19, dependent on completed T18. Owner selected separate Zoho Books connections for each business on 19 October 2026. Baseline main ef4baeb0d4b0c8fa0a6bf71222bb9c1fed1fffd7, tree5a8f996cf4b8cbeac2f1ec35ff29a54b46dc9785. Status: implementation in progress, no release/financial acceptance claimed. UI-02 browser acceptance remains open separately.

## Objective and bounded delivery

Give each business durable invoice identities, one invoice per source booking, its own Zoho organisation binding and visible reconciliation results. Preserve frozen booking prices and source quote/handoff lineage. The tracker acceptance criterion is “Business totals reconcile; failures visible.” Online provider payments are T20; EFT evidence and cash reconciliation are T21.

Prepare an internal draft invoice only by explicit office action. A draft is not sent, paid or recognised revenue. Never automatically bill a cancelled booking or treat a T18 handoff as permission to invoice. Keep the operational booking state independent from invoice state. Invoice snapshots are immutable; no silent repricing, tax, discounts or financial adjustments are introduced.

Zoho records retain their own identity/number. A FaraiOS UUID is the durable internal identity and provider reference, not a fabricated statutory invoice number. Owner-only connection setup pins a distinct Zoho organisation per FaraiOS business. Secret material stays on the server, outside tables/browser/logs/Git. Existing production websites, accounting organisations and writer processes remain untouched.

## Planned implementation and controls

1. Add business-scoped immutable invoice snapshots, explicit preparation RPC and scoped reads, with composite source links and unique booking ownership. Owner/manager may manage invoices only for an active authorised business; staff, anonymous and foreign-business callers are denied through API and database controls.
2. Add separate connection metadata and a server-only accounting worker. Owner-only configuration fixes organisation and regional API domain. Provider requests use trusted stored bindings, not browser-supplied URLs/credentials. User-facing reads cannot forge provider-confirmed success.
3. Implement the Zoho adapter using verified official API contracts. Read and validate organisation, customer and invoice identity/currency/total. Explicit sync creates only a draft in an independently configured staging organisation, without sending, payment actions, tax/discount policy or live-site cutover. Ambiguous external creation must stop automatic re-creation and show review required; reconciliation may recover the original invoice.
4. Expose invoice list/detail, preparation from booking, connection status, exact per-business draft totals and separate matched/failed/pending accounting totals. Labels distinguish internal drafts, externally verified records and unresolved failures. Partial/truncated provider data cannot produce a clean reconciliation badge.
5. Record audit actor, business, time, state changes and safe error codes. Preserve raw customer/provider secrets outside shared evidence. Durable attempt identity and claim controls prevent concurrent sync from creating duplicates.

## Acceptance and release evidence required

| Criterion | Evidence required |
|---|---|
| Separate identities/connections | Both-business invoice preparation, unique source and provider bindings; owner-only setup; manager foreign/staff/anonymous/suspended deny |
| Saved agreement | Exact booking lines/total/currency and quote/handoff source retained after catalogue edits; no booking mutation |
| No duplicate invoices | Repeated/concurrent preparation and sync; external timeout/crash handling; replay returns or reconciles the same identity |
| Totals reconcile | Per-business counts and integer-cent totals; provider customer/currency/reference/line/total mismatch visibly fails; no false provider status from client writes |
| Failures visible | Not configured, denied, rate-limit, timeout, unknown outcome, duplicate/mismatched provider record; safe messages and recoverable review state |
| Usable UI | Desktop/mobile both businesses, keyboard forms, readable status/action/amount, no overflow |
| Controlled staging | Exact-head CI, independent implementation review, migration readback, API/RLS allow/deny, before/after original-data digests/advisors, independent QA |

Release sequence: local isolated tests → independent technical review → exact-head CI → reviewed staging migration → controlled staging verification → owner loopback pull/restart → both-business visual/live-provider acceptance → final independent QA and tracker closure. No production/accounting activation or customer messages without an explicit separate cutover.

## Dependencies and unresolved evidence

No Zoho client credentials, refresh tokens or isolated staging organisation/customer bindings have been supplied for this fresh FaraiOS project. Provider choice is approved; actual organisations, secret configuration and live-provider acceptance remain unverified. Use controlled fakes only for isolated contract tests, clearly labelled; they cannot close the real connection gate. Do not re-use production secrets or assume an existing Shalean integration authorises this new writer.

No tax/discount, cancellation charge, refund, recognition or payment policy is inferred. Statutory issuance, sending, provider payments, bookkeeping journals and production cutover remain outside this bounded staging increment. A draft/connector technical PASS cannot substitute for financial or live-provider acceptance.

Recovery: additive schema and paused worker; stop sync first, preserve external/internal identities and uncertain attempts, revert application changes if needed. Never delete or blindly re-create an invoice to recover a timeout. Data recovery and production foundations remain their separate open gates.

Current gate: CONDITIONAL PASS for controlled implementation and isolated tests within the owner's direction. Staging migration/release and T19 Done require the evidence above; real Zoho connection acceptance is NOT ASSESSED until configured and exercised.

## Staging operator setup (after review/merge)

The implementation is disabled for external accounting unless both `FARAIOS_ACCOUNTING_SERVICE_KEY` and `FARAIOS_ZOHO_CREDENTIALS_FILE` are configured in the owner's local server environment. The first is this FaraiOS staging project's server-only Supabase secret; never use the publishable key or expose it to a browser. The second points to a private JSON file **outside the Git repository**. Set secrets locally; never paste them into chat, commit them, or put them into connection fields. The worker client is used only by the server's controlled claim/finish RPC flow; authenticated office users cannot call those RPCs or claim provider-confirmed success.

Each credential alias has this shape, with values supplied locally by the authorised operator:

```json
{
  "BUSINESS_A_TEST": {
    "business_id": "<FaraiOS business UUID>",
    "organization_id": "<isolated Zoho staging organisation ID>",
    "api_domain": "https://www.zohoapis.com",
    "environment": "staging",
    "staging_organization_confirmed": true,
    "client_id": "<Zoho client ID>",
    "client_secret": "<Zoho client secret>",
    "refresh_token": "<Zoho refresh token>"
  }
}
```

Configure a separate alias and organisation for the second business. The independent operator pins must exactly match the stored business, region and organisation. OAuth scope needs the organisation/settings read, contacts read and invoices read/create capabilities required by the documented endpoints. Obtain consent through Zoho's approved OAuth process; do not use live-site refresh tokens. New organisation/customer setup and credentials remain the owner's actions. The sample is a shape, not usable credentials or proof of a connection.

After starting the loopback server with these settings, the owner opens Finance → Accounting connection, chooses the correct regional domain, enters organisation ID and credential alias, and confirms the isolated staging organisation before enabling checks. Managers can view connection status and manage invoice drafts but cannot change the connection. Contact binding uses an explicit Zoho customer ID in that organisation; exact saved name and ZAR currency are checked, not used to auto-link unrelated contacts.

External sync sends only a Zoho **draft**, with no contact-person recipients and no send action. Its staging date uses the saved visit date; review it in Zoho before any later issuance. Saved positive-quantity lines are checked by name, quantity, rate, unit and amount. Zero-quantity excluded choices remain in the internal immutable agreement and contribute no provider charge. Zero-priced positive-quantity service details remain present. Any additional tax, discount, adjustment, payment, emailed status or changed currency/amount fails matching. No statutory invoice-issuance/tax decision is inferred.

The provider adapter follows the official [Zoho OAuth](https://www.zoho.com/books/api/v3/oauth/), [organisation](https://www.zoho.com/books/api/v3/organizations/) and [invoice](https://www.zoho.com/books/api/v3/invoices/) contracts retrieved on 19 October 2026. The Supabase changelog was checked: Node24/modern TLS covers the upcoming legacy-cipher removal; the staging database is already PG17.11, and this additive module creates no GiST/ltree/encryption changes. No dependency update is included.

## Local evidence before candidate freeze

- Syntax and whitespace checks PASS.
- Focused invoice SQL, provider contract, office HTTP and quote detail checks: 58/58 PASS, zero skips.
- Full local suite: 143 discovered, 142 PASS, one explicit skip because the independent PostgreSQL service is not installed locally. CI must run all143 with its PostgreSQL17 service, including the added invoice-creation and worker-claim contention cases.
- Independent `QA-T19-LOCAL-20261019` v2 PASS for bounded local implementation/preparation. Reviewer made no edits/live mutations, independently ran the57 focused checks and a fake-provider token-refresh/reconciliation probe. Shared AI tooling disclosure applies. A reproduced NULL-attempt completion finding is fixed and regression-protected; no unresolved material code finding remains in that reviewed scope.
- No real provider request, external invoice, financial activation or production action occurred. Real Zoho acceptance is NOT ASSESSED. Staging migration/readback, exact-head CI and browser gates remain pending in this record; later evidence must name the exact released candidate.

## 20 October staging browser follow-up

Owner reported pull/restart and sign-in. Remote main was independently read as `9e415c34b6a4cc65939099ebc066da0f4b1f9003` (tree `a89fa5a0a50fd593fc6ab22ecd12fbd1151aa435`); the loopback UI displayed the new Finance features. This is an owner-reported runtime version with a feature check, not a cryptographic runtime attestation. PR63's exact-candidate CI passed all143 tests including real PostgreSQL contention; independent `QA-T19-STAGING-20261019` v1 passed the deployed technical gate after migration `20261019213701`.

Browser preparation used only the two completed T14 acceptance bookings already documented in `docs/t14-acceptance-2026-10-19.md`. They intentionally remain test workflows in staging; no customer billing or real work is implied.

| Business | Existing T14 test booking | New internal draft | Saved/pending total |
|---|---|---|---|
| Bokkie | `0996766f-6137-4140-ba4d-a9bf76c523c4` | `a32455c7-cbaf-434d-9e8c-9761eaa7f2d4` | R410.00 |
| Shalean | `c11a5926-ec0d-487c-b22a-d87013933e56` | `bd057ce5-6a28-4980-9269-1938def96ad9` | R875.00 |

Both Prepare draft actions succeeded through the signed-in owner UI. Opening the booking and choosing Prepare or open invoice returned the same draft ID; reload persisted each draft. This verifies browser reopening/idempotent GET routing, while repeated/concurrent POST safety remains covered by isolated SQL/HTTP/CI tests. Each business list displayed one pending draft, the exact total above, zero verified Zoho total and no Zoho number. Detail pages showed Internal draft / Not synced, Not configured / Not linked / Not checked and no sync action while the worker is unconfigured. Owner connection forms remained blank/Disabled with staging confirmation unchecked. Desktop list/detail and mobile390×844 detail/settings layouts were inspected; measured mobile page width375 with no overflow. Both temporary viewport overrides were reset and read back at1280×575.

Read-only staging SQL corroborated exactly2 invoices, both `draft` / `not_synced`, null external invoice IDs, and exact equality of saved customer/address/price lines/total with their source bookings. Accounting connections remain0. Audit events increased182→184, exactly one business_invoices INSERT per business under the owner actor. Original12-booking digest remains `d4bbf1b8a33c7ebaac1758c9010bcd99`; original3-quote digest remains `d2663a1b909c4d7fc81acb57a7e5f6d2`. No booking/quote mutation or external sync occurred. Drafts and their audit evidence are retained.

Browser review found misleading booking text that unconditionally claimed no invoice existed. The follow-up replaces that claim with a direction to the separately prepared draft. The same follow-up fixes residual comma-boundary address duplication and reduces quote action spacing by6px; final visual acceptance requires the owner to pull/restart that follow-up. A calendar HTTP assertion failed only when the selected date became Today; its count now accepts the existing `is-today` class, without changing calendar behaviour.

Follow-up local full suite:143 discovered,142 PASS, one explicit PostgreSQL-service skip, zero failures. Independent bounded correction QA:52/52 focused invoice/quote/HTTP tests PASS, syntax and whitespace PASS; shared AI tooling disclosure applies. Independent staging corroboration PASS at20Oct2026 04:24:32UTC: all12 original business-table baselines and the original182-event audit digest remain unchanged; both version1 drafts also preserve currency/visit time/timezone/source links and have no provider/attempt fields. No independent live writes or browser replay were performed. Final exact-candidate CI is recorded in the follow-up PR.

T19 remains **In progress**. Actual separate isolated Zoho organisations, private server credentials, customer bindings, real draft reconciliation/failure acceptance and final independent closure remain open. The owner's Zoho organisation-setup tab was inspected read-only and reloaded. After loading it showed an organisation picker with three existing Shalean-named organisations and no visibly identified FaraiOS test organisation. None was selected or assumed isolated. New Organization was clicked for owner handoff, but the destination remained blank; no setup form rendered. Actual isolation/region/currency and successful setup remain unverified. No form, agreement, OAuth grant or organisation configuration was submitted. No production cutover, issuance, sending, payment or T20 work occurred.

## 20 October dedicated test organisations and private setup

The owner subsequently created **FaraiOS - Shalean TEST (943440851)** and **FaraiOS - Bokkie TEST (943440162)** as new organisations. Browser names/IDs were verified. Both owner connection metadata rows were saved as staging, version1, **disabled**, using `https://www.zohoapis.com` and aliases `FARAIOS_SHALEAN_TEST` / `FARAIOS_BOKKIE_TEST`. Independent read-only verification at `2026-10-20T05:09:41Z` passed the bounded metadata gate: exactly two owner connection INSERTs (audit184→186), no updates; original business-table/audit baselines and both internal draft snapshots unchanged; no provider binding or attempt. Organisation creation and saved metadata do not prove provider isolation or successful integration.

The owner verified Zoho in a new API Console tab. The console lists an existing Shalean App and Self Client. Add Client explicitly reports that a client of the Self Client type already exists and must be reused to generate codes. Existing clients/secrets were not opened or changed. To maintain separate staging credentials, prepare **new server-based clients**, one per test organisation. Registration and OAuth consent still require the owner's action-time approval; no new client/grant is implied by this preparation.

`scripts/setup-zoho-staging.mjs` is an operator-only helper for the existing private credential-file contract. It adds no office endpoint, worker activation, database write or provider invoice call. Official [client registration](https://www.zoho.com/developer/oauth/register-app.html) and [Books OAuth](https://www.zoho.com/books/api/v3/oauth/) contracts were checked on20October2026.

The general server-client registration below was superseded after actual consent inspection. Use the documented ORG registration page, `https://api-console.zoho.com/add?client_type=ORG`, and the corrected public values below. New credential creation requires owner action-time confirmation.

| Field | Shalean test client | Bokkie test client |
|---|---|---|
| Type | ORG | ORG |
| Name | FaraiOS Shalean TEST ORG | FaraiOS Bokkie TEST ORG |
| Homepage URL | `http://127.0.0.1:3101` | `http://127.0.0.1:3101` |
| Authorized Redirect URI | `http://127.0.0.1:3102/zoho/callback` | `http://127.0.0.1:3102/zoho/callback` |
| FaraiOS business UUID | `612be091-b1d7-4911-9c3b-143446a9fe27` | `0cc3f518-d64e-40c2-8817-bc14d1ef1420` |
| Zoho organisation ID | `943440851` | `943440162` |
| Exact organisation name | FaraiOS - Shalean TEST | FaraiOS - Bokkie TEST |
| Alias | `FARAIOS_SHALEAN_TEST` | `FARAIOS_BOKKIE_TEST` |
| API domain | `https://www.zohoapis.com` | `https://www.zohoapis.com` |

Run `npm run setup:zoho-staging` in the owner's local checkout, once per business. Enter the public bindings above; type TEST only for the dedicated test organisation. Use a private folder outside all Git checkouts. The default is `.faraios-staging/zoho-credentials.json` under the current user's profile. Check that Windows folder/file access is limited to the intended local operator and normal system administrators; POSIX new files use0600 and existing broadly readable files are rejected. This helper does not claim to configure Windows ACLs.

Paste the **new ORG** client's ID/secret only at the hidden terminal prompts, once each, then press Enter. Do not send them to chat or capture terminal/browser secret screens. The helper prints the official organisation-bound authorization URL (`/oauth/v2/org/auth`) with the public client ID and fresh random state. Open it in the same browser; review and personally accept only the correct TEST organisation and these exact scopes: `ZohoBooks.settings.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE`. If organisation selection is absent, wrong or includes live organisations, **deny and stop**. Do not infer a provider restriction from the client name or local pins.

The callback listens only on127.0.0.1:3102, accepts one matching-state response, checks host/method/region, and redirects immediately to a clean local path. Secrets and the code are sent only in the token POST body; responses/errors are not logged. Before saving, a read-only organisations request must return exactly the expected sole organisation with its exact name and ZAR currency. Another accessible organisation causes failure, including any production organisation. This is a fail-closed check, not proof that untested provider behaviour supports the desired grant.

The private file is locked during setup and replaced atomically, preserving other aliases. Existing aliases/business/organisation bindings cannot be overwritten. The second successful run adds the other business to the same file. A failed exchange, isolation check or save cannot enable accounting. If consent succeeded but saving failed, the operator must revoke only the newly registered test application in Zoho before retrying; do not revoke or rotate either existing client. A failed setup may leave a new grant at Zoho even though no file was saved.

The server's Supabase service key must still be set privately for this staging project, and the existing credential-file environment variable must point to the saved JSON. Restarting the server, enabling each owner connection, customer binding and actual draft/retry/failure/totals acceptance remain separate pending steps. T19 remains **In progress**; UI-02 final address runtime/host clipboard checks and T20 remain unchanged.

## PowerShell prompt follow-up

The owner pulled main8580733 and started the helper in PowerShell on20October2026, then confirmed that the first business-UUID prompt was absent after the two startup lines. The same startup printed the inline prompt under the isolated Linux PTY, so the precise owner-host cause was not reproduced. Prompt labels now end with a newline before readline waits on its separate input line, keeping each question on a completed console line. Hidden credential input remains muted; no secret, OAuth grant, filesystem pin or accounting activation rule is relaxed.

An added subprocess regression exercises the real CLI/readline flow with synthetic terminal streams, verifies every public/hidden prompt label is a completed line, checks secret input is absent from output, and cancels during callback wait with no credential file or lock left behind. It performs no provider request. A bounded Windows Node24 CI job runs the helper checks as well as the existing full Linux job. This validates the Windows Node execution path with synthetic streams, not a physical PowerShell/ConPTY session; owner-host confirmation remains required.

## Actual consent inspection and organisation-bound correction

The owner confirmed visible PowerShell prompts and reached hidden Client ID entry at07:56SAST. The first authorization request returned Invalid Client; its public Client ID parameter contained four concatenated copies. A clean private-entry retry reached the real consent page at08:07SAST. The page showed the correct Shalean TEST client and exact four capabilities, but only account-level consent and no organisation selector. Nothing was accepted. Reject was clicked; Chrome then displayed ERR_BLOCKED_BY_CLIENT for the return to the loopback helper. No callback completion, grant, token exchange, credential-file save or browser-block bypass is claimed. The local helper should be stopped before another attempt.

The earlier choice of general server clients did not provide the required organisation-bound consent. Official [instance-level OAuth](https://www.zoho.com/developer/oauth/instance-level-oauth.html) explicitly includes Books organisations and requires an ORG client. Its [authorization-code endpoint](https://www.zoho.com/developer/oauth/instance-level-oauth/get-auth-code.html) is `/oauth/v2/org/auth`, and its administrator flow offers an instance picker. General server clients are rejected by that endpoint. Token exchange and refresh still use the documented `/oauth/v2/token` endpoint; scope, region, state, callback, file and sole-organisation checks remain unchanged. These contracts were verified on20October2026; actual Books ORG consent/provider isolation remains unassessed until exercised.

The API Console's documented ORG registration page rendered successfully with Client Type ORG. A replacement form is prepared for owner review, not submitted. Use names ending ORG to distinguish the replacements from the two earlier ungranted general clients. Do not open, delete, revoke or rotate either pre-existing production client. No production change, permission expansion or final T19/UI-02 acceptance follows from this correction. Owner confirmation for new ORG credentials, actual org picker/consent, the Chrome-blocked loopback return and provider reconciliation remain open.
