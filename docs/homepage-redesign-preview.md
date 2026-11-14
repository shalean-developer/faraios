# Homepage redesign — 14 November 2026

Owner requested a redesign inspired by the FleexStudio Calendar & Scheduling reference. Independent FaraiOS design retains teal/navy branding, account routes and SEO metadata. Homepage-only scope: hero/product illustration, three benefits, hosted website explanation, workspace features, process and native FAQ disclosures. No prices, free-plan claims, testimonials or unverified integrations. Public booking intake remains described as disabled. All product illustrations are labelled fictional. No business publication, private application, schema, configuration or provider behavior changed.

Static checks PASS: single H1, unique IDs, internal anchors, existing file destinations and structured-data JSON. Git whitespace check PASS. Visual/browser checks remain pending: local Chromium cannot start in this runtime; connected browser policy does not permit data URLs. No desktop/mobile/a11y pass claimed.

GitHub push was rejected by automatic approval review because explicit authorization for the external repository write is required. No push, PR, hosted preview or production deployment completed. Production remains unchanged. Next: owner authorizes push of feature/homepage-redesign-20261114, then hosted preview deployment preserving the active accounts-preview feature candidate; finish desktop/mobile and accessibility verification before release.

Decision: CONDITIONAL PASS for source preparation; hosted preview and production release remain pending.

## Readability refinement and push authorization

Owner approved the design, requested larger text and clearer icons, then explicitly authorized pushing the branch. Body/feature text is 16px, supporting text 13–14px, primary controls 15–16px; mobile dashboard statistics stack for readability. Replaced symbol icons with 22 decorative inline SVGs. Static HTML/anchor/JSON checks, JavaScript syntax and whitespace checks PASS. Mobile visual rendering, accessibility audit and performance testing remain pending; no full SEO or mobile pass claimed. Push authorization does not authorize production merge/deployment.

## Hosted responsive verification

Owner explicitly authorized Plesk access and a separate preview only. Deployed homepage-redesign-20261114.html under _accounts-preview without changing the existing index, application preview branch or production. Preview has noindex,nofollow. Initial tablet checks found wrapping header controls at820px and crowded benefit illustrations; corrected tablet menu breakpoint through1100px and stacked cards through900px.

Final Chromium layout checks PASS at320,360,390,430,768,820,1024,1280 CSS pixels: one H1/header, no element or page horizontal overflow; account targets at least44px high. Mobile/tablet navigation opens and closes; native FAQ opens. Main copy16px. Screenshots inspected on phone and tablet. Historical console errors belonged to an intermediate duplicate editor save, corrected before final single-document checks. No claim of Safari/physical-device testing, Lighthouse score or full WCAG audit.

Preview: https://www.faraios.com/_accounts-preview/homepage-redesign-20261114.html . Production not deployed.
