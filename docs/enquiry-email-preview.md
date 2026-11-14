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
