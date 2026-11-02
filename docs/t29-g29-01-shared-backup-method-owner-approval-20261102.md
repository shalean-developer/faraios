# T29 G29-01 — Owner authorisation to reuse Shalean backup method for Bokkie

Date: 2026-11-02. Owner clarified: **“authorising you to use Shalean's backup method for Bokkie.”**

## Authorised scope
Reuse the Shalean **backup procedure and validation controls**, once actually identified and verified, for Bokkie's own authorised source database and attachments. Use tenant-specific source identifiers, credentials, protected backup destinations, encryption/key custody, inventories, retention checks, restore verification, and separate reconciliation evidence. This is **method reuse**, not approval to combine source datasets, connect to Bokkie without authorisation, use Shalean's database as a substitute for Bokkie's backup, or treat unverified recovery as passed.

## Preconditions remain
- Shalean's actual backup method, retention, recoverability and attachment retrieval have **not yet been verified**; copying an assumed method is not an evidenced recovery plan.
- Bokkie project `scsrxogumimsrtbnqeas` still returns permission denied on the available connector; arrange authorised access or owner-operated read-only evidence without credentials in GitHub.
- Preserve restore-test T07 guard/migration, potential T19/T20 evidence, and prohibit overwrite or destructive operations pending separate approval.
- No Supabase port 5432, live provider action, financial or customer notification, recurrence generation, production write, deployment, import or T30.

**Decision:** Policy/procedural reuse APPROVED. G29-01 backup/restoration PASS **NOT established** for either business. T29 In progress and PR #306 Draft.
