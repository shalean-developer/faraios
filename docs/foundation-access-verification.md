# Foundation access verification — 19 October 2026

Scope: T08–T10 verification, no deployment or live-business changes.

## Automated evidence

`npm run check` and `npm test` pass: 40 tests, zero failures. Staging HTTP tests cover manager/staff navigation, foreign-business denial, suspended membership, 30-minute expiry, revoked identity and logout using a simulated Supabase client. Existing tests cover Postgres RLS and policy boundaries. GitHub Foundation checks run 87 passed for commit 8d1c5614d8f296e788332fbaae95e824e1612048.

## Real staging browser and database evidence

Project: xdmfyrsauvqznkloroxg. Application: user's local staging server on port 3101, connected to real Supabase. Exactly one Auth account existed with owner memberships in Shalean and Bokkie.

Under the user's instruction to perform the checks, temporarily reduced that account's memberships, then restored both original owner/active memberships and verified restoration in SQL and the browser:

- Bokkie manager with Shalean suspended: selector exposed Bokkie only; role displayed manager and invoice/payment permission wording omitted owner controls.
- Staff: dashboard displayed My assignments and My earnings; business finance cards were absent.
- Both memberships suspended: existing authenticated session immediately displayed No business access assigned after navigation.
- Original owner access restored: combined dashboard again displayed both businesses as owner.
- Real logout: Sign out returned to login; direct navigation to /dashboard returned to login again.

Attempting the restricted Shalean URL was blocked by browser tooling (ERR_BLOCKED_BY_CLIENT), so that attempt is not evidence of an application-level 403. Automated HTTP tests establish 403 only in the simulated-provider test.

## Mobile acceptance

Fresh browser tab resolved input timeouts affecting the original claimed tab. At 390 x 844: Enter opened the native menu; successive clicks closed and opened it; final click closed it. Logo x=20, burger x=310.67; document width=375, viewport width=390 (no horizontal overflow). Viewport override reset afterward.

## Remaining limits

No separate manager/staff Auth accounts exist; a fresh password sign-in for those separate identities remains untested. Real roles were tested using an already authenticated account with temporary reduced memberships. No passwords were read, created or changed. Future booking/earnings record endpoints do not yet exist. Hosting capacity remains unverified before deployment.

Decision: CONDITIONAL PASS. Live role resolution, suspension, logout and mobile menu passed. Separate manager/staff sign-in and a directly observed real cross-business 403 remain open; do not describe all foundation acceptance as complete.
