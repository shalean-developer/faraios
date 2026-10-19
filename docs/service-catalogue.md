# T12.2 — Service catalogue, prices and extras

FaraiOS staging only. Catalogue entries belong to one business; neither business inherits the other's prices or extras. No live rates are seeded or copied from existing Shalean/Bokkie systems.

Owners can create and edit services/extras, names/descriptions, fixed/hourly/per-unit ZAR rates, unit labels, service team sizes and active/inactive status. New entries start inactive in the form. Managers can read their business catalogue but cannot change it; staff have no catalogue access. Authentication, HTTP business/role checks and database RLS all apply. There are no delete grants; deactivate entries instead. An item's business, ID and type cannot be changed after creation.

Amounts are parsed from decimal strings into integer cents, rejecting scientific notation, negative values and more than two decimal places. Supported range: zero through 2,147,483,647 cents. Service team size is 1–100; extras have no team-size value. These are supported configuration limits, not business policy defaults.

Every edit increments its version; the server updates by business ID + item ID + expected version. A stale or missing row returns HTTP 409 rather than silently overwriting a newer price. The audit-only trigger records actor and old/new values atomically. Its fixed search path and source-table guard prevent a general-purpose privileged write API; client roles cannot call it or insert audit rows.

Catalogue UI lists the first 500 items and says so when that limit is reached. Pagination, service-to-extra applicability rules, complex property pricing, recurrence discounts and booking quote consumption remain later work. This change does not calculate charges, earnings or invoices. Booking snapshots will need to retain selected item versions/rates when booking implementation begins.

Bokkie settings were already saved by the owner and persisted after reload: Monday–Thursday and Saturday, 07:57–20:57, Africa/Johannesburg. Their unusual minute values are preserved as entered. Shalean settings remain separate. No operating schedules are inferred.

Validation: exact decimal conversion, invalid-input rejection, HTML escaping, optimistic conflict handling, HTTP owner creation/updates, manager read-only and staff denial, foreign-business rejection, real PostgreSQL RLS, two distinct business rates, suspension, immutable identity and old/new audit values. Browser review of the updated local catalogue remains pending.

T12 remains In progress until the owner verifies catalogue saves/reopens for both businesses. Full backup recovery and the browser-tool-blocked direct restricted link remain separately open. Existing v1 restore tooling covers only the identity foundation; a full recovery snapshot must include settings, catalogue and all audit event types under the matching schema, as well as Auth/Storage/configuration.
