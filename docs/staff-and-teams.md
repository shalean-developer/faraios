# T15 — Staff and teams

Owner-authorised tracker scope: business-owned cleaner profiles and named teams, using existing explicit staff memberships. No account creation, invitations, membership grants, roles, payroll, employment records or cross-business sharing changes are introduced.

Owners edit a staff account's business-specific display name and optional contact number. Managers can read profiles and teams; owners alone create/edit/deactivate teams. Staff and anonymous users cannot use the office staff setup. Shared staff must already have an explicitly authorised active staff membership in each business. The same account may therefore have separate profiles in Shalean and Bokkie.

Named teams contain 1–100 distinct active staff memberships in that business. Database triggers reject foreign, suspended and non-staff accounts; RLS independently enforces owner writes and office reads. Staff identity/business keys are immutable, updates increment versions, and server writes use optimistic version guards. No client deletes. Deactivation preserves a team and does not change existing assignments. A dedicated deactivate action supports stale members after suspension.

The private, narrowly scoped staff_context reader verifies the caller's active owner/manager membership and business status before returning active staff labels. Its public wrapper is SECURITY INVOKER; anonymous execution is revoked. Both new tables have RLS and no anonymous grants. Internal audit-only triggers append actor/business/old/new data atomically.

Booking assignment offers an optional saved-team selector. Selection replaces the submitted individual choices with the current scoped team members. The server rejects inactive/foreign teams and revoked members; existing booking database triggers independently validate active business staff, minimum team size and lifecycle/version rules. Assignments remain the existing UUID array snapshot: editing a team does not rewrite bookings.

Local checks: syntax checks plus isolated PostgreSQL and HTTP tests cover allowed owner operations, manager read-only setup, staff/anonymous/foreign-business/CSRF denial, immutable identities, stale writes, suspension, audit and team assignment. CI/review and actual staging checks are separate evidence. Browser acceptance requires pulling main and restarting the local staging process after the migration.

Database change: database/staff-teams-draft.sql, additive tables/functions/policies/triggers plus extension of the audit entity whitelist. Apply only to FaraiOS staging. No seed/customer/booking changes. Recovery: stop using /staff, roll back application release, retain tables/audit evidence; do not drop populated tables. Complete recovery rehearsal remains T11.

T15 remains In progress until staging database and browser acceptance are recorded. Availability/overlap prevention is T16; cleaner portal is T24. No production readiness claim.
