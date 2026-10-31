# T19 item/unit mapping amendment

T19 remains In progress. The Shalean R100 acceptance draft was created once and recovered after an intentionally lost response, but Zoho omitted the ad-hoc line's `visit` unit. An explicitly approved TEST service item and manual association corrected the existing draft; strict reconciliation then matched INV-000002. That correction is historical evidence, not proof that future unmapped lines will work.

## Replacement behavior

The standard worker now requires an explicit mapping from each positive-price-line catalogue UUID to an existing Zoho item ID. The mapping is scoped to business, staging, current connection ID/generation, organisation and regional API. No name-only lookup, automatic item creation or fallback to ad-hoc lines occurs. Excluded zero-quantity lines stay excluded. A reconnected grant requires mapping review. A dispatched job can still reconcile without a current mapping, preserving its original record identity.

Before creation, GET `/items/{item_id}` under the ordinary held connection lease must verify active, sellable item, exact saved name/unit and no tax classification. The saved quantity/rate override today's item price. Creation includes `item_id`; the returned receipt must have that same ID and pass all existing money, unit, customer, unsent/draft and tax checks. Missing/stale/mismatched mappings hold before dispatch. The private job records `item_mapping`; the established invoice table retains `mismatch` through a narrowly replaced private job function, without changing its constraints, grants or stored agreements.

## Protected configuration

`invoice-items.json` lives beside staging.json outside the public/app roots. It uses the same 600-file, owner, ancestor, symlink and bounded-read checks. No secret is added. CLI worker startup requires it; the web application does not load it or start a worker. Missing configuration fails closed. Schema:

```json
{"version":1,"environment":"staging","connections":[{"businessId":"<business UUID>","connectionId":"<connection UUID>","generation":1,"organizationId":"<Zoho numeric ID>","apiDomain":"https://www.zohoapis.com","items":[{"catalogueId":"<catalogue UUID>","itemId":"<Zoho numeric ID>"}]}]}
```

Limit: 20 business connections and 1000 mappings each; duplicates, unknown fields, production and cross-business organisation reuse are rejected. Operator-reviewed file provisioning is the smallest staging setup; a future owner mapping editor is not delivered here. Derived fee lines lacking catalogue identity are held until explicitly mapped by a supported design. VAT invoices remain unsupported; existing agreements are never rewritten.

## Scope, validation and rollout

Affected: standard worker/runtime/CLI, item resolver, invoice adapter, owner error display, one private SQL function contract and focused tests. No new tables or custody dependencies. Estimated source/preparation effort: one engineering session; hosted permission, configuration and new-invoice acceptance depend on owner access and exact financial-write approval.

Official Zoho docs: https://www.zoho.com/books/api/v3/items/#get-an-item specifies settings.READ; https://www.zoho.com/books/api/v3/invoices/ describes invoice item IDs. Existing OAuth already requests settings.READ. Actual TEST user Items View permission and live response shape must be verified; do not broaden scopes or role permissions silently.

Required gates: isolated positive mapping/create/readback and stale/foreign/tax/unit denial; native PostgreSQL worker flow and durable mapping hold; final-head CI; exact migration review; staging configuration/read-only item preflight; one separately approved fresh TEST invoice created with item_id and matched without manual repair; retry/interruption/no-duplicate evidence. Previously completed jobs and historical drafts stay intact. No new financial write, recurring worker or production activation is authorised by this source change.

Rollback: disable worker execution first, retain mappings/job evidence/Zoho records and receipts. Keep the additive private error contract; revert source as a unit if needed. Never restore ad-hoc creation to bypass a failed mapping. T20 remains Not started; T04/T05 untouched.
