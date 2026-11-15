# Source contract index

Pinned baseline: `e0d45923b441d7833e048faa041a3f0e16cfe1e2`. Full statements, signatures, ACL/policy history, call sites and hashes are in [contract-inventory.json](contract-inventory.json). Source only; exact effective grants require native catalogue verification. Migration order is lexical; manual activation and rollback are separate scenarios. Never apply every release file in lexical order as a production baseline.

## Tables and policy/grant ledger

| Table | Policies | Explicit grant history (ordered; review revokes in JSON) |
|---|---|---|
| `booking_private.ingress` | None; private/no public policy | No direct table grant in source |
| `customer_private.ingress` | None; private/no public policy | No direct table grant in source |
| `enquiry_private.ingress` | None; private/no public policy | No direct table grant in source |
| `enquiry_private.mail_outbox` | None; private/no public policy | No direct table grant in source |
| `enquiry_private.mail_settings` | None; private/no public policy | No direct table grant in source |
| `enquiry_private.rate_limits` | None; private/no public policy | No direct table grant in source |
| `invoice_private.counters` | None; private/no public policy | No direct table grant in source |
| `invoice_private.ingress` | None; private/no public policy | No direct table grant in source |
| `public.business_booking_requests` | requests_owner | grant select on public.business_booking_requests to authenticated |
| `public.business_booking_staff` | assignment_owner | grant select on public.business_staff,public.business_booking_staff to authenticated |
| `public.business_bookings` | bookings_owner | grant select on public.business_bookings to authenticated |
| `public.business_customers` | customers_owner | grant select on public.business_customers to authenticated |
| `public.business_enquiries` | enquiry_read, enquiry_update | grant select on public.business_enquiries to authenticated<br>grant update(status) on public.business_enquiries to authenticated<br>grant update(private_notes,follow_up_on) on public.business_enquiries to authenticated |
| `public.business_enquiry_activity` | enquiry_activity_read | grant select on public.business_enquiry_activity to authenticated |
| `public.business_invoice_events` | invoice_owner | grant select on public.business_invoice_events to authenticated |
| `public.business_invoice_payments` | invoice_owner | grant select on public.business_invoice_payments to authenticated |
| `public.business_invoices` | invoice_owner | grant select on public.business_invoices to authenticated |
| `public.business_profiles` | profile_owner | grant select,insert,update on public.business_profiles to authenticated |
| `public.business_public_pages` | published_read, published_insert, published_update, published_delete | grant select(slug,environment,document,time_zone) on public.business_public_pages to anon<br>grant select,insert,update,delete on public.business_public_pages to authenticated<br>grant select(services) on public.business_public_pages to anon |
| `public.business_quotes` | quotes_owner | grant select on public.business_quotes to authenticated |
| `public.business_service_catalogues` | services_owner | grant select,insert,update on public.business_service_catalogues to authenticated |
| `public.business_service_images` | service_image_owner_read, service_image_owner_insert | grant select,insert on public.business_service_images to authenticated |
| `public.business_staff` | staff_owner | grant select on public.business_staff,public.business_booking_staff to authenticated |
| `public.businesses` | owner_read, owner_create, owner_complete_setup | grant select on public.businesses to authenticated<br>grant insert (owner_id,name,business_type) on public.businesses to authenticated<br>grant insert (country,time_zone), update (country,time_zone) on public.businesses to authenticated<br>grant update (name, business_type) on public.businesses to authenticated |
| `public.waitlist_subscribers` | None; private/no public policy | grant select,insert,update,delete on public.waitlist_subscribers to service_role |
| `quote_private.ingress` | None; private/no public policy | No direct table grant in source |
| `request_private.ingress` | None; private/no public policy | No direct table grant in source |
| `staff_private.ingress` | None; private/no public policy | No direct table grant in source |
| `waitlist_private.delivery_events` | None; private/no public policy | No direct table grant in source |
| `waitlist_private.outbox` | None; private/no public policy | No direct table grant in source |
| `waitlist_private.rate_limits` | None; private/no public policy | No direct table grant in source |

## Views

| View | Last migration definition | Reads | Security |
|---|---|---|---|
| `public.business_booking_schedule` | `supabase/migrations/20261113103036_staff_booking_assignment.sql:62` | public.business_booking_staff, public.business_bookings, public.business_staff | Invoker; authenticated SELECT, source owner RLS dependencies |
| `public.business_invoice_list` | `supabase/migrations/20261114161207_foundation_batch_one.sql:35` | public.business_invoice_payments, public.business_invoices | Invoker; authenticated SELECT, source owner RLS dependencies |
| `public.business_quote_list` | `supabase/migrations/20261113075926_customer_quotes.sql:94` | public.business_quotes | Invoker; authenticated SELECT, source owner RLS dependencies |

## Functions and RPCs

81 overload identities under 79 function names. Each row below uses the manual-activation scenario; migrations-only and rollback sources remain separately mapped in JSON. Public functions are potential PostgREST entry points only where execute/schema privileges allow them; private helpers with USAGE/EXECUTE are also direct SQL attack surfaces. Transitive reads/writes follow the recorded calls and triggers. Read/write columns are filtered lexical candidates; dynamic link targets are expanded explicitly below.

| Signature | Security | Reads | Writes | Effective source |
|---|---|---|---|---|
| `booking_private.instant(timestamp,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113090007_bookings_scheduling.sql:9` |
| `booking_private.owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text)` | definer | booking_private.ingress, public.business_bookings, public.business_quotes, public.business_service_catalogues, public.businesses | public.business_bookings | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:199` |
| `customer_private.booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text,uuid)` | definer | public.business_bookings, public.business_customers, public.business_quotes | public.business_bookings | `supabase/migrations/20261113094646_customer_profiles.sql:89` |
| `customer_private.link(uuid,text,uuid,text,uuid,integer)` | definer | public.business_customers | public.business_bookings, public.business_enquiries, public.business_quotes | `supabase/migrations/20261113094646_customer_profiles.sql:64` |
| `customer_private.owner(uuid,text)` | definer | customer_private.ingress, public.businesses | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:39` |
| `customer_private.quote_create(uuid,text,uuid,integer,text,jsonb,date,uuid,uuid)` | definer | public.business_customers, public.business_enquiries, public.business_quotes | public.business_quotes | `supabase/migrations/20261113094646_customer_profiles.sql:76` |
| `customer_private.search(uuid,text,text,integer)` | definer | public.business_customers | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:42` |
| `customer_private.valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:8` |
| `customer_private.write(uuid,text,uuid,integer,jsonb,boolean)` | definer | public.business_customers | public.business_customers | `supabase/migrations/20261113094646_customer_profiles.sql:47` |
| `enquiry_private.manual_create(uuid,text,uuid,text,text,text,text)` | definer | enquiry_private.ingress, public.business_enquiries, public.businesses | public.business_enquiries | `supabase/migrations/20261114153753_enquiry_manual_validation.sql:3` |
| `enquiry_private.queue_mail()` | definer | enquiry_private.mail_settings, public.business_public_pages, public.businesses | enquiry_private.mail_outbox | `supabase/migrations/20261114131512_enquiry_notifications.sql:18` |
| `enquiry_private.record_activity()` | definer | Via calls / JSON / no table read | public.business_enquiry_activity | `supabase/migrations/20261114152048_enquiry_workflow.sql:20` |
| `enquiry_private.submit(text,text,text,text,text,text,text,uuid)` | definer | enquiry_private.ingress, enquiry_private.rate_limits, public.business_enquiries, public.business_public_pages | enquiry_private.rate_limits, public.business_enquiries | `supabase/migrations/20261113055208_customer_enquiries.sql:35` |
| `enquiry_private.touch()` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113055208_customer_enquiries.sql:32` |
| `invoice_private.customer(text,text)` | definer | invoice_private.ingress, public.business_invoice_payments, public.business_invoices | Via calls / trigger NEW / none | `supabase/migrations/20261113122458_invoices_payments.sql:137` |
| `invoice_private.payment(uuid,text,uuid,uuid,bigint,date,text,uuid,text)` | definer | invoice_private.ingress, public.business_invoice_payments, public.business_invoices, public.businesses | public.business_invoice_events, public.business_invoice_payments, public.business_invoices | `supabase/migrations/20261113122458_invoices_payments.sql:107` |
| `invoice_private.total(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113122458_invoices_payments.sql:10` |
| `invoice_private.write(uuid,text,uuid,integer,text,jsonb,date,uuid,text)` | definer | invoice_private.ingress, public.business_bookings, public.business_invoice_payments, public.business_invoices, public.business_profiles, public.business_service_catalogues, public.businesses | invoice_private.counters, public.business_invoice_events, public.business_invoices | `release/activate-foundation.sql:34` |
| `public.business_booking_available(text,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114090043_business_template_availability_boundary.sql:13` |
| `public.business_booking_request_action(uuid,text,uuid,integer,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113183501_online_booking_requests.sql:108` |
| `public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113183501_online_booking_requests.sql:107` |
| `public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:107` |
| `public.business_booking_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113090007_bookings_scheduling.sql:78` |
| `public.business_customer_booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text,uuid)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:124` |
| `public.business_customer_link(uuid,text,uuid,text,uuid,integer)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:116` |
| `public.business_customer_quote_create(uuid,text,uuid,integer,text,jsonb,date,uuid,uuid)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:120` |
| `public.business_customer_search(uuid,text,text,integer)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:108` |
| `public.business_customer_write(uuid,text,uuid,integer,jsonb,boolean)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113094646_customer_profiles.sql:112` |
| `public.business_dashboard(uuid,text,date)` | invoker/default | public.business_booking_schedule, public.business_enquiries, public.business_invoice_list, public.business_invoice_payments, public.business_invoices, public.business_quotes, public.business_service_catalogues, public.businesses | Via calls / trigger NEW / none | `supabase/migrations/20261114152048_enquiry_workflow.sql:76` |
| `public.business_enquiry_create(uuid,text,uuid,text,text,text,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113143833_dashboard_overview.sql:61` |
| `public.business_enquiry_mail_claim(text)` | definer | enquiry_private.mail_outbox, enquiry_private.mail_settings | enquiry_private.mail_outbox | `supabase/migrations/20261114131512_enquiry_notifications.sql:40` |
| `public.business_enquiry_mail_finish(uuid,uuid,text,boolean,text)` | definer | Via calls / JSON / no table read | enquiry_private.mail_outbox | `supabase/migrations/20261114131512_enquiry_notifications.sql:51` |
| `public.business_enquiry_mail_status(uuid,text,uuid)` | definer | enquiry_private.mail_outbox, public.businesses | Via calls / trigger NEW / none | `supabase/migrations/20261114131512_enquiry_notifications.sql:61` |
| `public.business_enquiry_status(uuid,text,uuid,text,integer)` | invoker/default | Via calls / JSON / no table read | public.business_enquiries | `supabase/migrations/20261113055208_customer_enquiries.sql:67` |
| `public.business_enquiry_submit(text,text,text,text,text,text,text,uuid)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113055208_customer_enquiries.sql:66` |
| `public.business_enquiry_workflow_save(uuid,text,uuid,integer,text,text,date)` | invoker/default | public.businesses | public.business_enquiries | `supabase/migrations/20261114152048_enquiry_workflow.sql:31` |
| `public.business_enquiry_workspace(uuid,text,uuid,integer)` | invoker/default | public.business_bookings, public.business_enquiries, public.business_enquiry_activity, public.business_quote_list, public.businesses | Via calls / trigger NEW / none | `supabase/migrations/20261114152048_enquiry_workflow.sql:43` |
| `public.business_invoice_customer(text,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113122458_invoices_payments.sql:153` |
| `public.business_invoice_payment(uuid,text,uuid,uuid,bigint,date,text,uuid,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113122458_invoices_payments.sql:152` |
| `public.business_invoice_write(uuid,text,uuid,integer,text,jsonb,date,uuid,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113122458_invoices_payments.sql:151` |
| `public.business_page_services_snapshot()` | invoker/default | public.business_service_catalogues | Via calls / trigger NEW / none | `supabase/migrations/20261112215916_services_pricing.sql:61` |
| `public.business_profile_publish(uuid,text,integer)` | invoker/default | public.business_profiles, public.businesses | public.business_profiles, public.business_public_pages | `supabase/migrations/20261114125658_business_area_pages.sql:115` |
| `public.business_profile_save(uuid,text,text,jsonb,integer)` | invoker/default | public.businesses | public.business_profiles | `supabase/migrations/20261112195239_business_profiles.sql:58` |
| `public.business_profile_unpublish(uuid,text)` | invoker/default | public.business_profiles, public.business_public_pages | public.business_profiles, public.business_public_pages | `supabase/migrations/20261112195239_business_profiles.sql:79` |
| `public.business_profile_valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114125658_business_area_pages.sql:4` |
| `public.business_quote_customer(text,text,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113075926_customer_quotes.sql:90` |
| `public.business_quote_send(uuid,text,uuid,integer,boolean)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114161207_foundation_batch_one.sql:26` |
| `public.business_quote_write(uuid,text,uuid,integer,text,jsonb,date,uuid)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113075926_customer_quotes.sql:89` |
| `public.business_service_image(text,text,text)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114113021_service_card_images.sql:69` |
| `public.business_service_image_valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114113021_service_card_images.sql:3` |
| `public.business_services_publish(uuid,text,integer)` | invoker/default | public.business_profiles, public.business_service_catalogues | public.business_public_pages, public.business_service_catalogues | `supabase/migrations/20261112215916_services_pricing.sql:48` |
| `public.business_services_save(uuid,text,jsonb,integer)` | invoker/default | public.businesses | public.business_service_catalogues | `supabase/migrations/20261112215916_services_pricing.sql:40` |
| `public.business_services_save_image(uuid,text,jsonb,integer,text,jsonb,text)` | invoker/default | public.businesses | public.business_service_images | `supabase/migrations/20261114113021_service_card_images.sql:49` |
| `public.business_services_valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114113021_service_card_images.sql:24` |
| `public.business_staff_assign(uuid,text,uuid,integer,jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113103036_staff_booking_assignment.sql:77` |
| `public.business_staff_write(uuid,text,uuid,integer,text,text,text,boolean)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113103036_staff_booking_assignment.sql:76` |
| `public.waitlist_ack(uuid,uuid,text,text)` | invoker/default | waitlist_private.delivery_events, waitlist_private.outbox | public.waitlist_subscribers, waitlist_private.outbox | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:106` |
| `public.waitlist_claim(uuid)` | invoker/default | public.waitlist_subscribers, waitlist_private.outbox | waitlist_private.outbox | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:89` |
| `public.waitlist_cleanup()` | invoker/default | public.waitlist_subscribers, waitlist_private.delivery_events, waitlist_private.outbox, waitlist_private.rate_limits | public.waitlist_subscribers, waitlist_private.delivery_events, waitlist_private.outbox, waitlist_private.rate_limits | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:136` |
| `public.waitlist_delivery(text,text,text)` | invoker/default | waitlist_private.outbox | public.waitlist_subscribers, waitlist_private.delivery_events, waitlist_private.outbox | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:123` |
| `public.waitlist_export(uuid)` | invoker/default | public.waitlist_subscribers | Via calls / trigger NEW / none | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:150` |
| `public.waitlist_rate(text,integer,integer)` | invoker/default | Via calls / JSON / no table read | waitlist_private.rate_limits | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:39` |
| `public.waitlist_signup(text,text,text,text[],text,text,text,text)` | invoker/default | public.waitlist_subscribers | public.waitlist_subscribers, waitlist_private.outbox | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:49` |
| `public.waitlist_status()` | invoker/default | public.waitlist_subscribers, waitlist_private.outbox | Via calls / trigger NEW / none | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:145` |
| `public.waitlist_transition(text,text)` | invoker/default | Via calls / JSON / no table read | public.waitlist_subscribers, waitlist_private.outbox | `supabase/migrations/20261112123416_waitlist_supabase_resend.sql:69` |
| `quote_private.customer(text,text,text)` | definer | public.business_quotes, quote_private.ingress | public.business_quotes | `supabase/migrations/20261113075926_customer_quotes.sql:71` |
| `quote_private.guard_free()` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `release/activate-foundation.sql:12` |
| `quote_private.owner_write(uuid,text,uuid,integer,text,jsonb,date,uuid)` | definer | public.business_booking_requests, public.business_enquiries, public.business_profiles, public.business_quotes, public.business_service_catalogues, public.businesses, quote_private.ingress | public.business_quotes | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:169` |
| `quote_private.send(uuid,text,uuid,integer,boolean)` | definer | public.business_quotes, public.businesses, quote_private.ingress | public.business_quotes | `release/activate-foundation.sql:20` |
| `quote_private.valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261114152048_enquiry_workflow.sql:61` |
| `request_private.action(uuid,text,uuid,integer,text)` | definer | booking_private.ingress, public.business_booking_requests, public.business_bookings, public.business_enquiries, public.business_quotes, public.business_service_catalogues, public.businesses, quote_private.ingress, request_private.ingress | public.business_booking_requests, public.business_bookings | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:110` |
| `request_private.available(text,text)` | definer | public.business_public_pages, request_private.ingress | Via calls / trigger NEW / none | `supabase/migrations/20261114090043_business_template_availability_boundary.sql:3` |
| `request_private.calculate(jsonb,text,jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:18` |
| `request_private.options_valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:2` |
| `request_private.scope_valid(jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:40` |
| `request_private.service_image(text,text,text)` | definer | public.business_public_pages, public.business_service_images | Via calls / trigger NEW / none | `supabase/migrations/20261114113021_service_card_images.sql:61` |
| `request_private.submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb)` | invoker/default | Via calls / JSON / no table read | Via calls / trigger NEW / none | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:106` |
| `request_private.submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb)` | definer | public.business_booking_requests, public.business_enquiries, public.business_public_pages, request_private.ingress | public.business_booking_requests | `supabase/migrations/20261113235814_service_rooms_extras_pricing.sql:82` |
| `staff_private.assign(uuid,text,uuid,integer,jsonb)` | definer | public.business_booking_staff, public.business_bookings, public.business_staff | public.business_booking_staff, public.business_bookings | `supabase/migrations/20261113103036_staff_booking_assignment.sql:46` |
| `staff_private.owner(uuid,text)` | definer | public.businesses, staff_private.ingress | Via calls / trigger NEW / none | `supabase/migrations/20261113103036_staff_booking_assignment.sql:8` |
| `staff_private.write(uuid,text,uuid,integer,text,text,text,boolean)` | definer | public.business_staff | public.business_staff | `supabase/migrations/20261113103036_staff_booking_assignment.sql:33` |

`customer_private.link` dynamically updates exactly the allowlisted enquiry/quote/booking table, with business/environment/version and unlinked-customer guards. Identifier placeholders cannot be resolved by a lexical scan. Triggers mutate NEW and append enquiry activity/outbox records; inventory contains all CREATE TRIGGER and body statements.

## Application, file and provider surfaces

| Surface | Reads / writes | Access and preservation boundary |
|---|---|---|
| Account Auth | signup/resend/signin/refresh/user/verify/recover/logout; user PUT for name/email/password | Auth identity separate from customer directory and staff. Account name optimistic UI hash is not native compare-and-set. Confirmation/recovery/token semantics remain unchanged. |
| Business setup/settings | business() SELECT limit=1; businesses POST/PATCH | One owner business. Account update PATCH includes compare-and-set filters; initial setup PATCH differs. No owner/id/delete grant. |
| Private pages | scoped base-table/view GET and profile_rpc | Every literal/dynamic call site, method evidence and source line is in JSON. Dynamic customer activity table map is enquiry/quote/booking. Prefix GETs in list pages inherit business/environment filters. |
| Public website | allowed business_public_pages columns; sitemap.php; service image RPC; availability RPC | Public projection, no private draft or tenant identifier through anonymous column grants. Published-read policy applies to authenticated users too; never treat public projection as a private tenant boundary. |
| Guest enquiry/booking | submit RPCs, PHP ticket/CSRF/rate limits; five-step tab draft | Shared request/enquiry identity; preferred time not reserved. Browser history contains step names; personal values stay in tab sessionStorage, 30-minute catalogue-matching draft. |
| Quote/invoice links | token-scoped customer RPC; quote POST decision / invoice GET read | Possession capability; no customer directory/Auth binding or global portal. Preserve 64-hex tokens and source redaction. |
| Media | logo/homepage/SEO JSON base64; service image immutable DB rows and photo IDs | No application Supabase Storage API call found. Private image GET and public published image RPC must stay distinct. Backup Storage metadata is not object bytes. |
| Enquiry mail | insert trigger → private outbox; service_role claim/finish; owner mail-status | Owner verified Auth email routing, preview recipient allowlist, 20-job bounded dispatch and stable provider key. No synthetic provider calls in SC-02. |
| Waitlist | service-role rate/signup/transition/claim/ack/delivery/cleanup/status/export | Outside shared booking core but preserve all records/tokens/consent/unsubscribe/outbox/delivery state; cleanup policy must not be replayed as migration. CSV export private CLI only. |
| Monitoring/config | private JSON/JSONL/locks/state, external health GET, owner-only sealed config | Existing local I/O call sites retained in inventory; no raw customer values in new evidence. No status check or watchdog invoked here. |
| Backup/recovery | read-only MVCC dump/fingerprints, role/schema metadata; isolated restore | Source schemas enumerated by recovery code; optional auth/storage migration metadata and provider-managed internals need separate proof. Never run restore against hosted project. |

The inventory includes 96 HTTP/RPC call or dispatch sites and a separate lexical local-I/O/query-site ledger. Lines include error-routing predicates as well as actual calls; counts are sites, not unique endpoints. Function EXECUTE inheritance, owner/superuser grants, default ACLs and external provider-managed objects cannot be inferred solely from GRANT counts.
