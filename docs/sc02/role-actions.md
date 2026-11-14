# Role-action catalogue

SC-01 target permissions, frozen for later tests. These roles are **not enabled**. Current business access remains the owner contract. Customer means guest/document capability, never implicit membership. No platform support role gains implicit access. All actions also require verified business/environment, capability, lifecycle and version guards.

| Action | Owner | Manager | Receptionist | Worker | Customer |
|---|---|---|---|---|---|
| business.configure | Yes | No | No | No | No |
| customers.manage | Yes | Yes | Yes | No directory | Own submitted fields only |
| enquiry.internal | Yes | Yes | Yes | No | No |
| quote.draft | Yes | Yes | Catalogue prices only | No | No |
| quote.override | Yes | Reason required | No | No | No |
| quote.decide | No impersonation | No impersonation | No impersonation | No | Exact valid quote capability |
| booking.schedule | Yes | Yes | Within agreement/policy | No | Submit; future own change request |
| assignment.manage | Yes | Yes | Scheduling only; no staff identity edits | Own availability request only | No |
| visit.execute | Yes | Yes | No | Currently assigned visit only | No |
| terminal.correct | Reason required | Reason required | No | No | Own offered variation consent only |
| booking.amounts | Yes | Yes | Yes | No | Own agreed document only |
| finance.bulk | Yes | Yes | No | No | No |
| invoice.issue | Yes | Yes | Unchanged agreed amounts only | No | Read exact issued document only |
| payment.record | Yes | Yes | No | No | No |
| payment.reverse | Yes | No | No | No | No |
| invoice.void_replace | Yes | No | No | No | No |
| staff.manage | Yes | Yes | No | No | No |
| membership.admin | Owner only; transfer gated | No | No | No | No |
| publication.read | Published projection | Published projection | Published projection | Published projection | Published projection |
| platform.recovery | Separately controlled owner operation | No | No | No | No |

Outsider: no private access in every row; explicit public projection and exact valid document capabilities remain separate. No self-promotion or staff-email-based login. Primary-owner removal, co-owner creation and ownership transfer stay gated. Worker projection excludes commercial totals, document tokens, other staff contacts, sales notes and customer history; access ends on unassignment/revocation. Receptionist cannot create bulk finance/export access by issuing an invoice. Manager cannot reverse payments, void or replace invoices by default.

For each catalogue action, test same-business authorized path, foreign business, wrong environment, direct REST/RPC/private helper access, invalid capability, stale version and anonymous JWT. Later SC-04/09 must also test shared account across two businesses, explicit selector, revocation mid-session and intended-account invitations. Tests must assert the database result, not only hide UI controls.

Existing owner SELECT often spans both environments; wrong-environment denial is a **target for delegated access**, not a claim about current owner RLS. See inventory and audit findings.
