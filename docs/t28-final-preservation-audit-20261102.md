# T28 — Final preservation audit and conditional acceptance gate

Date: 2 November 2026. **NOT an unconditional acceptance report.** Read-only evidence only; neither legacy data nor FaraiOS staging records were migrated or changed.

## Verified source storage inventories
Connected Shalean Supabase project `paqjwfulwywtsyyvdxrq` read-only bucket/object metadata:

| Bucket | Public flag | Objects | T28 treatment |
|---|---|---:|---|
| blog-media | true | 20 | Retain website media in Shalean legacy |
| booking-service-photos | false | 20 | Retain private booking evidence and original access controls |
| campaign-media | true | 1 | Retain marketing source |
| expense-receipts | false | 0 | Retain original storage configuration and permissions |
| plesk-releases | false | 1 | Retain technical deployment/recovery evidence |

Total 42 objects across five buckets. Bokkie owner-supplied `scsrxogumimsrtbnqeas` metadata: one public `blog-images` bucket, 24 objects, retained on legacy website under T28-BOK-DEV-01. Bucket counts do **not** establish object retrieval, RLS correctness, backups, or restore success.

## Accepted T28 mapping decisions
- T28-BOK-DEV-01 development-stage retention, T28-BOK-REC-01 historic recurrence, T28-SHA-REC-01 active Shalean recurrence, T28-SHA-LEG-01 Shalean legacy retention, T28-BOK-CREDIT-01 preserve R64.75, T28-BOK-QUOTE-01 preserve 15 historical high quotes, T28-RET-OWNER-01 common accountable owner.
- Shalean 245 public source table names provisionally classified; Bokkie 43 source tables owner-supplied and classified. Source-to-target families documented in the T28 crosswalk. Names and representative fields do not prove exhaustive field transformations.
- Shalean 122 of 123 payment rows without booking_id map to monthly invoice/sales documents. One Paystack-labelled booking payment has no verified booking target; one booking has Auth identity without independently established CRM match. Preserve both as exceptions; no speculative write.
- Bokkie 15 large pending quotes retained, including one possible contact-based booking match; no accepted price/revenue inference. R64.75 one-account credit balance retained with historical +R50 ledger gap; no automatic payment/credit operation.

## Conditional acceptance checklist
| Gate | State | What remains |
|---|---|---|
| Canonical scope, dependency, owner-approved decisions | Verified | T27 Done; T28 acceptance still pending |
| Source table-name inventory | Verified | Shalean 245/245, Bokkie 43/43 (owner-provided) |
| Major V1 source-to-target record-family crosswalk | Documented / partial | Complete exact ownership/status/field conversions for any required unmatched family |
| Historical/active/future recurring preservation | Policy approved | Future cutover must be independently authorised, never generate duplicate visits |
| Retained storage metadata | Verified inventory | Object access/backup/recovery proof not established |
| Financial/provider reconciliation | Incomplete | Provider evidence and outstanding obligation crosswalk still required; do not claim settled funds |
| Exceptional CRM and Paystack links | Preserved with evidence gaps | Independent verified relationship or explicitly final agreed servicing/review disposition |
| Retained-source recovery and custody | Owner accountability approved | Actual backup existence, private retrieval and recovery evidence; technical custodians remain unconfirmed |
| No-change/source preservation | No intentional writes in T28 tools | No full before/after source fingerprint / restore evidence |
| T28 staging acceptance | Not requested | Must not mark Done until requirements met and owner explicitly accepts |

## Explicit limits
No source or staging data imports, restores, deletes, updates, payment/credit calls, worker activations, website changes, or T29 work performed. All historical evidence retained; no claim that backup recovery succeeded. **T28 remains In progress.**
