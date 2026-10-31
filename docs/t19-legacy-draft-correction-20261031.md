# T19 legacy staging draft correction — prepared, not applied

Scope: the owner identified the R875 legacy booking as entirely fictitious staging data on 31 October 2026. T19 remains In progress; T20 remains Not started. No production actions or provider writes are authorised by this document.

## Verified audit

Invoice bd057ce5-6a28-4980-9269-1938def96ad9, Shalean business 612be091-b1d7-4911-9c3b-143446a9fe27, version 1, created 20 October, draft/not_synced; booking c11a5926-ec0d-487c-b22a-d87013933e56 is completed. Both tax snapshots are null. Booking and invoice price lines agree. No approval job or provider/customer binding exists.

| Saved line | Cents | Unit | Identity |
|---|---:|---|---|
| Office Cleaning | 30000 | visit | catalogue |
| Kitchen | 20000 | visit | catalogue |
| Service fee | 0 | visit | derived |
| Office size: Medium: 6–20 desks | 30000 | option | derived |
| Bathrooms: 1 | 0 | each | derived |
| Office-assessed additional work / equipment | 7500 | assessment | derived |

Total 87500 cents/ZAR. Current VAT policy is disabled/version 1, recorded 21 October with owner reason confirming no VAT registration. This later policy alone does not establish the missing historical invoice tax evidence.

Live trigger audit.capture_invoice_change rejects agreement mutations; audit.freeze_booking_vat rejects tax mutation. There is one invoice per business/booking. Do not disable triggers, delete/recreate the invoice, backfill nulls from today's policy, duplicate the booking or silently replace its saved agreement.

## Concrete correction proposal

After owner confirmation that this fictitious R875 agreement is non-VAT: keep customer, date, all six lines, total and original snapshots unchanged. Record a separate append-only owner tax attestation linked to business, invoice ID, version and SHA256 of the original snapshot, with owner/session identity, timestamp and explicit reason. Proposed effective tax: enabled=false, customer_total, rate_bps=0, net_cents=87500, vat_cents=0, total_cents=87500, VAT number/registration date null. Mark it as a later correction, never as evidence captured on the original date.

The SQL review, checked approval, worker claim and receipt validation must consume the same effective snapshot and attestation digest atomically. Approval must bind that digest; a changed or withdrawn attestation invalidates approval. Continue to preserve original immutable snapshots. Do not implement a worker-only override or server-file tax override. Pending work: table/function/UI source, isolated native SQL permission and concurrency tests, rollback and exact migration review. No tax-attestation migration has been prepared or installed yet.

## Mapping source prepared

Version 1 protected catalogue mappings remain compatible. Version 2 additionally requires invoiceLines on every connection. Each entry has invoiceId, lineIndex, lineDigest and itemId. lineDigest is SHA256 of recursively key-sorted complete saved line JSON via standardInvoiceLineDigest. A derived mapping matches only this exact invoice, array position and line contents, under existing business/environment/connection/generation/org/domain pins. A stale digest stops before a provider read; no name-only or automatic item creation fallback. Provider item name, unit, active/sellable/non-VAT checks remain. Positive-quantity zero-value lines also require mappings, preserving the saved six-line agreement.

Runtime rollout will need existing TEST items for the six exact names/units and a matching TEST contact. Discover read-only before proposing creation. Creating missing items/contact/invoice needs the owner's exact external-write approval. Do not reuse the R100 synthetic customer because its name differs.

## Acceptance and rollback

Native tests must prove owner-only attestation, foreign business/manager/expired-session denial, stale version/hash denial, no implicit historical VAT inference, immutable originals, unchanged 87500 total, approval/attestation race denial and receipt agreement. Provider acceptance: one explicitly approved TEST draft, all six mapped lines, correct customer/date/unit/net/VAT/total; exact reference count one; no send/payment; retry/interruption never creates a replacement.

Source mapping rollback: restore version 1 parser/source and preserve protected mapping backup. No provider records or original data are deleted. If correction is withdrawn after dispatch, block new creation and reconcile the existing external identity only. Estimate: one to two focused engineering sessions for attestation/UI/native SQL tests and staging verification; excludes owner response and provider item setup. No completion claim from mapping unit tests alone.

## Owner direction and implemented candidate update

The owner authorised making this fictitious R875 draft visible in Zoho TEST regardless of its unspecified original VAT selection. The chosen correction is non-VAT under the currently disabled Shalean policy, total unchanged. This is a later explicit test decision, not historical VAT evidence.

Implementation candidate supersedes the effective-overlay proposal above: restricted append-only test_tax_corrections stores the complete original and corrected snapshots, original version, owner, reason, timestamp and transaction ID. An owner/session-checked RPC adds only missing invoice tax under a staging enrollment and disabled VAT policy, before any approval, binding or dispatch. The invoice audit trigger permits only this exact recorded, same-transaction tax-only amendment and logs old/new records. Booking tax remains untouched; existing agreements still reject arbitrary changes. Version advances once, so the existing checked approval and worker use the corrected invoice consistently. No trigger is disabled in deployed code.

Owner HTTP form requires explicit fictitious/no-VAT confirmation and reason; strict Origin, form shape and withOwner checks apply. Source candidate only: not yet installed, deployed or applied. Isolated SQL test proves correction and unchanged amount/original retention, manager/foreign/stale/changed-total/unconfirmed/current-VAT-on/replay/direct-edit denial and corrected draft sync through existing pipeline. Mapping extension and HTTP tests also pass. Provider customer/item setup and R875 external creation remain unexecuted.
