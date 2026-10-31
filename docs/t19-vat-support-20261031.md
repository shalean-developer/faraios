# T19 VAT-on source candidate — 31 October 2026

Scope: the owner's approved VAT On/Off requirement, T19 only. T19 remains In progress; T20 Not started; T04 rules are preserved. This source candidate is not hosted activation or a financial-write approval.

## Verified audit

The canonical tracker records Shalean3/R1075 and Bokkie2/R510 matched, including the R410 Bokkie invoice created by the actual scheduled worker at20:10UTC. These existing non-VAT agreements remain unchanged. The current staging branch is9b6ef09b45e052842760c72eb73d22e68b9e6141.

FaraiOS already saves VAT-inclusive customer totals and a versioned immutable tax snapshot: 15% VAT is round(total_cents*1500/11500), net is total minus VAT. Current sync deliberately rejects VAT in the adapter, owner readiness, invoice trigger and private receipt publication. These are necessary coordinated changes; simply removing the JavaScript rejection is unsafe.

Read-only deployed calls with existing dedicated grants: GET /settings/taxes returned HTTP200/code0/empty complete lists for both Shalean943440851 and Bokkie943440162. No additional OAuth scope or role was requested. Shalean TEST's actual VAT Settings page displays registered: No. The switch was NOT changed. No real company registration, customer contact details, invoice or payment was copied or changed.

Official sources checked31Oct2026:
- https://www.zoho.com/books/api/v3/taxes/ documents exact-ID GET/settings/taxes/{tax_id}, settings.READ, numeric percentage, simple versus compound tax, is_value_added and South African special-tax types. Successful exact-ID lookup establishes existence; reject any explicit inactive indication. The documented object does not require an active-status field.
- https://www.zoho.com/books/api/v3/invoices/ indexed official documentation confirms is_inclusive_tax and per-line tax_id, rate and the returned receipt fields. Direct full-page retrieval repeatedly timed out. **The actual South African inclusive line item_total convention is not yet provider-verified.** Candidate receipt validation expects net line item_total, inclusive rate, exact header net/VAT/total and pinned tax identity; any difference is held, never silently accepted or rewritten.

## Implementation

1. Adapter validates the saved inclusive snapshot with integer arithmetic, registration/date/policy identity, line totals and document VAT. R115 remains R115 (net100/VAT15). Every line uses an explicit pinned tax ID with is_inclusive_tax:true. VAT creation requires the guarded standard access and item resolver; legacy callers remain blocked.
2. Protected optional invoice-taxes.json pins each business, environment, connection ID/generation, organisation, region and saved VAT policy version/number/date to an operator-verified tax ID/name. Exact-ID read requires simple value-added15%, rejects special/compound/foreign/inactive/substituted tax. Never choose the first/default15% tax. No browser-supplied tax mappings. Missing file is an empty mapping; existing no-VAT operation does not depend on it.
3. VAT receipt requires exact saved total/net/VAT, inclusive mode/date/rates, all line identities/units/quantities/net amounts, one pinned tax summary, draft/not emailed/unpaid/no adjustments. VAT reconciliation also requires the retained exact item mapping and validates item IDs; it cannot fall back to an ad-hoc item. Saved agreement and original receipt identity remain immutable. Per-line/document rounding disagreement is held before dispatch; no automatic balancing adjustment. Initial scope is integer quantities and ordinary15% VAT; mixed/exempt/zero-rate/reverse-charge cases are held rather than inferred.
4. Additive candidate SQL changes owner tax readiness and exact tax receipt amounts, adds fixed tax_mapping/tax_rounding errors, and replaces only the VAT invoice-update barrier with a scoped standard-job exception. That exception requires a live enrolled backend session, current owner approval, held business/environment lease, exact connection generation/org/domain and immutable saved VAT evidence. Legacy/unapproved/no-lease updates remain rejected. Quote/recurring VAT rules are preserved verbatim. No tables, policies, invoice data or runtime grants are added.
5. Owner invoice review displays saved VAT/net amounts and fixed errors. No new send/payment/edit-existing-provider-record operation is introduced.

## Tests and gates

Focused tests cover inclusive cent arithmetic, malformed registrations/snapshots, rounding holds, cross-business/environment/generation/policy tax-map denial, inactive/wrong/special taxes, exact receipt rejection, one create/readback, missing mapping, absent reconciliation and lost-response recovery with one total POST. SQL fixture tests cover default VAT barrier, scoped claim, forged VAT/net receipt denial, snapshot preservation after VAT Off, owner approval, matched receipt and idle rerun. Existing no-VAT worker regression is retained. Native runner adds a separate disposable PostgreSQL cluster for VAT; must record T19_VAT_WORKER_NATIVE_PASS, not substitute PGlite or a skipped test.

Before hosted migration: require final-head CI, full diff/ownership review and saved deployed definitions of the four replaced functions. Source tests cannot qualify actual Zoho VAT registration or receipt semantics. No candidate migration, mapping file, tax-setting switch, new VAT approval or VAT invoice has been executed in staging.

## Concrete proposed staging acceptance

Request explicit approval for TEST-only VAT configuration in FaraiOS - Shalean TEST943440851, with fictitious TEST registration details where supported, an explicit ordinary15% tax and a dedicated synthetic VAT service. Do not use a real VAT number without separate owner direction. Existing TEST records must not be updated by tax setup.

Prepare one new fictitious internal booking/invoice for existing synthetic TEST customer1589458000000103003, date2026-11-05, one visit at **R115 inclusive = R100 net + R15 VAT**. No real customer data. Record the new policy version, tax ID, item ID and complete snapshot; get/retain exact owner approval before the provider POST. Restore FaraiOS's prior VAT-Off setting after saving this new agreement, proving historical VAT evidence survives setting changes. Never amend any existing R100/R875/R410 invoice to add VAT.

After TEST tax configuration, first inspect actual ordinary-grant tax metadata and registered organisation through the authorised administrator UI; create no draft until the exact mapping is qualified. Install reviewed migration/source with VAT mappings absent, verify old non-VAT receipt/reconciliation, then provision only the reviewed TEST policy mapping. Let the scheduler process the exact approval once. Read back every line and header, count exact reference matches, verify no email/payment and run idle/reconciliation checks. If the provider contract differs, retain the single draft/dispatch identity, correct source through review, and reconcile only; do not create another invoice. Then reconcile existing business totals and record evidence in canonical H20 note.

Rollback: stop task257 while changing source/functions; retain all jobs, dispatch markers, invoices, tax setup evidence and receipts. Suspend only the new protected tax-map file/entry (retain its backup); empty mappings block VAT while existing no-VAT mappings stay intact. Restore prior function definitions/source only with no running work. Do not clear uncertain dispatch or delete existing financial records, credentials, schemas or custody history. Any tax-setup reversal that would rewrite existing records needs separate review. Never activate production or custody.

Estimate after source validation: 2–4 focused engineering hours for controlled TEST setup, provider-contract qualification and reconciliation, plus owner/provider waiting time. This is a range, not completion evidence.

Decision: CONDITIONAL PASS for source preparation and isolated tests; NO-GO for hosted VAT activation or T19 closure until native CI, provider qualification and exact financial-write approval are satisfied.


## Approved TEST setup and actual API qualification follow-up

Owner explicitly approved TEST VAT setup and one new R115 inclusive draft. Zoho Shalean TEST accepted fictitious4000000000, labelTEST VAT Number, registration/first return2026-10-01, accrual/custom. No SARS lookup, real registration or existing invoice change. Zoho generated ordinary Standard Rate15% ID1589458000000110095. Exact-detail GET returned403/code104003 with the restricted grant; documented paginated list GET returned200, complete. Actual tax has type tax, status Active, no special type, and omits is_value_added. Pinned organisation list read confirms country_codeZA, active/ZAR.

The candidate therefore uses the already-permitted paginated tax list, selecting only the exact pinnedID/name after complete bounded pagination; duplicate/malformed/incomplete lists are held. It requires current exact organisationZA/ZAR/active and the operator-verified saved policy. Missing is_value_added is accepted only under this SA qualification; explicit false, special/compound/inactive/wrong tax remains denied. No role or OAuth expansion is required. Tests now reproduce actual sparse metadata/status casing and cover page bounds, ambiguity and foreign/missing country denial. This supersedes the earlier exact-detail endpoint assumption; provider VAT invoice receipt is still unverified.
