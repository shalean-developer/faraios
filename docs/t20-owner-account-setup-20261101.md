# T20 owner account enrollment setup

1 November 2026 SAST. Canonical T20 only. T19 Done; T21 Not started.

Audit found a bootstrap dependency: the TEST runtime correctly refuses startup without exact account enrollment, while its handler is absent when disabled. Avoid copying an owner's password into another private file or impersonating an owner through SQL claims. Provide a small independent owner-only settings route using the existing staging session and auth.withOwner; the existing database configure RPC independently checks live session and actual owner membership.

The explicit TEST launcher supplies this management handler even with payment dispatch disabled. The SDK owner-RPC capability is enabled for that handler, but backend, checkout and external provider routes remain blocked through the human session. The global Origin gate is unchanged for settings; only the existing exact signed-webhook path can receive its previously reviewed exemption when actual dispatch is enabled. Health still reports payment dispatch disabled when only setup is mounted.

GET /payments/{businessUUID}/settings shows no credentials and verifies ownership before rendering. Strict same-origin POST accepts only a numeric Paystack business ID and explicit TEST confirmation, then invokes configure under the actual authenticated owner's session. No provider key, browser amount or business-authorization claim is accepted. Saving enables only the private database account mapping; without backend enrollment and private configuration enablement, checkout cannot initialize.

After this source is qualified and deployed: use the owner staging login to save Shalean1019240 and Bokkie1855953, verify exact mappings/updated_by against the actual owner, then separately enroll the dedicated T20 backend for those exact accounts. The operator enrollment is not an owner impersonation and must be recorded as an operator action. Private TEST enablement remains deliberate and scoped. No provider initialization, charge, webhook setting or live change is authorized by saving mappings. Specific synthetic checkout acceptance remains required.

Tests cover actual handler's RPC shape, GET without mutation, owner denial, missing/duplicate sessions, Origin, extra/duplicate fields, secret overrides and body limits. Existing SQL/native tests prove real database owner/manager separation. Mock route tests alone are not hosted acceptance.

Rollback: remove the management handler injection and restore PR285 launcher/hooks. Preserve any saved mappings/enrollments as evidence; disable them deliberately instead of deleting. This change does not remove/reset checkout claims, payment records or T19 data.
