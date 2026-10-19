# T15 — Staff and teams

Owner-authorised tracker scope: business-owned cleaner profiles and named teams, using existing explicit staff memberships. No account creation, invitations, membership grants, roles, payroll, employment records or cross-business sharing changes are introduced.

Owners edit a staff account's business-specific display name and optional contact number. Managers can read profiles and teams; owners alone create/edit/deactivate teams. Staff and anonymous users cannot use the office staff setup. Shared staff must already have an explicitly authorised active staff membership in each business. The same account may therefore have separate profiles in Shalean and Bokkie.

Named teams contain 1–100 distinct active staff memberships in that business. Database triggers reject foreign, suspended and non-staff accounts; RLS independently enforces owner writes and office reads. Staff identity/business keys are immutable, updates increment versions, and server writes use optimistic version guards. No client deletes. Deactivation preserves a team and does not change existing assignments. A dedicated deactivate action supports stale members after suspension.

The private, narrowly scoped staff_context reader verifies the caller's active owner/manager membership and business status before returning active staff labels. Its public wrapper is SECURITY INVOKER; anonymous execution is revoked. Both new tables have RLS and no anonymous grants. Internal audit-only triggers append actor/business/old/new data atomically.

Booking assignment offers an optional saved-team selector. Selection replaces the submitted individual choices with the current scoped team members. The server rejects inactive/foreign teams and revoked members; existing booking database triggers independently validate active business staff, minimum team size and lifecycle/version rules. Assignments remain the existing UUID array snapshot: editing a team does not rewrite bookings.

Local checks: syntax checks plus isolated PostgreSQL and HTTP tests cover allowed owner operations, manager read-only setup, staff/anonymous/foreign-business/CSRF denial, immutable identities, stale writes, suspension, audit and team assignment. CI/review and actual staging checks are separate evidence. Browser acceptance requires pulling main and restarting the local staging process after the migration.

Database change: database/staff-teams-draft.sql, additive tables/functions/policies/triggers plus extension of the audit entity whitelist. Apply only to FaraiOS staging. No seed/customer/booking changes. Recovery: stop using /staff, roll back application release, retain tables/audit evidence; do not drop populated tables. Complete recovery rehearsal remains T11.

T15 remains In progress until staging database and browser acceptance are recorded. Availability/overlap prevention is T16; cleaner portal is T24. No production readiness claim.


## Acceptance — 19 October 2026

Decision: PASS for T15. The pending acceptance statement above is superseded by this evidence. Implementation PR44 merged b7560b6; syntax, 38 focused local tests, CI437 and final review passed. Staging schema and actual owner/manager/staff/anonymous RLS/audit checks passed before browser work.

After local pull/restart and owner sign-in, Chrome showed the new Staff & teams pages. The owner had already created one profile and one team per business. Both profiles reopened with independently saved business-specific names and contact details. Each display name was temporarily changed with a QA suffix, saved, reloaded and restored. Both contact numbers were preserved; profile versions advanced to 3. Profile INSERTs and four UPDATEs were verified in the audit log. Owner-created teams remained active at version1, unchanged.

Browser-created separate labelled QA teams in each business, reloaded, renamed and reopened. Each team selected only that business's active staff account. Browser assignment dropdowns showed saved profile names. Selected the appropriate QA team, with no individual staff checkbox selection, for an independently prepared labelled draft fixture in each business. Both bookings advanced Confirmed → Assigned with the correct one-person assignment.

Deactivated each QA team through the browser. It disappeared from the booking's saved-team selector, while the existing assigned_staff snapshot stayed intact. Both fixtures were then cancelled through the browser with explicit test-only reasons. Final fixture versions4, status cancelled, one assigned staff each. Two inactive QA teams remain (version3) for audit evidence. No live service is to be delivered for these fixtures.

The pre-existing three bookings remained byte-for-byte unchanged: digest672089597ac392b146d2d6d1e9ab8ead. No new account, membership, message, invoice, payment, earnings or production action. New-table audit totals: profiles2 INSERT/4 UPDATE; teams4 INSERT/4 UPDATE (includes owner-created setup).

Focused 390×844 inspection of the Shalean team editor found no control overflow; page scroll width375 against viewport390. Viewport override reset. This is focused responsive acceptance, not a claim of exhaustive device testing. Browser timeouts were followed by fresh state reads before proceeding.

T15 is complete for existing explicitly authorised staff accounts, business-owned profiles/teams and saved-team assignment. Invitations/account creation and access-grant automation were not added by T15. T16 availability/calendar and overlap prevention is next; foundation hosting/recovery/restricted-link gates and T24 portals remain separate.
