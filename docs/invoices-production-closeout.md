# Production invoice verification closeout — 13 November 2026

Owner requested completion of remaining live invoice tests, then reconnected the browser to finish cleanup. No application/schema changes or new deployment were needed. Production remains PR #12 merge 5c9f8213f515e9104fc6723a733c5262419c0148.

PASS: manual draft creation/save/reload, integer calculations (2 × R123.45 + 3 × R10 = R276.90), issuance, secure customer link, Unpaid → Part Paid (R100, balance R176.90) → Paid (additional R176.90, balance R0). Owner and customer reloads matched. Duplicate entry and R200 overpayment rejected. Reversed both payments with explicit test-cleanup reasons; originals retained. Voided manual test invoice 56A668AE / INV-000001 and confirmed customer page says no payment is due.

PASS: booking-source test 10BBEB8F (unassigned, clearly labelled PRODUCTION TEST, one minute 00:00–00:01 on 13 November, no physical service address). Created invoice 85EC16B3 / INV-000002, saved/reloaded agreed 2 × R25.25 = R50.50 and due date 28 November, issued with the distinct second number, then voided. Browser timeout interrupted final cleanup; after reconnection confirmed invoice Void, cancelled booking through existing owner UI, reloaded to confirm Cancelled, and repeated Create/open invoice returned the existing invoice with no duplicate.

Final connected Supabase read-only verification:
- Both test invoices Void, net paid 0, amount due 0.
- Manual ledger retains 4 immutable entries: 2 payments and 2 matching reversals; net_minor 0.
- Bookings 10BBEB8F, 8EF88DF7 and 14616616 all Cancelled.
- Pre-existing booking fingerprint (excluding the new production fixture and earlier preview fixture): 6c17605e8ed3bb2e60a2f1e3b81f492c, matching baseline.
- Quotes fingerprint: 1be781b4754930d66944ea0943488e62, matching baseline.
- Staff fingerprint: 0babe4129c1f13c6db0e358b2ec4b5ff, matching baseline.
- Shalean public page remains unpublished.

No real funds moved, no notifications were sent, and no Resend, online payment, accounting integration or waitlist webhook/recovery checks were used. Retain all labelled test records and audit history. Screenshot: evidence/invoices-production-closeout.jpg. Decision: PASS — outstanding production invoice/payment verification and cleanup complete.
