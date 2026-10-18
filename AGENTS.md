# FaraiOS delivery rules

- Start from docs/blueprint.md and the linked task tracker. Record changes to scope and decisions.
- Work in bounded branches and pull requests. Do not deploy or migrate live businesses as part of a scaffold task.
- Never hard-code Shalean or Bokkie operational policies as universal industry rules.
- Business IDs and roles come from trusted server-side membership records, never client-provided authorisation claims.
- Every business-owned record requires business scope; staff and customer access also require record-level ownership/assignment.
- Platform administration is separate from business membership; no implicit access to tenant data.
- Shared staff require explicit business memberships; customer notes and financial records remain business-owned.
- Test access denial as well as permitted behaviour. Pure unit tests are not proof of API enforcement or database RLS.
- Keep credentials and customer data out of Git. Staging and production must have separate credentials and data.
- Read-only reviews and reversible local work can proceed within the user's requested scope. Never claim unrun checks or unbuilt capabilities.
