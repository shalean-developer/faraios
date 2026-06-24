# Workspaces & multi-company access

FaraiOS uses a **URL-scoped workspace model**: every dashboard lives at `/{company-slug}/dashboard`. Data is isolated per company via Supabase RLS and `company_id` on all business tables.

## How many workspaces can one user have?

**Multiple workspaces are supported.** A user can be a member of more than one company (via the `memberships` table). This is intentional for agencies, bookkeepers, or owners with more than one business.

## Single-workspace onboarding

Onboarding still creates **one new company per flow**. There is no “create unlimited workspaces” self-serve UI yet — additional companies are added by platform admins or future invite flows.

## Choosing a workspace after login

| Scenario | Behavior |
|----------|----------|
| 0 memberships | Redirect to `/onboarding` |
| 1 membership | Redirect to `/{slug}/dashboard` |
| 2+ memberships | Redirect to `/app/workspaces` picker |

The sidebar **company switcher** appears when you belong to more than one workspace and preserves your current sub-path when switching.

## Security

- Middleware validates that the slug in the URL matches a membership for the signed-in user.
- Cross-company access is denied at the database layer (RLS).
- Platform admins use a separate `/admin` experience.

## Related routes

- Workspace picker: `/app/workspaces`
- Post-login resolver: `/app` → workspace picker or default dashboard
- Workspace SaaS billing: `/{slug}/dashboard/subscription`
- Website hosting billing (separate): `/{slug}/dashboard/hosting`
