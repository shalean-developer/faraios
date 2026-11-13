# Staff assignment production release

Owner instruction: DEPLOY IF ITS DONE DEVELOPED, 13 November 2026 SAST. PR #11 merged as 6798d1ef21be61a16ffa6c1a8bd8b0a5c79b31b6. Application head 00a0a9b0aaf276fb190e4ccaf1d78c99e4619a42 passed final automated review with no findings and GitGuardian secret scan. Review P2 fixed: assignment errors retain saved booking item inputs; native staff and booking suites rerun PASS. Fifteen targeted tests passed during implementation.

Connected Plesk production main pulled merge and explicit Deploy now completed Done. Connected fresh Supabase live staff ingress enabled; SQL read-back live_enabled=true, live_staff=0, live_assignments=0, shalean_published=false. No fictional production records saved. Migration installed and recorded previously; no additional schema changes. Preview staff count 3 (2 original staff tests plus one final mobile profile under separately signed-in test-business owner); preview booking count 6 and 3 assignments retained.

Final browser mobile verification at 390x844: document width 390, selected full-length staff label readable. Preview staff create/save/reload passed in current test-business session, which cannot see the other business's fictional staff. Health Advisor zero errors/warnings; rerun Security Advisor zero errors, unchanged Leaked Password Protection Disabled warning. Homepage/waitlist/shared stylesheet HTTP 200 and byte-identical to source before release.

Live Staff redirects anonymous session to sign-in. Authenticated production Staff/Bookings acceptance remains PENDING: live session expired; user sign-in handoff requested. No claim of authenticated production pass. No staff sign-in, invitations, payroll, recurrence, payments, notifications, Resend or waitlist webhook/recovery operations.

Rollback: disable staff_private.ingress live and restore PR #10 application; retain staff/assignment data. This evidence-only commit remains on feature branch and is not required for production behavior.
