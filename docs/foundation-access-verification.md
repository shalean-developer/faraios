# Foundation access verification — 19 October 2026

Scope: T08–T10 verification, no deployment or live-business changes.

## Local evidence

`npm run check` and `npm test` pass: 40 tests, zero failures. New HTTP tests exercise the staging server with a simulated Supabase client, rather than only calling the policy functions.

- Manager: finance navigation and invoice/payment wording; no owner settings; foreign business request returns 403 even with a forged role query.
- Staff: own assignments/earnings navigation, no business finance or owner settings; foreign business request returns 403.
- Suspending membership after login: selected business returns 403 and combined view removes the business.
- Advancing the clock beyond 30 minutes: dashboard redirects to login.
- Revoking the verified identity: dashboard redirects to login.
- Existing tests also verify logout, database RLS, assignment and earnings ownership.

## Browser observation

The existing real owner session displayed Bokkie and both authorised selector options. At a 390px viewport the document had no horizontal overflow (reported document width 375px). The menu interaction commands timed out, so open/close and keyboard operation remain unverified. The viewport override was reset.

## Limits and next action

These simulated-provider tests do not prove hosted manager/staff authentication. Complete real staging manager/staff sign-in, cross-business direct-link denial, membership revocation, and mobile-menu interaction before closing T08–T10. No manager/staff credentials were created or existing owner roles changed in this check. Future booking and earnings record endpoints are not implemented; their enforcement cannot yet be certified.

Decision: CONDITIONAL PASS for continued isolated development; foundation verification remains open. Hosting capacity remains unverified before deployment.
