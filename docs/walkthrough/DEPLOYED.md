# Walkthrough publication and Crozdesk handoff — 15 November 2026

Owner requested completing the existing Crozdesk listing and publishing the guide.
Owner confirmed “Completely free” for the current prototype pricing model.

PR #63 merged and Plesk main pulled/deployed dca0d2b4b59d8a9b992444dd39f6cbf2434ed8b7.
No preview Git repository was pulled. Published guide:
https://www.faraios.com/guides/enquiry-to-invoice

Latest-head a4ab914cf4cbe137956a916350572ea4cdcee911 passed all three workflows:
Foundation 43696181285; Database backup 43696181280; Private configuration 43696181296.
Eight local SC-02 methods passed. No account, SQL, config, role, notification,
intake, customer-message, financial-record or business-publication mutation.

Seven preview and seven live HTTP acceptance cases PASS, including exact source
bytes for guide, pricing, About and homepage; H1/canonical/description; guide
Article JSON-LD and all fragment targets; two canonical aliases and an unknown
guide 404. Both stylesheets returned exact source bytes. Sitemap HTTP200, 31 URLs,
guide canonical included, no preview leakage. The earlier twelve-page repair
regression remains PASS across 35 HTTP acceptance cases after publication.

Preview guide at 320, 390, 768 and 1280px had no horizontal overflow or broken
images. Contents link reached the handover checklist; FAQ expanded. Live 390px
check had no overflow and 17px article paragraph font. Desktop live screenshot is
retained; a transient screenshot taken during viewport transition was not used as
visual acceptance. Preview screenshots plus source/HTTP equality support the same
published page. No customer workflow mutations were replayed for this content task.

Crozdesk general information, five supported feature flags, free pricing and eight
FAQs are saved. General description now explicitly says the prototype is completely
free; the tour URL points to the published guide. Status page confirms General,
Features, Pricing and FAQs complete, Assets missing, “Not yet submitted.”

Required assets prepared and retained in the merged source:
- assets/FaraiOS-icon-600.png — 600×600 export of the canonical brand favicon SVG.
- assets/business-website.jpg — actual public Shalean website interface, 1585×991.

Browser asset download/transfer did not complete; no successful asset upload is
claimed. A browser request to chrome://downloads was blocked by URL policy and was
not bypassed. Direct asset bundling also failed to fetch. Manual upload remains.
No Vendor Policy/Privacy Policy acceptance or Submit for Review action occurred.
The vendor Assets tab is marked for handoff; guide tab is retained for review.
Owner must approve the policy acceptance at action time before final submission.

GoodFirms cleanup remains dependent on support; no support message was sent here.
No paid promotion, campaign or new directory account was created. These records
supersede the pre-release pending wording in README.md.
