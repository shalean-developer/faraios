# T28-EXCEPTIONS-01 — Owner-approved mapping-only transition

Date: 2 November 2026. Decision status: **APPROVED by the business owner**.

## Authorized disposition
1. Preserve the original Shalean Paystack transaction labelled as a booking payment that has no independently verified matching booking. Preserve the existing gateway reference, expense relationship, current status, and all source evidence. Do not attach a guessed booking, mark settled, refund, create an invoice, or rewrite an allocation. Retain in the Shalean legacy source under owner-managed financial review.
2. Preserve the original Shalean booking linked to a valid Auth identity but without an independently verified CRM customer relationship. Keep the original Auth link and booking source evidence; do not create or attach a guessed CRM customer, merge customers, or expand customer portal access without independently established identity. Retain in Shalean legacy source under owner-managed office review.
3. Independently verify source/provider, financial and customer identity evidence before any future correction or cutover. Preserve customer obligations and existing access constraints. Do not infer resolution from retention approval.

## Boundaries
This is solely a T28 mapping and transition decision. Neither exception has been repaired, reconciled, migrated, or settled. Provider reconciliation, backup recovery and executable identity/type crosswalk validation remain separate future verification conditions, not passed tests. No production source or staging data mutations, no permissions changes, no merge or deployment, and no T29 authorization.

References: docs/t28-final-exception-disposition-proposal-20261102.md; T28-SHA-LEG-01; T28-RET-OWNER-01. T28 remains **In progress** pending final verified acceptance coverage and explicit staging acceptance; T29 remains **Not started**.
