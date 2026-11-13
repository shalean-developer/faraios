# Invoices production release — 13 November 2026

Owner accepted preview and instructed Deploy. PR #12 merged as 5c9f8213f515e9104fc6723a733c5262419c0148 (reviewed head 9d8a30ab94106259ab6de69368c954404d8c9422). GitGuardian PASS; automated code review completed without findings. Native invoice financial/concurrency/authorization suite rerun PASS; earlier 16 targeted tests and hosted rollback probes PASS.

Connected Plesk production main pull and automatic deployment both reported Done; production card shows PR #12. Enabled invoice_private.ingress for live in fresh rxelmugnucfajrqmphhe after checking migration source normalized MD5 b6c9cac99ae7fb103d5507b1469eeee1. Preview remains enabled. No migration reapplication required.

Post-release: invoice RLS true; direct authenticated payment UPDATE false; live invoices 0; preview invoices 2; Shalean unpublished. Existing booking/quote/staff fingerprints unchanged (see invoices-preview.md). Production public invoice route rejects a preview token. No fictional production records created, no notifications, Resend, online payments, accounting integrations, paid CI or waitlist webhook/recovery checks.

Production session expired on navigation; owner renewed sign-in. Verified Welcome has Invoices, authenticated live invoice list loads with No invoices yet and no preview banner/preview records, live Create invoice opens an empty draft form with business currency and due date, and returning to list still shows no invoices. No draft or payment was saved in production. Such save/reload verification awaits a suitable real invoice or explicit approval for labelled production test data. Full payment journey remains proven in preview.

PASS: deployment, activation and authenticated read-only production verification. Retain limitation of one invoice per booking including voided invoices. Rollback: disable invoice_private.ingress live and restore PR #11 application while retaining all invoice, payment, event and counter data. Screenshots: evidence/invoices-production-deployment.jpg and evidence/invoices-production-form.jpg.
