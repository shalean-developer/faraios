# T29 — Temporary Shalean recovery clone: owner budget approval

Date: 2 November 2026. Owner was asked whether they approve the **additional USD 9.68/month** for a temporary, independent Shalean recovery project, subject to isolation controls, explicitly clarified as approval in principle rather than immediate restore. Owner answered **YES**.

The visible Supabase Restore to new project confirmation for the completed 2026-11-02 07:31:35 UTC physical backup quotes USD 9.68 additional monthly compute and USD 0 additional monthly disk, Shalean Production organisation, eu-west-1 region. Costs may accrue until the project is deleted; deletion itself must require separately verified protection and explicit approval.

**Execution is still HELD.** The cloned database copies users/roles/data and could include outbound-capable database extensions, cron jobs, webhooks, secrets or other side effects. Supabase documentation warns about cloned pg_cron/pg_net/wrappers. Before creating/activating any clone, prove an effective outbound isolation/containment path; do not assume a new project automatically disables side effects. No one is authorised to press Continue without this gate and confirmation of the exact action. Do not clone private data into an exposed endpoint.

No restoration, new project, source modification, import, settlement, notification, deployment, or T30 has occurred. G29-01 recovery PASS remains unverified. PR #306 stays Draft; T29 In progress.
