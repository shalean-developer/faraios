# T19 Step 3 — execution and rollback review boundary

STATUS: SOURCE-ONLY. NOT APPROVED FOR HOSTED EXECUTION.

## Preconditions

Identify the actual staging project/database/executor independently of session GUCs, verify exact approved SQL blobs, capture current catalog/ACL/RLS/role memberships/default grants, provider Vault consumers and protected application/financial baseline. Require approved recovery and independent operational A12 evidence. Existing source preflights check inactive prerequisites, transaction order and object collisions only; they are not security sign-off or project authentication.

SQL sources each have a standalone BEGIN/COMMIT, and throw SQLSTATE 55000 for invalid prerequisites/collisions. Failure aborts the active PostgreSQL transaction only. Earlier committed transactions are NOT automatically rolled back. Do not concatenate source scripts, replay an uncertain commit or infer transaction outcome from a lost client response.

## Non-destructive inverse plan

Stop rollout and capture an immutable before/after inventory. Determine whether the preceding transaction actually committed. For an aborted transaction, confirm no resulting objects or grants and matching baselines. For a committed one, assess dependencies and data before preparing any inverse: API, then OAuth, then runtime. Restore exact pre-change permissions, policies, owners and memberships only from authoritative pre-state evidence. Never blanket-revoke Supabase-managed Vault grants or alter the separately installed inactive tables/role.

Never use CASCADE, drop a table containing business/credential/job/audit data, or remove an object with unknown consumers. If jobs, events, secrets, active connections, external consumers, changed baseline, uncertain state or missing backups are found, STOP and use separately reviewed recovery. Explicit exact rollback SQL, hosted security approval, recovery acceptance and owner authorisation are all separate future gates.

## Limits

These guards protect source order/collisions only. They do not verify hosted privilege feasibility, RLS or function side effects, managed Vault consumer completeness, actual key/process isolation or recovery. Hosted SQL/grants, credentials, workers, Zoho, finance and production remain NO-GO. T19 In progress, A12 unresolved, T20 Not started.
