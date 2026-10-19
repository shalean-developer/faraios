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
- Focused invoice SQL, provider contract, office HTTP and quote detail checks: 57/57 PASS, zero skips.
- Full local suite: 142 discovered, 141 PASS, one explicit skip because the independent PostgreSQL service is not installed locally. CI must run all142 with its PostgreSQL17 service, including the added invoice-creation and worker-claim contention cases.
- Independent `QA-T19-LOCAL-20261019` v2 PASS for bounded local implementation/preparation. Reviewer made no edits/live mutations, independently ran the57 focused checks and a fake-provider token-refresh/reconciliation probe. Shared AI tooling disclosure applies. A reproduced NULL-attempt completion finding is fixed and regression-protected; no unresolved material code finding remains in that reviewed scope.
- No real provider request, external invoice, financial activation or production action occurred. Real Zoho acceptance is NOT ASSESSED. Staging migration/readback, exact-head CI and browser gates remain pending in this record; later evidence must name the exact released candidate.
