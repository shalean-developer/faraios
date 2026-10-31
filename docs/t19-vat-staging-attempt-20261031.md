# T19 VAT staging attempt — 31 October 2026

T19 only. Owner authorised Shalean TEST VAT setup, reviewed deployment and one new R115 inclusive draft on 5 November. T19 remains In progress; T20 Not started; production and T04/T05 unchanged.

## Applied and verified

PR273 merged staging a65bfb13ea57c5d019b559b6102b5da6630479f6 after final-head7d3d9767f9ebd0f57d7e0a5ed2411395657c6713 passed all5 checks. Native policy job124654334981 recorded full-suite, VAT, killed-worker recovery and exit0. Post-merge Actions checks also passed. Hosted source fingerprint4bdbcf8baf695583256f4c8e43e9d8a12f934e629fe093aec8d66db28509054f matched after restart. Migration t19_standard_vat_approved_test applied with zero active jobs/held leases. Existing four function owners/ACLs preserved; new private helper denies direct execution to anon/authenticated/service_role/backend. No new tables or exposed grants.

Shalean TEST943440851 accepted fictitious VAT4000000000, TEST VAT Number label, registration/first return2026-10-01, accrual/custom. No real number or SARS query used. Generated ordinary Standard Rate15% tax1589458000000110095; dedicated synthetic service item1589458000000110159, unitvisit/R115. Exact tax detail403/code104003; documented complete paginated list200 provides sparse SA metadata/statusActive; organisation current countryZA/ZAR/active. No grant or role expansion.

FaraiOS synthetic servicecd0a35dd-07a3-4d01-b9d6-59c1a2b38fda; booking40a6735a-43a9-4978-9120-a4f2263c7081; internalinvoice6f14c7d5-256b-4564-8d69-efb9b1799eb9, date2026-11-05 09:00, onevisit/R115. Saved policy2 has net10000/VAT1500/total11500. Current FaraiOS setting restoredOff/version3; saved invoice unchanged. Existing synthetic customer1589458000000103003 used; no real customer data.

Protected mapping preflight T19_VAT_MAPPING PASS: exact current connection/gen2/org/tax/item/customer, zero existing reference matches, existing three Shalean non-VAT provider drafts unchanged, Bokkie mappings unchanged, both fresh workers idle, files600. Previous item mappings retained as invoice-items.json.pre-vat; original SQL definitions saved as t19-vat-pre-migration-rollback.sql in protected private root. Scheduler257 paused for release then restored*/5. Existing non-VAT mappings remain active.

## Actual scheduled attempt — NOT acceptance

Owner UI approval job0b647a69-ee3e-4cc5-bd90-e74cd327473d approved21:07:34UTC. Actual21:10UTC scheduler recorded attempts1/dispatchedtrue and review_required/unknown_outcome. No Zoho invoice ID was published. Independent exact-reference read found0 in Shalean and0 in Bokkie, complete pages. The original HTTP response was not retained; therefore no authoritative provider rejection reason or successful VAT receipt can be claimed. No second POST, new approval, dispatch-marker reset or replacement invoice was executed.

Read-only actual synthetic customer metadata shows tax_treatment empty. This is a verified setup gap and a plausible cause, not proof of the original provider response. Official full Invoice API documentation became accessible after earlier timeouts and documents South African vat_registered/vat_not_registered/overseas plus inclusive tax semantics. Ordinary non-registered domestic customer treatment must be explicit before the next VAT dispatch. Do not guess classifications for real customers.

## Source follow-up

Stop blank/unsupported VAT customer treatment before beforeCreate/dispatch. Initial VAT scope is explicitly vat_not_registered domestic TEST customers only; registered/overseas/reverse-charge cases remain held for separate qualification. Carry this verified treatment and explicit no reverse charge into the VAT payload; require matching receipt treatment and reject reverse charge. Existing no-VAT payload is unchanged. Test missing/blank/foreign/registered classifications produce zero dispatches and zero financial POSTs.

Replace the legacy invoice page's unconditional VAT-held message with a link to current owner approval/result evidence. Keep the legacy VAT sync barrier in place; do not expose a second writer.

## Recovery and remaining gate

Retain the uncertain job and dispatch marker permanently. Its only offered retry is reconciliation of the original reference, never creation. Zero reference matches do not authorise clearing uncertainty. A new distinct synthetic VAT test needs an explicitly approved new test agreement; it must not reuse or reset the uncertain attempt. Proposed reviewable follow-up is one new R115 inclusive test dated2026-11-06, same existing synthetic customer after TEST-only explicit unregistered classification, same mapped synthetic service/tax, no email/payment. Qualify exact tax/item/customer metadata before approval and read back all VAT fields. A fresh test does not close the historical uncertain attempt.

No production activation. Final T19 closure additionally needs actual VAT provider receipt, remaining recovery/rotation/disconnect/monitoring operating evidence, consolidated reconciliation and owner staging acceptance.

Decision: source hardening CONDITIONAL PASS subject to final-head CI; VAT provider acceptance NO-GO. Existing five matched non-VAT invoices remain preserved.
