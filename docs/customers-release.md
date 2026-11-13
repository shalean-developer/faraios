# Customer Profiles — production release

Owner instructed Deploy on 13 November 2026 SAST. PR #10 merged as ea4c39728d4752c9bd0a2199aea71f70dce40195. Reviewed final application head abe8cc2fd5927083474448163dae1ee331794c9a; automated code review completed with no findings and secret scanning passed. Release hardening preserves unlinked quote/booking creation when customer operations are disabled. Targeted quote, booking and customer suites rerun PASS; broader 14-test baseline and hosted rollback probes already passed.

Connected Plesk production faraios.git main pulled and automatically deployed to /faraios.com; card confirms PR #10. Preview stays feature/customers-20261113, waitlist preview unchanged. Connected fresh Supabase rxelmugnucfajrqmphhe customer_private.ingress live enabled=true. No migration change beyond previously installed 20261113094646.

Authenticated production checks PASS using the currently signed-in test-business owner account; the separate Shalean owner session is not claimed. Welcome retains complete business setup and exposes Customers. Customers list empty, reload succeeds, create form exposes name/email/phone/address/private notes. No preview records leak. Existing Bookings/Quotes/Enquiries remain empty and accessible; booking currency ZAR/time zone Africa/Johannesburg preserved. No fictional production record saved. Original public-profile tab left unchanged.

Public checks PASS: homepage, waitlist and shared stylesheet HTTP 200 and byte-identical to preserved source; customer helper 403; unpublished Shalean public URL 404; anonymous Customers redirects to sign-in. Final SQL: live customer gate true; live customers/quotes/bookings zero; preview customers two; no live public pages; Shalean unpublished. Baseline businesses three retained.

Production Customers left open. Screenshot: docs/evidence/customers-production.jpg. Full create/edit/duplicate/link/quote acceptance/booking conversion and mobile workflows were exercised in isolated preview, with simulated cross-owner JWT database probes; production verification deliberately uses read-only smoke checks. No Resend/email, waitlist webhook/recovery, staff, recurring booking or payment operations. V1 limitations remain in docs/customers-preview.md.

Rollback: disable customer_private.ingress live, restore application to PR #9, preserve all customer/association records. Unlinked quote/booking paths remain independent of the customer gate.
