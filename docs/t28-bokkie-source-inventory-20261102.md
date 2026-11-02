# T28 — Bokkie website and application source inventory (2026-11-02)

Status: PUBLIC WEBSITE + GITHUB SOURCE VERIFIED; live authoritative private record store **not yet identified or counted**. No production business data read, exported or altered.

## Confirmed identity
Owner designated https://bokkiecleaning.co.za as Bokkie's existing website. Live pages discoverable via public web: homepage, /services, /contact, /areas/cape-town, /book/carpet-cleaning. Source repository discovered through connected GitHub: https://github.com/shalean-developer/bokkie (main tree `9bb2d50382e78d74946dd4f41ca07be9faacdff5`, 806 entries). The domain/website-to-deployment-revision linkage has NOT been independently attested; inspect live Plesk deployment/read-only metadata before assuming `main` is deployed.

## Verified public feature interface
Public service marketing lists standard, deep, moving, Airbnb, office and carpet; /services additionally advertises residential/commercial/specialized, post-construction, window and holiday cleaning. /book/carpet-cleaning presents details such as room count, carpeted area/condition, property address, access/parking instructions, and a schedule step. Public FAQs describe cleaner selection, recurring service and secure payment, but advertising is NOT runtime/payment proof. Search-indexed public blog describes weekly/fortnightly/monthly discounts; verify actual saved business tariffs and preserved customer agreements rather than copying advertised rates.
Public website routes and marketing/SEO pages are separate from migrated operational records.

## Existing app source feature surfaces (repository, not hosted tests)
- `app/admin`: bookings, applications, blog, cleaners, CMS, customers, discounts, locations, notifications, payments, pricing, quotes, recurring customers/schedules, reviews, schedule, settings.
- `app/cleaner`: bookings, checklist, earnings, schedule, work days, performance, profile, job info, areas.
- `app/dashboard`: bookings, rescheduling/rebooking, earnings and analytics.
- `app/actions`: booking submission, assignments, recurring generation, booking changes, payment/rebook, quotes, credits, EFT, discount/voucher and notification actions.
- `supabase/schema.sql`: source-defined `bookings` with booking reference, service/frequency, schedule, property and address, cleaner preference/assignment, instructions, contact, amount/discount/tip, status and payment reference; `cleaners` with availability and working areas. Additional migrations reference profiles, payments, payment methods, recurring bookings/schedules, cleaner earnings, teams, booking cleaners, blog/CMS, reviews, quotations, applications, notifications, vouchers and discounts.
- `lib/supabase/config.ts` reads deployment environment for runtime project URL; no project ID established from this file. Historical `SUPABASE_INTEGRATION_SUMMARY.md` explicitly describes an earlier phase with JSON bookings and future Supabase storage; do not claim today's live source from this historic document.

## Mapping impacts / candidate transitions
| Area | Source evidence | T28 destination / treatment |
|---|---|---|
| Public booking wizard, detailed carpet scope, address/instructions | Live booking page + app/book routes | V1 T25 booking/quotes/assessment: field-by-field compare and determine assessed scope mapping |
| Existing bookings, contact and customer identities | Source bookings table schema and app/admin/customer routes | V1 business_customers/customer_addresses/one_off_bookings; preserve original references/snapshots; independent portal linking (no email-only access) |
| Recurrence, future bookings, discount/pricing policies | app/actions and migrations | V1 T17 schedules, catalogue and frozen quote/booking snapshots; explicit business-specific active policy and exceptions |
| Cleaner/team preference, workdays, earnings | cleaner/admin pages and migrations | V1 staff profiles, teams, availability, T22 earnings; verify accepted assignments and payout history separately |
| Quotes, discounts, credits, vouchers | admin/action/migration source | V1 quote/payment components where equivalent; otherwise agreed retain/archive transition; do not silently create V1 feature |
| Payment and EFT | admin/payment actions + payment method source | T19 Zoho, T20 Paystack, T21 EFT; verify actual providers and original reconciliation/receipt identities; no financial actions |
| Reviews/blog/CMS/SEO/locations | app/admin and public marketing | Generally website-owned/retain on existing site unless owner agrees transition; not automatically V1 features |
| Customer/cleaner dashboard, notifications | app/dashboard, app/cleaner, admin/notifications | T24–T26 portals and notification map; consent and delivered status retained; no resend |

## Blocking verification
1. Obtain read-only hosting/deployment configuration identity for live `bokkiecleaning.co.za`: deployment revision and **Supabase project ref only**, not URL keys, env dump or credentials. A valid code repository by itself does not show which database is authoritative.
2. Connect/find Bokkie live data source; read information_schema names/columns/foreign keys and aggregated counts by entity/status/date **without customer row payload**. Inventory JSON/file sources if still in use, from metadata only.
3. Verify source-schema drift from historical SQL and list Bokkie storage buckets/object counts without downloading private images/documents.
4. Assign each Bokkie source table/entity to F01–F13/R01–R17 or an explicit legacy-only retention/archival/transition decision. Preserve active and future bookings, existing payments, staff assignments and links.
5. Obtain separate owner choices for advertised discounts, cleaner preference vs assignment, credits/vouchers/referrals, and marketing/CMS retaining on old site. Do not presume any policy from public advertising.

This is **not a T28 acceptance report**; G11 remains partially resolved: website and repository identified; authoritative record store and live counts not verified. No T29 data import or production change approved.
