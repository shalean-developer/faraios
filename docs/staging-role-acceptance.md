# Separate staging role acceptance — 19 October 2026

## T08–T10 staging closeout — 20 October 2026

Independent outcome **QA-ACCESS-T08-T10-ACCEPTANCE-20261020 v1 — PASS** supports marking T08, T09 and T10 Done for their bounded staging criteria, dated 20 October 2026. A separate read-only reviewer assessed the evidence using shared AI tooling; that limitation remains disclosed. The owner supplied the manager's complete 31-check PASS at 16:22:26 SAST and the explicitly shared cleaner's complete 35-check PASS at 16:34:27 SAST; both reports have `passed:true` and cleanup `PASSED`. The shared profile was introduced in merged PR77 (`6f7c02e8`); no running-process SHA is independently attested by these reports.

The manager's selector exposes only Bokkie, its own dashboard/eight office modules return HTTP200, and the Shalean dashboard/eight modules plus owner settings return HTTP403. The shared cleaner's selector exposes exactly Bokkie and Shalean; both selected dashboards return HTTP200 with staff role and assignment/earnings wording. Both sets of owner settings and all eight office modules return HTTP403. A supplied owner role cannot elevate access. Both helpers logged out their own sessions and verified redirect to login using their invalidated cookies. Retained owner-switching, mobile and live RLS evidence supports the combined result.

No further manager/staff rerun is required for this acceptance. The earlier request failure did not recur and its cause remains unknown. This is independently reviewed owner-host local STAGING evidence, not reviewer live replay or production approval. Future cleaner/customer record-level portals, T11 full recovery, T04 policy and production hosting/environment/security gates remain separate. T19 activation stays held; T20 remains unstarted. Reassess after relevant access, membership, authentication or environment changes, contradictory evidence or recurrence of the failure.

## Historical 16:22 manager result and shared-staff preparation

At 16:22:26 SAST the owner supplied a complete successful manager rerun using the helper from main `8f8ec5a`. All 31 reported checks passed; `passed` was true and cleanup was `PASSED`. The Bokkie-only selector, verified manager role and Bokkie dashboard passed. The Shalean dashboard returned HTTP403 despite a client-supplied owner role. Bokkie owner-only settings returned HTTP403. Customers, bookings, catalogue, staff, quotes, recurring, calendar and invoices each returned HTTP200 for Bokkie and HTTP403 for Shalean. Logout and the same helper session's post-logout redirect to login passed. This is owner-supplied local STAGING HTTP evidence, not an agent live replay or a verified server process SHA. No business writes, payment actions or Zoho calls were exercised.

The earlier `OWN_QUOTES` transport/body failure did not recur: the complete Bokkie quotes response returned HTTP200 and later modules passed. Its original cause remains unknown; a successful rerun is not a root-cause fix claim. Keep that partial run below as history. The manager boundary criterion now has real HTTP evidence. Current shared-staff acceptance and final task-level independent acceptance remain separate; T11 recovery, T04 policy, T19 provider hold and later record-level cleaner portal tasks are unchanged.

The shared-staff verifier profile uses `--role=staff --business=<first-authorised-uuid> --shared-business=<second-authorised-uuid> --email=<staff-qa-address.test>`. It requires the exact two businesses in the selector, staff role and assignment/earnings wording on both dashboards, denied owner settings and all eight office modules in both businesses, and its own logout/invalidation. The second dashboard and module/settings requests include `role=owner` to check that client claims cannot elevate staff. Shared mode cannot be combined with `--denied-business` or manager mode. It does not treat either authorised business as foreign, change membership or create a new account. Existing single-business manager/staff profiles retain their foreign-business checks. Actual shared-staff operator evidence is pending; fixture checks are preparation only. Assignment/earnings dashboard wording does not prove future cleaner record-level views.

## Earlier 16:09 operator result and diagnostic follow-up

At 16:09 SAST the owner supplied the manager verifier result after pulling main `e469ddd`. Login, exact Bokkie-only selector/role, Bokkie dashboard, direct Shalean dashboard denial (with a client role claim), owner settings denial, Shalean customers/bookings/catalogue/staff/quotes denials and permitted Bokkie customers/bookings/catalogue/staff reads all passed with actual HTTP responses. The run then stopped with `REQUEST_FAILED` before an `OWN_QUOTES` result. The original report cannot distinguish a deadline, connection or incomplete-body failure; no cause is established. Later recurring/calendar/invoices checks did not run. Its own sign-out and post-sign-out redirect checks passed; cleanup was `PASSED`, overall result was false.

The follow-up adds fixed request check names, HEADERS/BODY phase, a nullable received HTTP status, elapsed milliseconds and the deadline to failure reports. Only the helper's own expired deadline is labelled `REQUEST_TIMEOUT`; arbitrary transport error names/codes/messages remain private. Main-request and cleanup failures are recorded separately. A received status with an incomplete body cannot become a passing read. The default ten-second helper deadline, fixed loopback destination, access criteria, fail-fast behaviour and independent cleanup stay the same; no automatic retry is added. This is diagnostic preparation, not an application root-cause fix or a completed operator rerun. T08–T10 remain in progress; shared-staff checks and T11 recovery remain separate.

20 October follow-up: the real Bokkie-only manager dashboard was observed again. Chrome still blocked the direct Shalean request with ERR_BLOCKED_BY_CLIENT before an application response could be established. This is a browser observation, not proof of HTTP403. The operator-run verifier below is prepared to obtain real local HTTP evidence; it does not itself close T08–T10 until actual results and independent acceptance are recorded.

Current fixture scope: the manager QA account has one active membership, Bokkie manager, and its complete operator run is recorded above. The existing cleaner QA account has active staff memberships in both Bokkie and Shalean; the earlier Bokkie-only cleaner observation below is historical. The single-business staff profile requires a separately verified single-business fixture. The shared-staff profile supports the current two-business cleaner fixture; no membership change is part of this work. Actual current shared-staff acceptance remains pending its operator run.

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

## Historical browser-only limitation and decision (19 October)

The following two paragraphs retain the earlier browser-only evidence and decision. The earlier 16:09 run's `OWN_QUOTES` and later-module gaps were superseded by the complete 16:22 manager result above. Current shared-staff checks and final combined task acceptance remain pending; full T11 recovery is also open.

Browser navigation to the restricted Shalean business URL reports ERR_BLOCKED_BY_CLIENT. This does not prove the application's real HTTP status or denial body. The live direct-link response remains unverified; do not close that criterion merely because the selector excludes Shalean. No browser security restriction was bypassed.

Decision: PASS for separate manager/cleaner sign-in and visible role scopes; CONDITIONAL PASS for full T08–T10 acceptance pending a directly observed real cross-business response. T11 full backup recovery remains independently open. Existing production systems unchanged.
