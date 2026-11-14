# Contact UI and enquiry email — preview

Scope: compact responsive contact UI plus reliable administrator and customer transactional notifications. No production merge/deployment, live intake activation, Shalean profile save/republication, historical backfill, marketing subscription or real email send in this task.

## Customer experience

Short Send an enquiry heading, balanced 40/60 desktop contact/form layout, full-width name, side-by-side email/phone on desktop, single-column phone/email at narrow widths, smaller form padding and requirements box, brand-coloured action and visible focus. Fields retain values on validation errors. Email or phone remains sufficient. The successful submission message confirms the saved enquiry without falsely promising delivery.

Public submission saves first; an atomic database trigger can queue separate admin and customer messages. Admin alert goes only to the business owner's confirmed Auth email, not the editable public business email. Customer acknowledgement goes to the supplied email, when present. Reply-to is the customer for admin alerts and the published business email for customer acknowledgements. Customer emails deliberately omit free-text requirements, customer name and phone to limit reflection abuse. They state that an enquiry is not a booking or accepted quote. Admin email links to authenticated enquiry details. No attachment, tracking, inbound mail processing or AI actions.

## Delivery controls

Migration creates private RLS tables, default-off settings for each environment, and service-role-only claim/finish RPCs. No existing row mutations or backfill. Only new public enquiries queue when explicitly enabled. Manual enquiries do not queue. Unique enquiry/kind prevents duplicates. A CLI worker uses private configuration outside the site, an explicit preview recipient allowlist, a lease, provider idempotency keys, bounded batches and timeouts. Transient errors retry with backoff; permanent errors fail. Five attempts maximum; stale jobs and sends outside a 20-hour retry window require attention. Existing enquiry spam controls remain in force. Queue payloads/addresses cannot be read by anonymous users or other businesses. Owners can inspect outcome summaries in Enquiries, without seeing credentials or private recipient data. Accepted means provider accepted, not inbox delivered.

## Verification

PASS disposable native PostgreSQL/PHP queue and owner isolation: disabled by default, no old-row sends, duplicate submission produces exactly two jobs, verified owner resolution, no customer body reflection, phone-only sends admin only, unverified owner omitted, role denials, owner-only status, lease exclusion, stale acknowledgement rejection, retry delay and expiration. Existing enquiry HTTP/security suite PASS. PHP dispatcher tests PASS: escaped HTML/plain text, stable provider keys, separate recipients, temporary/permanent failures and preview recipient blocking. Contact layout at 1280/800/390/320 PASS with no overflow. No real provider calls were made in these tests.

## Activation prerequisites

Connected Resend account currently shows shalean.co.za verified, not a FaraiOS domain. Do not send generic FaraiOS multi-business notifications from the Shalean sender. Confirm the FaraiOS provider account and verified sender; provision a private, scoped sending key and project service credential outside the public web root. Keep them out of Git and chat. Do not change waitlist/Auth sender credentials.

Private config example (placeholders only):

```php
<?php return [
 'enabled'=>false,
 'environment'=>'preview',
 'base_url'=>'https://www.faraios.com/_accounts-preview',
 'supabase_url'=>'https://rxelmugnucfajrqmphhe.supabase.co',
 'service_key'=>'FROM_PRIVATE_SECRET_STORE',
 'resend_key'=>'FROM_PRIVATE_SECRET_STORE',
 'sender'=>'notifications@notify.faraios.com',
 'allow_recipients'=>['support@faraios.com'],
];
```

Use a separate private config for live. Configure Plesk's scheduled CLI command every minute using the actual host PHP binary and script path, with FARAIOS_ENQUIRY_MAIL_CONFIG pointing outside the web root. Validate against an owner-approved test mailbox first, inspect provider acceptance/delivery, then explicitly activate dispatch for the selected environment. Keep public booking intake gates unchanged. Never enable live dispatch as part of preview testing.

Rollback: disable mail_settings for affected environment and private worker enabled flag, stop its schedule, and revert UI application. Keep queue rows for audit; no deletion is required. Do not bulk retry unknown/expired sends.

Decision: CONDITIONAL PASS for preview. Outbound activation remains blocked on verified FaraiOS sender, private worker setup, scheduler and owner-mailbox delivery verification. Production change requires explicit authorization after preview review.

## Approved addresses

Owner selected notifications@notify.faraios.com as automated sender, support@faraios.com for platform support/replies and each verified business-owner email for admin alerts. The earlier hello@shalean.com test destination is withdrawn and must not be used. Browser confirmed the separate FaraiOS Resend account with notify.faraios.com verified. Plesk support alias was saved on the existing hello@faraios.com mailbox, with no password change. Customer-specific Reply-To continues to use the relevant business/customer address; missing reply addresses fall back to support@faraios.com. New sending-only domain-scoped enquiry key and private worker/schedule setup remain pending; do not claim outbound mail is enabled.

## Private worker setup checkpoint

Owner explicitly approved creating the FaraiOS Enquiries — Plesk sending-only key restricted to notify.faraios.com. Key created; value was masked from automation and owner confirmed saving it in the browser password manager. No secret is recorded in this repository.

Plesk /private/faraios-enquiry-mail/config.php is saved (550 bytes), mode 0600, and read-back confirms the key placeholder, approved sender and enabled=false. It references the existing project database credential server-side through the private waitlist configuration, without altering that file or reusing its Resend key. Earlier Permission denied/stale editor state resolved; actual saved contents and owner-only mode verified. Owner handoff: replace PASTE_NEW_RESEND_KEY_HERE only, preserve quotes and enabled=false, then save.

Plesk scheduled task 264 is saved INACTIVE: faraios.com/_accounts-preview/scripts/enquiry-mail-worker.php, PHP 8.2.35, every minute. Run Now completed successfully with Enquiry mail disabled. Existing waitlist task 263 unchanged. No email sent, no dispatch activation and no production merge. Delivery testing to support@faraios.com follows key entry.

## Real provider delivery test — PASS

Owner pasted the sending key into private config and replied Ready. Read-back checked only non-secret booleans: placeholder absent, preview selected, support-only allowlist retained, sending initially disabled. File mode remains 0600. Enabled private preview worker for this test; production configuration was not activated.

Created one new clearly synthetic Closed preview enquiry 04c046c7-edc6-415e-b980-57cac1ede831 (request e7ec6319-aa27-4af8-8aa2-11febdd8c400) for the existing fictional demo. Two test-only outbox jobs explicitly targeted support@faraios.com, not an actual visitor or other owner. This is a real worker/provider test; owner resolution and public-submit atomic queuing remain covered by native tests, rather than misrepresenting the direct queue fixture as a hosted form submission.

Admin job 5ec90323-4ad7-4625-b6a1-2bebc73dc2bc accepted on attempt 1: Resend 01a1da60-2199-78c9-b7ae-fecba97f36f3. Customer job 07d8bde6-7613-4366-bf9f-0dcaf97b8bc3 accepted on attempt 1: Resend 01a1da60-1c53-7cc9-868c-64bd0dee0910. FaraiOS Resend dashboard shows DELIVERED for both. Inspected acknowledgement headers: From notifications@notify.faraios.com, To and Reply-To support@faraios.com; preview prefix, no confirmed booking claim, no customer free-text echo, platform support footer.

Worker Run Now processed 2 notifications in 4 seconds. Rerun processed 0; both jobs remain attempt 1, confirming no duplicate send. Preserve the Closed test record and queue evidence. Afterwards restored database preview dispatch to false; live dispatch remains false and schedule 264 remains inactive. Private worker config is ready, with its enabled flag true but blocked by the database gate and inactive schedule. No production source merge or live dispatch activation. PASS provider delivery test, pending owner review and explicit production deployment authorization.
