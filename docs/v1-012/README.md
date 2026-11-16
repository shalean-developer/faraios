# V1-012 — financial safeguards acceptance

16 November 2026. Verification-only change; no financial application or SQL repair reproduced. Do not deploy this branch or run the one-use hosted operator again. No merge or main change.

Six focused native PostgreSQL/PHP methods pass: concurrent booking invoice creation, consecutive unique invoice numbering and stale issue rejection, exact 53050 total/partial/full balances, competing payments below outstanding balance, append-only linked reversals and a single replacement chain, and role/tenant/direct-write denials. These use disposable synthetic data.

Hosted synthetic owner A/live acceptance exercised four concurrent invoice creation requests to one ID, four same-key payment requests to one receipt, changed-key/duplicate/overpayment rejection, the actual owner PHP remainder-payment form, four concurrent retries for each reversal and one concurrent replacement child. Original issued/void documents, receipts, booking agreement and linked events are retained. No real payment transfer or customer communication. Sanitized receipt is in live-verification.json; private full snapshots stay on the host.

All pre-existing synthetic A/live rows in twelve tables/views, A/preview invoice/payment/event/schedule rows, and all web/config bytes are compared before/after. Other tenants were not written. Existing V1-003, V1-004, V1-022, SEO/public/dashboard overlays are hash guarded. No delegated access activation or authorization changes.

The one-use CLI operator is review evidence, stored outside the web root with private permissions, explicit synthetic project/business checks, phase guards and no blind replay. It creates fictional accounting records and retains their history. It does not install code or schema.

## Acceptance mapping and limits

| Live task criterion | Evidence |
| --- | --- |
| Issued originals and payment reversals remain traceable | Native method05; hosted corrections phase retains both original receipts, adds exactly two linked reversals, preserves the void original and booking agreement, and creates one linked replacement child/event under concurrent requests. |
| No duplicate active invoice or overpayment on retry | Native methods01/03/04; hosted concurrent create and same-key receipt retries, casefold duplicate and changed-payload rejection, full-balance overpayment rejection, and one active replacement. |
| Invoice numbering, totals, balances, reversals and duplicate prevention | Native methods02–05 verify four unique consecutive numbers, a competing-payment race and exact balances. Hosted total53050, partial20000/balance33050, PHP remainder33050/Paid0, net0 after reversals, replacement27525 with a new number. |

This is bounded engineering acceptance of the three recorded V1-012 criteria, using the existing synthetic tenant. It is not independent enterprise QA, financial policy approval or permission to launch. Sustained production behavior outside the tested population is not claimed. The v1.0.0 release remains on hold for its other blockers. No physical-phone test or new hosted delegated access is claimed.

Hosted evidence cutoff:2026-11-16T17:50:26Z.194 successful checks,0 failed checks. Original four schedules263/265/264/266 remain active; the unsaved one-time form was cancelled. Full private evidence remains at v1012-live-20261116/state.json and final.json outside the public web root; secrets and raw history were not exported.

## Recorded closure

Live V1-012 is Verified with all three acceptance items checked. Refreshed overview15/30 verified,13 open blockers, launch HOLD. Both source and current-main compatibility gates PASS39 suites/135 reported methods. Exact source b90e7903 Foundation43922818703, database backup43922818850 and private configuration recovery43922818783 all success. PR78 remains draft/unmerged, stacked on PR77; main4cea37e unchanged. Later evidence-only commits do not modify runtime/test code or replace that tested source.
