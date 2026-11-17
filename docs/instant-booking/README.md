# One-time Regular Cleaning preview

The customer starts on the business booking form, selects Regular Cleaning, enters an address and room quantities, and chooses a covered area. **See available times** opens the preview checkout. The original request option serves customers who need a quote or an area check.

The owner opens **Services → Instant booking settings**, selects a published fixed-price Regular Cleaning service, eligible cleaners and covered areas, then saves. Prices use ZAR. Working hours, buffers and time off come from the existing strict scheduling controls. The published service settings determine room prices, included quantities, compulsory fees and duration. A starting price needs an explicit owner decision and publication as a fixed price before instant checkout becomes available.

## Review installation

Use an isolated synthetic preview with the V1-005 strict scheduling schema and an enabled preview scheduling policy. Apply preview.sql once after reviewing the schema and ACLs. Create a dedicated login with membership in faraios_preview_checkout. Give it no other role memberships or table grants. Use a TLS-verified database connection. Keep the schema installation and preview PHP release separate from main and from live account settings. Apply only the small integration hunks to the installed overlay versions of the existing form, script, rewrite rules and owner Services page. Compare preimages before any hosted installation.

In the private preview account configuration set instant_test_enabled, instant_dsn, instant_user, instant_password and instant_paystack_key. The payment key must start with sk_test_. Configure the test integration's webhook URL as the preview base URL followed by /b/instant.php?webhook=1. The checkout callback and signed webhook both verify the transaction directly with Paystack. Use the operator's sandbox account and synthetic email addresses only. The offline suite uses a loopback provider fixture with the same initialize and verify contracts.

## Reservation and payment behavior

Slots start on the half hour, over the next 30 days in Africa/Johannesburg. The full visit and both scheduling buffers must fit. Unassigned work blocks an overlapping interval conservatively. Checkout serializes reservations with the existing business/environment schedule lock. Owner assignments and reschedules cannot take an overlapping held cleaner. An unassigned booking created after the hold cannot take priority over it. A slot stays held for ten minutes, or until the job starts if earlier. A failed or abandoned test checkout creates no booking. Expired holds stop consuming capacity automatically.

Confirmation requires the exact test reference, ZAR amount in cents, successful test-domain receipt and available staff. Booking and assignment commit together. Callback and webhook retries return the same booking. A late verified payment or a change to the eligible service or capacity routes the reference to review. Operators can reconcile test exceptions in instant_private.holds using the reference prefixed with fi- in Paystack. No automated refund or customer notification is configured. Preview test receipts are separate from the production invoice/payment ledger.

Disable the private preview flag to hide the entry. If there are pending payment redirects, keep verification available until those references are reconciled before removing access. Retain existing records.
