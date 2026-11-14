# Business footer preview

The shared business footer groups the existing public business name and contact details, four page links, and a back-to-top control. A separate lower row contains the copyright, privacy link and FaraiOS attribution. The same footer appears on area detail pages and owner previews.

Responsive checks passed at 1280, 800, 390 and 320 pixels: no horizontal overflow, four navigation links, valid privacy/back-to-top targets and minimum 44-pixel link heights. The existing homepage browser suite and area-page browser suite passed. PHP lint and git diff checks passed.

Screenshots: `docs/evidence/footer-1280.png`, `footer-800.png`, `footer-390.png`, `footer-320.png` (synthetic fixture content).

Release scope: accounts-preview only. No database, published content, booking, enquiry or email-setting changes. Production deployment requires review of the hosted preview.
