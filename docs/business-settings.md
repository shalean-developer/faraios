# T12.1 — Business settings

Owner-authorised first T12 increment: display branding name, business contact details, service areas, working days, one daily opening interval and selected time zone. Each business stores an independent record. Services, prices, extras, logo uploads, split/overnight hours and booking-hour enforcement are later increments; no operational rates are prefilled.

Owners open a selected business and choose Business settings. Managers and staff cannot read or change this configuration. Server checks resolve current memberships and active businesses; database RLS independently enforces owner scope. POST origin checking remains enabled. A successful save redirects to the persisted form; validation failures retain submitted fields. Time-zone choices initially support Africa/Johannesburg and UTC. Concurrent saves currently use last-write-wins; version conflict handling is a future improvement.

SQL: `database/business-settings-draft.sql`, depends on identity and audit foundations. The audit-only SECURITY DEFINER trigger is in the non-exposed audit schema, has fixed empty search_path, accepts no parameters, checks its source table and has EXECUTE revoked from public/client roles. It only appends history for a mutation already allowed by source-table RLS. Users receive no arbitrary audit write privilege. This is a deliberate trusted audit bridge; it grants no business mutation or membership-management authority.

Validation covers independent settings for two businesses; owner saves and audit actor capture; denied manager/staff/foreign/suspended writes; server scoping that ignores forged business_id in the payload; form validation, output escaping and same-origin enforcement. Full suite: 50 tests. Browser review on the user's updated local app remains pending. No production deployment.

Recovery limitation: the existing v1 snapshot rehearsal covers the identity foundation only. Full recovery must include this new table and its audit event type alongside Auth, bootstrap audit and storage/configuration before T11 can close. Do not restore a newer snapshot using an older schema definition.

T12 remains In progress until catalogue, prices and extras are implemented and two-business browser acceptance passes.

Live staging validation: owner wrote distinct temporary records for Bokkie and Shalean; both audit entries had the owner subject; manager reads returned no settings and attempted writes were denied. Transaction rolled back. Security advisor retained only the previously recorded bootstrap-audit INFO and disabled leaked-password-protection warning.

VAT configuration is a separate owner-only, versioned control. See [Business VAT setting](business-vat.md) for customer-total pricing, immutable document snapshots, migration order and the VAT accounting hold.
