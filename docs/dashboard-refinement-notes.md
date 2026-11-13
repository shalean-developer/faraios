# Dashboard refinement and navigation notes

13 November 2026. Status: discussion notes saved at the owner's request. No redesign, implementation or deployment is approved by this note. The owner is exploring structure and asking whether a sidebar would suit FaraiOS New.

## Saved dashboard refinement recommendations

The current dashboard is a working first version, with verified calculations and permissions. Refine presentation around three questions: What is happening today? What needs attention? What money is outstanding?

- Shorten explanatory text; retain definitions in How figures are calculated.
- Reduce oversized empty cards and unnecessary empty space.
- Prioritise upcoming bookings, overdue invoices and unanswered enquiries with clear links to the next action.
- Emphasise Outstanding now, Overdue now and Net payments for the selected month. Keep gross payment/reversal breakdown secondary and preserve clear period/currency labels.
- Use consistent navigation across private pages.
- Preserve all financial definitions, integer calculations, reversals, business time zones, owner permissions, business isolation and existing history.

## Sidebar structure option

A shared application layout with a left sidebar would suit the growing number of private workflows. Sidebar navigation is for the whole private application; the dashboard is the Overview page within it.

Suggested single-word links, grouped with modest visual spacing:

- Overview
- Enquiries
- Quotes
- Bookings
- Customers
- Staff
- Invoices
- Services
- Profile
- Settings

Settings is a proposed navigation destination; do not imply that a new settings feature already exists. Existing account/location controls can be mapped during a future design review. Avoid adding placeholder destinations or invented modules.

Desktop: persistent left sidebar, clear active page, business identity, scrollable main content. A compact top bar holds the page title, a relevant create action and account menu. Do not duplicate all sidebar links above page content.

Mobile: sidebar becomes an accessible menu drawer with an obvious menu button, current page title, focus management, keyboard dismissal and sufficiently large touch targets. Keep the content area full width.

Overview content order: compact summary figures; Today's bookings and Needs attention; outstanding invoices/payment summary; contextual empty states. Adjust desktop columns to available width and stack cleanly on mobile.

This option requires a preview of the shared layout across existing pages before any implementation or release approval. A sidebar alone does not resolve oversized cards, weak prioritisation or financial presentation.
