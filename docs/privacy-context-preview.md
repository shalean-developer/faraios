# Waitlist privacy-only preview patch

Base001f72a on feature/waitlist-20261112. Owner requested contextual Privacy fixes. This branch changes only privacy.html/privacy.css, Privacy link anchors, email privacy URL environment selection and noindex headers for the waitlist preview. No accounts/homepage/booking features imported; no database migration, consent-version change, intake activation or emails sent.

The policy text/CSS exactly match the accounts-preview candidate. Before deployment:15 disposable native waitlist journey tests pass against this branch; Privacy HTML/text email configuration/escaping contracts pass on the equivalent code in PR22. Existing provider retry, consent, webhook, suppression, maintenance and unsubscribe behavior retained.

This patch targets only manual /_waitlist-preview. Production main remains unchanged; no production merge is authorized. Details, policy facts and legal limitations are recorded in PR22 docs/privacy-context-preview.md.

Hosted checkpoint14 November2026: c5dedb8 deployed only to the manual waitlist-preview target after selecting fix/waitlist-privacy-20261114. Plesk completed/Done. Updated waitlist policy bytes match the updated accounts preview exactly; policy/CSS noindex and waitlist form/confirm/unsubscribe GET Privacy anchors pass. Production unchanged. All15 public-table full-row counts/fingerprints match before/after. No hosted signup, token transition, customer record edit, email send or history deletion. Primary evidence is committed with PR22 in docs/evidence/privacy-hosted-checks.json and privacy-preservation.json. PR23 stays draft/unmerged.
