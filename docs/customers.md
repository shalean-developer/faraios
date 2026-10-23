# T13 — Customers and addresses

## Customer history follow-up — 23 October 2026

Customer details now include a read-only booking history for office owners/managers, filtered by business and customer ID before limiting. It shows the latest 200 scheduled visits, including upcoming/completed/cancelled visits, with an explicit older-visits notice when needed. Inactive customers retain history; links open existing business-scoped booking details. No portal access, payments, schema or policies changed. Local synthetic verification and independent QA are recorded in the [master-plan reassessment](operational-mvp-reassessment-20261023.md); browser/hosted acceptance of this increment remains separate. Earlier acceptance and scope statements below are retained as history.

Owner authorised continuation after T12 acceptance on 19 October 2026. Staging-only implementation; no production import or identity linking.

Owners and managers can create and edit business-owned customer names, optional email/phone, private office notes, active/inactive state and multiple addresses. Each address has a label, street address, suburb, city, postal code and private access instructions. Deactivate records to retain history; no client delete grant is provided. Shared contact details do not automatically identify or merge customers across businesses.

Customers and addresses carry immutable business IDs. Addresses reference their customer's business and ID through a composite foreign key, preventing cross-business linking even for an owner of both. Server membership revalidation, explicit customers.manage permission and database RLS require active owner/manager membership in an active business. Staff and anonymous users cannot read notes, contact records or addresses. Future cleaner job access must use an assignment-scoped projection rather than expose these office tables. Customer portal access is not implemented.

Every update matches business, record ID and expected version; address writes also match customer ID. Changed/unavailable records return 409. Source mutation and audit recording happen atomically through an internal, non-exposed audit-only trigger. Source RLS remains authoritative. Customer and address transfers are prohibited.

The list shows up to 500 customers; each detail shows up to 100 addresses, with limit notices. Direct address lookup/edit is independently scoped and remains available beyond the list cap. Customer forms permit up to 64 KiB of encoded body so valid non-ASCII notes fit. No customer booking/payment history exists yet; it will be linked under T14 and finance work. No messages are sent and no consent is inferred from saving a contact. Existing recovery tooling covers identity only, so full recovery remains open under T11.

Validation includes input bounds and escaping; HTTP owner/manager create/edit/address flows, stale writes, CSRF, foreign businesses, missing records, suspension, staff/anonymous denial; isolated PostgreSQL tenant/role restrictions, private-note isolation, multiple addresses, composite FK enforcement, immutable identity, version checks and audited old/new values.

T12 acceptance evidence: real owner browser created/reloaded/edited/reopened/deleted a temporary Shalean service and Bokkie extra at distinct synthetic prices. Audit INSERT/UPDATE/DELETE matched each business; zero test entries remain. Shalean's two pre-existing items remain. Bokkie deletion returned Item deleted; an immediate earlier reload of the deleted Shalean URL showed Item unavailable, so stale deleted URLs correctly lack an editor. One initial pricing selection differed but explicit re-selection/save/reopen was correct. Business picker mouse selection was subsequently verified.

T13 browser acceptance remains pending until the owner pulls/restarts the local staging app. No production release is implied.
