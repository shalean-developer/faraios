# Benefit cards — preview

Owner authorized the proposed three-card Why choose us presentation and reusable editor. Application base main da07fe7776b5a9144bced4b3810d6b8f4b5f54b8. No production merge, deployment, existing content edits or Shalean republication in this task.

Homepage renders up to six owner-authored cards with static decorative SVG icon, title and optional short description. Three equal-height columns on desktop; one column below650px. Existing legacy benefits become card titles without changing their saved text. No claims or descriptions are inferred. New optional homepage.benefit_section contains editable heading, visible boolean and cards. Missing configuration preserves legacy visibility/heading; empty cards or explicit hide omit the section. Hiding retains the saved text for later use.

Profile → Homepage content → Why choose us has Show this section, heading and up to six collapsible icon/title/description groups. Fixed icon choices: House, Calendar, Message, Check, Heart, Star. Blank card rows are ignored; partially filled rows require a title; text is bounded and escaped. Existing benefits array remains retained when the new editor is saved. Normal versioned draft/save/preview/publish and owner checks remain authoritative. No booking changes.

Backwards-compatible pure profile validator migration20261114123413 installed in faraios-new. No grants/policies/table/record changes. All16existing public-table counts and full-row fingerprints match before/after, including media. No profiles were edited or published. Live intake remains unchanged.

PASS native PHP and PostgreSQL save/reload, old-content preservation, draft invisibility, explicit publish, hide/unhide storage, malformed payload rejection and second-owner denial. Existing homepage5-test profile/security/logo/content suite passes. Chromium12combinations at1280/390/320: equal desktop card heights, mobile stack, hidden/empty states, legacy strings, escaped HTML and no overflow. PHP lint/diff checks pass. Screenshot docs/evidence/benefit-cards-preview.png is a synthetic local rendering of the suggested copy, not a modification of Shalean's published content. Hosted preview verification follows.

## Hosted checkpoint

Candidate776f6fc50cfce2d52c43b634856c871c513e288b deployed only to Plesk manual accounts-preview. Correct feature/benefit-cards-20261114 and /faraios.com/_accounts-preview confirmed before Deploy now. Production main remains service-images release da07fe7, waitlist unchanged. Hosted demo loads homepage.css?v=benefit-cards-1; its empty benefits correctly remain absent. No existing content was populated to create the sample. Private Profile redirected to sign-in; tab marked for owner handoff. Hosted editing inspection is pending sign-in; persistence/validation/layout remain covered by the native tests above.

Immediately after validator migration all16public-table fingerprints matched. After hosted read-only checks15of16still match, including public pages, media, services and all transaction history; business_profiles changed concurrently. This task performed no profile save or publication, and the concurrent draft change was not reverted. No claim of whole-database equality after the concurrent change. Production application and published content remain unchanged.

## Signed-in editor checkpoint

Owner resumed the authenticated preview in the selected browser. Inspected Profile → Homepage content → Why choose us read-only. Confirmed Show this section, current heading, six collapsible card slots, six fixed icon choices, title and short-description fields. Opened Benefit1 to inspect its actual controls. No fields were changed, forms submitted or publications made. The signed-in account was the owner's currently selected Pure Quality business; the controls are reusable and no Shalean record was accessed or edited for this check. Editor left open for owner review. Hosted editor-inspection limitation is resolved; persistence/isolation remains verified in disposable native tests rather than modifying existing hosted data. PR29 remains draft and production application unchanged.
