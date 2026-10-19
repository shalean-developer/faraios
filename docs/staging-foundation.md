# FaraiOS staging foundation evidence — 19 October 2026

Organisation: shalean-developer (lypbvtudsbxxdcnzbqwc), explicitly confirmed by owner. Project faraios-staging, reference xdmfyrsauvqznkloroxg, region eu-west-1. Cost tool quoted $0/month at creation. No paid plan or production project created.

Project verified ACTIVE_HEALTHY on PostgreSQL 17.11. PR #5 merged at da42a1e0d3463cb07fd2cb8f10f9f7957ca77494 after checks passed. Migration identity_business_membership_foundation applied through Supabase connector; migration history assigned version 20261019002040. Committed migration reproduces the applied SQL and uses the observed version, not a guessed timestamp.

Hosted transactional tests PASS: owner sees two permitted businesses; manager sees own business only; cross-business reads denied; direct membership escalation denied; suspended memberships cannot read businesses; outsiders see no businesses; anonymous reads denied. Test script committed under supabase/tests and rolls back all fixtures.

Readback after rollback: businesses=0, business_memberships=0, auth.users=0; RLS enabled on both tables. Security advisor: no findings. This is SQL/RLS verification, not real email/password, PostgREST or browser-auth acceptance.

T07 remains in progress: staging exists but production separation and outbound/environment controls not complete. T08 schema ready but actual business/user provisioning remains. T09 database policies verified; real login/session/API enforcement remains pending. No SMTP or customer messages configured/sent. No Shalean/Bokkie production or staging project changed.

Next: configure hosted Auth and a user-token-scoped application connection; test real sign-in, refresh, logout, revoked membership and direct API denial. Use publishable key for browser/user requests; never expose service-role credentials. Do not deploy the local demo. Hosting CPU/RAM/process validation remains deferred until before deployment.
