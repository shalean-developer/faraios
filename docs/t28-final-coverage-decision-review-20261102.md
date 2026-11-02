# T28 — Coverage decision and acceptance review (2 November 2026)

## Canonical test
T28 only requires comparison of existing Shalean/Bokkie features and all record types with FaraiOS V1, with **every required feature mapped or transition agreed**. It does not require imports or live restores. T27 Done; T28 In progress; T29 Not started.

## Supported coverage
- Source families: Shalean 245 public tables (direct read-only table inventory, provisional classification); Bokkie 43 tables (owner-provided SQL). All names included, but not every table has verified individual field transformation.
- Core T01–T27 V1 destination families mapped: customers/addresses, catalogues, quotes, bookings/recurrence, staff, invoices/Zoho, Paystack/EFT, earnings/payouts, portals, notifications, reports and access boundaries. Mapping is a planned contract, not executed transfer.
- Approved transition: SHA-LEG-01 for Shalean retained legacy website/non-V1 data; BOK-DEV-01 for development-stage Bokkie non-V1 data; SHA-REC-01 and BOK-REC-01 for recurring history and ongoing service; BOK-CREDIT-01 for R64.75 credit liability; BOK-QUOTE-01 for 15 large pending quotes; RET-OWNER-01 for accountability.
- Source storage enumerated: Shalean 5 buckets/42 objects, Bokkie 1 bucket/24 objects. Owner-accountable retention applies. No restored backup or object retrieval test.
- Shalean finance: 89 monthly invoice and 33 sales-document transactions have correct document links; one booking-labelled unmatched payment retained. One separate booking missing CRM link has verified Auth ID, not independently verified CRM relationship.

## Specific open mapping/transition gaps
| ID | Required family | Status | Required evidence/decision | Owner |
|---|---|---|---|---|
| V01 | Shalean polymorphic payments | Partial | Explicit final exception treatment for one Paystack-labelled booking transaction with unmatched entity, plus provider settlement mapping | Shalean financial owner |
| V02 | Shalean customer relationship | Partial | Explicit final mapping exception for one Auth-linked booking lacking verified CRM link; customer-history access must remain blocked without proof | Shalean office owner |
| V03 | Financial amounts and provider origins | Partial | Define reconciliation by source and provider for historical invoices/earnings/payout/credits; no settlement claim from status alone | Each financial owner |
| V04 | Bokkie live operational records | Partial | Owner-provided schema covers key tables; remaining exact FK/identity/quote relationship checks or approved hold-in-source disposition for unmatched records | Bokkie owner |
| V05 | Legacy asset recovery | Dependency | Verified access and recovery expectations for both retained sources; backup availability not proven, no restore in T28 | Accountable owner |
| V06 | Remaining source table families | Partial | Confirm each required source family is direct-map or retained under approved business policy, with obligations identified; provisional names alone insufficient | Each business owner |
| V07 | Source-to-V1 key crosswalks | Partial | Verify old text/UUID keys, money/date/status transformations and record ownership per required family; final executable crosswalk intentionally not created | Technical mapping owner |

## Decision boundary
Do not declare these gaps as fixed or pass a financial/identity record based only on a preservation policy. A proposed final exception decision may **retain** records under current legacy authority, while requiring separate verification before any future cutover; it must be explicit for any still-required feature. Recovery and provider reconciliation may be reserved as cutover prerequisites only if full T28 transition treatment is otherwise agreed and the evidence is honest.

## Gate result
**NOT READY FOR UNQUALIFIED T28 STAGING ACCEPTANCE.** Name inventory complete; several required mappings/exception dispositions remain provisional. No source mutations, backup restore, payment dispatch, new functionality or T29 actions were performed. Request only necessary owner choices after source evidence is classified.
