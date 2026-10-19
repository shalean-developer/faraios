# UI-01 — Existing module consistency before T18

Owner instruction, 19 October 2026: fix the older one-off Bookings screen shown in the supplied screenshot and other unfinished module interfaces, including Services and Extras, before beginning T18. Baseline: main `ebc23e0d5e3274e95ff02f9e3169d3a12efbcbd3` after T17 closure. This follow-up does not reopen T17's evidenced recurrence behaviour or begin quotes/conversion.

## Intended result

| Area | Change |
|---|---|
| Shared workspace | The same role-filtered business navigation, active location, account controls, page hierarchy and keyboard skip link across existing modules. Mobile navigation remains a labelled disclosure. |
| Bookings | Compact customer/service, date/time, team, status, total and Open rows. Search and status filters apply to the latest 200 scoped bookings. New booking opens a focused customer → service → details flow, retaining the existing GET/POST contracts. |
| Customers | Compact contact/status rows and scoped search/status filters. Add customer opens separately from the list. Contact/address fields use grouped grids; private address instructions and the Add address form use disclosures. |
| Recurring | Compact agreement/frequency/status/rate rows and generated-visit rows; shared status badges, headings and weekday controls. Generation and schedule mutation contracts are unchanged. |
| Services, Extras, Staff and Teams | Shared module headings/actions and navigation, compact comparison rows that adapt to the available width, existing category tabs, filters and focused editors. Saved configuration parsing and owner-only actions remain unchanged. |
| Settings and Calendar | Shared workspace shell; grouped business/working-hours controls, consistent headings and actions. The existing calendar agenda, pickers and availability workflow are retained. |

No database migration, tariff change, business data correction, new account, notification or financial action is included. Source queries remain business-scoped; menu visibility is not an authorisation boundary. Servers still revalidate membership for every request and independently enforce each destination's policy. Existing parsers, mutations, RLS and optimistic versions remain authoritative.

## Verification and current gate

PR56 implemented the shared module UI and merged as `908ba7e665e2eefd0ebf138c9f063bba37dff9b4`. Focused checks passed 48/48, including owner/manager HTTP assertions for active scoped navigation, escaped search input, status/search filtering, separate creation screens, retained customer/service identifiers and read-only GET behaviour. Catalogue round-trip tests cover all six configured profiles and extras. Full CI passed 116/116 with zero failures or skips, including the independent-PostgreSQL-connection test. The local run's explicit database skip was not substituted for that CI evidence. Independent preparation review returned CONDITIONAL PASS, with browser acceptance then NOT ASSESSED.

Real owner-PC browser inspection of PR56 is recorded in [UI-01 browser evidence](ui-01-browser-acceptance.md), including 45 measured page/viewport states and both-business interaction checks. It found skip-link focus and a wrapping Open action. PR57's five-file correction also aligns recurring currency and singular labels; it merged as `8caefdc166f301a8480db2773af30f46f94821a4`. Both exact-head CI jobs passed 116/116 with zero failures/skips, including independent database connections; GitGuardian passed. Independent correction preparation review found no blocking issue and retained a focused browser-recheck condition.

The owner confirmed the updated staging app on 19 October at 21:30 SAST. The focused recheck passed: actual keyboard activation focuses MAIN#main-content in both renderers; row actions stay on one line; corrected currency/count labels display; 11 additional page/viewport states and the mobile date picker fit. [Raw final checks](ui-01-final-checks-2026-10-19.json) contain 17 evidence entries without personal customer details. No saved business-data mutation was submitted. The normal viewport was restored. Runtime source identity is supported by owner confirmation and observed corrections, not an independently measured process SHA.

Current gate: UI-01 closed as delivered for the bounded staging UI scope. Browser acceptance is verified and [independent QA closure](ui-01-independent-qa.md) returned PASS, satisfying the former preparation conditions without erasing that history. T17 stays Done; T18 — Quotes and conversion — is next and remains unstarted. Production, hosting, foundation, migration and financial approvals remain separate.

## Update and recovery

This is an application-only update. Pull the merged main branch in the owner's existing FaraiOS checkout, stop the running staging process, run `npm run staging`, then sign in. No migration command is required. For a UI regression, restore the previous application version and restart; existing data and booking agreements need no rollback.
