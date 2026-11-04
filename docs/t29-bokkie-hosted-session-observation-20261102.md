# T29 — Bokkie manager hosted session read-only observation (2 November 2026)

Connected Browser list_tabs and get_tab_context detected an authenticated `https://staging.faraios.com/dashboard?business=0cc3f518-d64e-40c2-8817-bc14d1ef1420` tab, titled `Bokkie · FaraiOS staging`.

The page states “Verified staging account,” identifies the selected workspace as Bokkie, role `manager`, and says “1 business in this view.” In the accessible page content, the business selector contains only Bokkie and All businesses, not Shalean. This is a permitted Bokkie view and a useful UI inventory check, not proof of an unauthorised cross-business database or API denial.

Browser connector in this session supports tab listing and read-only page context; it cannot navigate the user's signed-in session to a denied URL or issue credentialed API fetches. No access token, session cookie or private details were extracted or recorded. No browser actions, database writes or external financial/notification operations performed.

**Remaining:** independently verify a direct Shalean-targeted read using the authenticated Bokkie-only session and demonstrate actual HTTP 403/404/empty authorised result (as appropriate) plus database RLS denial; use a Shalean-authorised comparison session. Then offline no-egress workflow and rollback check. T29 remains In progress; PR #306 Draft, T30 Not started.
