# T31 greenfield source installation review

Status: SOURCE PREPARATION ONLY; no Supabase migration has been applied.

Target: newly created synthetic-only project `qcmnxjilmsibxftfverd`, NOT original staging `xdmfyrsauvqznkloroxg`.

The reviewed dependency order is maintained in `src/t31-greenfield-manifest.js`. It begins with identity and audit, then settings, catalogue, customers, bookings and staff teams, followed by T31 provisioning, branding and invitations.

**Warning:** Do not execute `supabase/migrations/` directly on the empty project: the earliest T04 delta locks `public.one_off_bookings` before that table exists.

The existing native T31 provision test applies only the minimal five-file identity/audit/provision/branding/invite fixture. The older T25 synthetic fixture demonstrates a broader foundation order. Neither is proof of a complete Supabase-managed Auth installation. The ordered source still needs a full native greenfield rehearsal, detailed ownership/grant/RLS review, and separate migration approval.

Test environment differences to address before a hosted installation:
- Supabase Auth and managed roles are already provisioned; do not recreate or replace them.
- The dedicated T31 non-login roles and security-definer functions must be reviewed for Supabase permissions.
- The application's source configuration currently pins a different Supabase staging project; keep all hosts and credentials isolated.
- No outbound Auth/email, Paystack, Zoho, SMS, notifications or production integrations are approved.
- The greenfield T31 onboarding slice does not itself establish complete T01–T30 operational capabilities.

**Acceptance gating:** latest-head CI, native PostgreSQL clean-cluster integration/negative RLS tests, reviewed migration artifact, owner-authorised migration to only the new project, separately authorised isolated application deployment, then genuine synthetic owner/tenant mobile and browser acceptance. Do not merge or deploy PR #314 or begin T32.
