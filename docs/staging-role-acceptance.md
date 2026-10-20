# Separate staging role acceptance — 19 October 2026

20 October follow-up: the real Bokkie-only manager dashboard was observed again. Chrome still blocked the direct Shalean request with ERR_BLOCKED_BY_CLIENT before an application response could be established. This is a browser observation, not proof of HTTP403. The operator-run verifier below is prepared to obtain real local HTTP evidence; it does not itself close T08–T10 until actual results and independent acceptance are recorded.

## Local HTTP verification

`scripts/verify-staging-access.mjs` connects only to `http://127.0.0.1:3101`. Start the existing FaraiOS staging server first. Run the helper in a second interactive terminal with public `--role`, `--business`, `--denied-business` and `.test` QA `--email` arguments. Enter the existing staging QA password privately at the hidden prompt; it is never accepted in arguments, printed or saved.

The helper verifies the staging login marker, creates its own short-lived app session, checks the exact server-rendered role and single-business selector, permitted dashboard/module reads, foreign-business denial (including a client-supplied role claim), and denial of owner-only business settings. Staff checks deny all office modules and verify the own-assignments/earnings dashboard wording; actual cleaner job/earnings portals remain later tasks. These reads do not test financial writes or prove every record-level action.

Only its own login/logout are POSTed. The helper does not modify business data, inspect browser sessions, access credential files, invoke Zoho or alter Chrome protections. All requests have bounded timeouts and manual redirects. Reports include fixed check names, HTTP status codes/booleans and cleanup outcome, never cookies, passwords, redirect contents or page bodies. It attempts its own logout with a fresh timeout after failures/cancellation and checks local session invalidation. A lost login response or failed cleanup is explicitly unconfirmed and cannot pass; no global-session revocation is claimed.

Generic invocation (replace only the public fixture values):

```text
node scripts/verify-staging-access.mjs --role=manager --business=<allowed-business-uuid> --denied-business=<foreign-business-uuid> --email=<manager-qa-address.test>
```

The existing browser session is independent of the helper's new session. Keep raw terminal/network captures private; the helper's JSON result is designed for evidence review. Preparation/fixture tests are separate from actual owner-host results and live database RLS evidence.

## Earlier evidence

Environment: local port 3101 connected to FaraiOS staging xdmfyrsauvqznkloroxg. Only synthetic QA identities and staging business records were used. User privately created passwords and signed in; no password was read by the agent.

## Cleaner QA identity

Confirmed Auth account and active Bokkie-only staff membership. Separate Auth session observed at 01:31:44 UTC. Browser showed Bokkie as the only business, My assignments and My earnings, and no Finance, Business settings or Team access controls. Sign out returned to login.

## Manager QA identity

User reported sign-in at 03:36 SAST; browser and Auth session verification confirmed the separate manager account. Both combined and selected Bokkie views showed Bokkie only. Navigation showed Customers, Bookings and Finance (Planned), without Business settings or Team access. Wording matched the approved permission split: view finances, manage invoices and record payments. Actual invoice/payment actions are not implemented and were not claimed as tested.

## Shared evidence

Mobile menu previously passed click open/close and keyboard open at 390 x 844, with logo left, burger right and no horizontal overflow. Live SQL RLS assertions for each QA identity confirmed only Bokkie was readable. Earlier owner-session tests verified membership suspension and logout. Local HTTP tests cover direct foreign-business 403 responses using a simulated authentication provider.

## Remaining limitation

Browser navigation to the restricted Shalean business URL reports ERR_BLOCKED_BY_CLIENT. This does not prove the application's real HTTP status or denial body. The live direct-link response remains unverified; do not close that criterion merely because the selector excludes Shalean. No browser security restriction was bypassed.

Decision: PASS for separate manager/cleaner sign-in and visible role scopes; CONDITIONAL PASS for full T08–T10 acceptance pending a directly observed real cross-business response. T11 full backup recovery remains independently open. Existing production systems unchanged.
