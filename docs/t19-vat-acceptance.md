# T19 VAT evidence and acceptance

26 October 2026. Base staging `a89a965992f8500e0de2c562ffec482505f216d2` (PR145). Authority: canonical Build Tracker T19 and existing immutable customer-total VAT contract in migration `20261021223123_business_vat_settings.sql`. No new tax policy or provider mapping is introduced.

## Read-only evidence

FaraiOS account project listing confirmed staging `xdmfyrsauvqznkloroxg`, eu-west-1, PostgreSQL 17.11. Catalog and aggregate SELECTs only; no credentials or customer details read, no writes. Current results:

| Business | Zoho TEST organisation pin | Saved VAT setting | Existing invoices | Tax snapshot |
|---|---|---|---|---|
| Shalean | 943440851 | Off, version 1, no registration number/date | One, 87500 cents | Missing |
| Bokkie | 943440162 | No settings row | One, 41000 cents | Missing |

Both accounting connections are disabled. These are local organisation pins, not proof of current provider identity, consent, registration or tax configuration. No columns named tax_id/tax_mapping were found in the catalog; the repository and canonical T19 evidence contain no verified per-organisation mapping or rounding receipt. Absence of a settings row does not establish actual registration status. Current settings cannot establish historical tax treatment. No historical snapshot or total was rewritten.

## Confirmed corrections

Previously the adapter's truthy enabled check allowed a missing snapshot through as non-VAT. The exported receipt verifier did not check saved tax evidence and accepted omitted tax/net totals. The new runtime SQL did not independently bind tax evidence at enqueue/claim/publication.

The adapter and direct receipt verifier now require an explicit internally consistent saved non-VAT snapshot: boolean false, saved policy version, existing customer-total basis, zero rate/VAT, null registration fields and equal saved net/gross totals. VAT-enabled snapshots remain unsupported; missing/invalid evidence remains held. Validation happens before credentials/provider requests in the adapter.

Receipt verification requires explicit provider tax_total=0 and sub_total=saved net, rejects nonempty tax collections, tax IDs and nonzero line tax percentages, and returns the saved snapshot plus observed net/tax cents. Existing identity, line, draft, total, duplicate and uncertain-write checks remain. SQL independently rejects unsupported snapshots at enqueue and claim and rejects matched publication unless receipt snapshot/version and numeric net/tax cents match. Failed/review-required outcomes can still be recorded. The private helper receives no new caller grant. SQL is unapplied review source, not an approved hosted migration; the immutable Issue140 proposal and existing applied migrations are unchanged.

The runtime fixture now loads the existing VAT migration before creating new agreements, exercising actual capture rather than injecting invented historical snapshots. A separate legacy fixture verifies old missing snapshots remain unchanged and cannot enqueue/claim. SQL tests submit mismatched versions, tax and net amounts and wrong JSON types; only the matching receipt publishes.

## Verification

Focused adapter/custody/VAT run: 27 passing tests before the final two SQL regressions; both added SQL regressions pass, and all 10 adapter tests pass after the final line-tax check. Native disposable PostgreSQL 17.10 two-business scenario passes, with cleanup confirmed. Syntax and whitespace checks pass. CI and automated review at the final PR head are recorded in GitHub and the canonical tracker. Initial SQL test assertions expected raw server errors from the sanitizing adapter; corrected tests call the restricted SQL path directly. No production behavior was relaxed for tests.

These tests prove bounded code behavior with mocked provider responses, not actual Zoho VAT acceptance. Existing VAT ownership, immutable snapshot and cent-rounding tests are reused and rerun only because the adapter/fixture contract changed.

## Remaining acceptance

No organisation-specific tax mapping is confirmed for either business. VAT-enabled payload, persisted mapping and VAT receipt/SQL enablement remain blocked on verified provider facts: intended organisation/identity and effective permissions, actual tax ID and classification, rate/effective applicability, inclusive pricing semantics, line allocation/rounding and exact response fields. The [Zoho Books invoice contract](https://www.zoho.com/books/api/v3/invoices/) documents tax/net fields; [Taxes API](https://www.zoho.com/books/api/v3/taxes/) identifies organisation tax metadata. Documentation examples do not establish either business's configuration. The Supabase Markdown changelog could not be retrieved; no compatibility claim is inferred.

After independent Issue140 assessment and separate exact SQL/provisioning/deployment approvals, obtain separately approved business consent/read evidence. Verify actual organisation tax metadata before implementing VAT enablement. Resolve historical missing-snapshot invoices only with verified evidence and explicit approval; never fill them from current settings. Then run one owner acceptance session with approved TEST invoice writes: allowed/denied tenant/role access, exact customer/tax mappings, saved net/VAT/gross line and business totals, refresh, duplicate/lost-response/restart recovery, disconnect and revocation. Preserve pre-existing records and retain holds on uncertainty. Worker activation and production remain separately gated.

T19 **In progress**, A12 **unresolved**, accounting activation **NO-GO**, T20 **Not started**. T20–T23 unchanged.
