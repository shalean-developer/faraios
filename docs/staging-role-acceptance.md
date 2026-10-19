# Separate staging role acceptance — 19 October 2026

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
