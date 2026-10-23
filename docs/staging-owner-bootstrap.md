# Staging owner provisioning — 19 October 2026

Owner reported account created. Readback found exactly one confirmed Auth account in the isolated staging project. A guarded transaction required exactly that one confirmed account and empty business/membership tables before creating Shalean and Bokkie and one active owner membership for each. Two private identity_audit entries record subject, business, authorisation reference and timestamp. No passwords or access/refresh tokens were read or recorded.

Readback confirms both business memberships are active owners. These are new staging business records only, not migrated production data. Real browser sign-in/logout is still pending user verification after updating local checkout to main and running npm run staging on port 3101.

Security advisor after provisioning: INFO identity_audit has RLS enabled without policies (intentional deny-all; all client grants revoked). WARN leaked-password protection disabled (provider Auth setting; needs security review before deployment). Do not report the project security review as clear after these observations. This package does not accept those as production exceptions.

Login PR #7 merged at 9725bc424db14e0ac796cb011feac0ccdef96fa1 after GitHub checks passed. Hosted Supabase API anonymous business SELECT was denied with HTTP 401 / PostgreSQL 42501. Full positive Auth acceptance remains open.
