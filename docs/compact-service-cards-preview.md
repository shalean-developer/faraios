# Compact homepage service cards

Homepage cards now use the first sentence of the saved service description, bounded to 120 Unicode characters and shortened at a word boundary where available. Full saved descriptions remain on the standalone Services page. Cards link to the matching service anchor there, including private profile-preview navigation. No business data, schema or pricing calculations change.

Homepage duration and repeated option notices are removed. One shared rooms/extras price note appears only when visible services actually have options. Price modes/currencies remain authoritative. Standalone durations, notices, full descriptions and booking/enquiry actions remain unchanged. The separate booking flow is untouched.

Local validation: PHP lint and diff checks; existing homepage browser suite at 1280/390/320 with default/custom content and signed-in/out states; all four standalone page browser tests at the same widths. All pass. Additional PHP checks passed for first-sentence selection, 120-character Unicode bounds and long unbroken text. Hosted preview verification follows before production approval. No profile or service save/publish is part of this release.

## Hosted checkpoint

Candidate f502c8e29091bd2a9713716bc2e5f46dd65422d6 is deployed only to manual accounts-preview. Production remains main/7d8760f; waitlist target unchanged. Actual hosted demo shows three concise summaries, all price modes and no home-card durations; one shared option note. Deep cleaning View details opens /services#service-22222222222222222222222222222222 and resolves an existing article, with full details, durations and existing service actions retained. At 390px neither Services nor Home overflows. Viewport reset and homepage left open for review. Screenshot capture timed out twice; no screenshot evidence is claimed. No forms were submitted or records/publications changed. Draft PR28 remains unmerged pending owner review.
