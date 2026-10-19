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

Focused checks passed: 48/48, including new owner/manager HTTP assertions for active scoped navigation, escaped search input, status/search filtering, separate creation screens, retained customer/service identifiers and read-only GET behaviour. Existing catalogue round-trip tests cover all six configured profiles and extras. Syntax and whitespace checks passed. The full local suite passed 115 tests with one explicit independent-PostgreSQL-connection skip (116 total, zero failures). CI must execute that test against two real PostgreSQL connections. Independent preparation review found no blocking code issue and returned CONDITIONAL PASS for preparing/merging this update, with final desktop/mobile acceptance NOT ASSESSED. The non-blocking stale overview copy was corrected to direct users to the existing Bookings module; no dashboard total is invented.

Real owner-PC acceptance of this new UI is pending. The old staging session expired during inspection; no new UI screenshot or desktop/mobile success is claimed. After the owner pulls main, restarts `npm run staging` on port 3101 and signs in, verify both businesses at desktop and 390×844: sidebar/mobile menu, Bookings list/search/status/New booking, customer selection → service selection, customer list/Add/edit/address disclosure, Services/Extras list/add/edit/cancel/profile sections/dropdowns, Recurring list/detail and Settings/Calendar pickers. Check for horizontal overflow and restore the normal viewport. Do not save prices/settings or create bookings merely to verify layout.

Preparation gate: CONDITIONAL PASS, subject to clean CI on the exact final candidate, owner client update/sign-in, and the browser checks above. Engineering owns CI and the update; the acceptance reviewer records browser evidence before UI-01 closure. Reassess material candidate changes or any browser failure. Final UI acceptance remains NOT ASSESSED; T18 stays unstarted. Production and foundation gates remain separate.

## Update and recovery

This is an application-only update. Pull the merged main branch in the owner's existing FaraiOS checkout, stop the running staging process, run `npm run staging`, then sign in. No migration command is required. For a UI regression, restore the previous application version and restart; existing data and booking agreements need no rollback.
