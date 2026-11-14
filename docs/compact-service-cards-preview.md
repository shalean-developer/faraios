# Compact homepage service cards

Homepage cards now use the first sentence of the saved service description, bounded to 120 Unicode characters and shortened at a word boundary where available. Full saved descriptions remain on the standalone Services page. Cards link to the matching service anchor there, including private profile-preview navigation. No business data, schema or pricing calculations change.

Homepage duration and repeated option notices are removed. One shared rooms/extras price note appears only when visible services actually have options. Price modes/currencies remain authoritative. Standalone durations, notices, full descriptions and booking/enquiry actions remain unchanged. The separate booking flow is untouched.

Local validation: PHP lint and diff checks; existing homepage browser suite at 1280/390/320 with default/custom content and signed-in/out states; all four standalone page browser tests at the same widths. All pass. Additional PHP checks passed for first-sentence selection, 120-character Unicode bounds and long unbroken text. Hosted preview verification follows before production approval. No profile or service save/publish is part of this release.
