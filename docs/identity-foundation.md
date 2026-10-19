# Identity and membership foundation — isolated preparation

This package prepares T07–T09; it does not complete hosted authentication or environments.

## Database draft

`database/identity-draft.sql` is local-tested SQL, not a generated or applied Supabase migration. It defines businesses and memberships with UUID identifiers, constrained roles, active/suspended status, foreign keys and indexes. Row-level security is enabled on both tables. Anonymous users have no grants. Authenticated users read their own active memberships and active businesses linked to those memberships. Client writes are denied even for owners; a future audited invitation/provisioning workflow must implement owner management without client role escalation.

Membership suspension is checked from database state, not cached editable JWT metadata. Platform-admin roles have no implicit business access. No real Shalean/Bokkie records or users are seeded.

## Identity adapter

`resolveIdentity` accepts a trusted per-request Supabase client using the user's token and a publishable key. It calls `getUser` and reads memberships; missing/invalid auth or database failure fails closed. It ignores user_metadata roles. A service-role client is forbidden by the contract. No SDK is installed or cloud endpoint configured yet. This adapter is not wired into the demo; demo personas remain clearly separated.

## Tests and limits

PGlite 0.5.10 is pinned as a development-only dependency for real PostgreSQL policy tests. The auth harness simulates auth.uid and roles; it does not test hosted GoTrue, PostgREST, provider settings or full Supabase integration. Tests cover multi-business owner visibility, manager isolation, outsider/anonymous denial, membership self-escalation, owner direct-write denial and suspension. Adapter tests cover provider auth failures, metadata spoofing, malformed membership responses and no-membership users.

Sources consulted: Supabase row-level/column privileges documentation and Realtime membership-policy examples, 19 October 2026. Changelog checked: September PostgreSQL minor-version notices concern extension indexes/legacy crypto not used here; October TLS notice requires supported TLS clients. Recheck before hosted integration. No SECURITY DEFINER functions, public views or auth.user_metadata authorisation are introduced.

## Next implementation

1. Choose and provision a new isolated FaraiOS staging project with verified current cost; do not reuse Shalean/Bokkie projects.
2. Generate a migration through Supabase CLI, inspect advisors and apply only to staging after schema review.
3. Configure email verification, redirect allowlist, rate limiting, session cookies/refresh/logout and authenticated application routes.
4. Test real owner/manager/staff accounts with RLS, API enforcement and revocation.
5. Keep production deployment gated on hosting capacity, HTTPS and recovery verification.

No cloud costs, accounts, emails, migrations or live data changes occur in this package.
