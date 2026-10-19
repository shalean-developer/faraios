# UI-01 — Browser acceptance and corrections

19 October 2026. Owner confirmed the pull/restart/sign-in with “Ready”. Real owner-session Chrome inspection observed PR56's new shared workspace shell and interfaces, corresponding to merged source `908ba7e665e2eefd0ebf138c9f063bba37dff9b4`. There is no runtime SHA endpoint; behaviour and owner confirmation do not independently measure the process SHA. FaraiOS staging only, owner-PC port 3101. T18 remains unstarted.

## Observed acceptance

| Area | Evidence |
|---|---|
| Workspace / business scope | Shared desktop sidebar and mobile Menu worked; current module highlighted; Account → Switch business and the Business view selector navigated from Shalean through All businesses to Bokkie. Each selected workspace retained its own records and settings. |
| Bookings | Shalean search produced 0 of 6 and the clear-filter/empty state. New booking opened separately; empty Customer validation focused/opened the control, selecting a saved customer and Regular service advanced to the correct scope/extras/address form without saving. Bokkie Completed filter returned 1 of 4; the original completed R410 booking opened with its saved scope and price lines. |
| Customers / addresses | Shalean contact and existing-address editors fit mobile and desktop; addresses opened with distinct labelled fields. Bokkie list and focused Add customer fitted both widths; empty submission focused `customer-name` and was prevented. Cancel returned to the list. |
| Services / Extras | Both businesses' lists fitted desktop/mobile. Shalean service/extra editors and expanded allowed-extras controls fitted 390×844. Add service validation focused Name; Office profile preview loaded appropriate fields without creating a catalogue item. Cancel restored the six-item service list. Bokkie Add extra omitted service-only controls, fitted both widths, prevented an empty submission and cancelled back to Extras. Each business's 19-item Extras list remained available. |
| Recurring | Both-business lists and Shalean agreement/created-visit detail fitted the tested widths. Existing cancelled schedules and cancelled generated visits remained visible, with their saved rates and history guidance. No recurrence action was submitted. |
| Staff / teams | Both-business staff lists fitted desktop/mobile. Shalean Teams and the labelled inactive T15 QA team editor fitted desktop/mobile, including the member checkbox and inactive status. No staff/team save or access change. |
| Settings / Calendar | Shalean Settings time picker opened/cancelled retaining its value; timezone dropdown opened and dismissed. Bokkie Settings and both-business Calendar fitted both widths. On Shalean mobile the Starting date dialog lay within the viewport: left 34.7 / right 364.7, top 451.6 / bottom 820.3 in 390×844. Cancel closed it. |
| Responsive measurements | [Raw DOM measurements](ui-01-browser-checks-2026-10-19.json) record 45 page/viewport states: desktop 1280 pixels wide and mobile 390×844. Every document scroll width was ≤ viewport width, with no measured main control/link extending horizontally. These are focused states, not 45 separate end-to-end journeys or an exhaustive accessibility/device audit. Temporary viewport override was reset. |

Only read/navigation, unsaved form choices, native invalid submissions and the non-persisting service-profile preview were used. No booking, customer, address, catalogue price, setting, team, membership, recurrence schedule, finance or communication mutation was submitted. Personal-data screenshots were inspected internally and were not saved in the repository. Occasional browser automation navigation timeouts were resolved by fresh DOM reads; they were not counted as application failures or blindly retried.

## Findings and bounded corrections

1. **Keyboard skip target:** the visible focus outline worked, but activating Skip to content left focus on BODY. Add `tabindex="-1"` to `main#main-content` in both renderers so keyboard activation can move focus into the content.
2. **Action width:** the desktop Bookings Open link wrapped into “Op/en”. Prevent word breaking and widen list action columns from 64px to 76px, and the generated-visit action column to 120px. Existing mobile grid overrides remain.
3. **Presentation consistency:** use the existing en-ZA/ZAR formatting for recurring amounts and singular labels for one schedule, staff profile/team and team member. No amount or business rule changes.

The five-file correction changes presentation and the skip target only. Independent preparation review: CONDITIONAL PASS, no blocking code issue; syntax/whitespace and 45 focused tests passed. Exact-candidate CI and owner-PC confirmation of these corrections are still required.

## Remaining acceptance gate

After the correction reaches main and the owner pulls/restarts the staging client, verify: keyboard Skip to content focuses `main#main-content`; Open/visit actions stay on one line; corrected currency/count labels display; desktop/mobile lists and a picker still fit. Record the result and an independent closure opinion before closing UI-01 or starting T18. The broad PR56 checks above need repeating only where a correction or failure warrants it. Production and foundation approval remain separate.
