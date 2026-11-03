# T29 HTTP status observation — account attribution (3 November 2026)

Owner provided Chrome Network screenshot showing two GET document requests to Shalean's staging dashboard (`business=612be091-...`) with status **200**. Screenshot did not expose the session's authenticated role. Do not classify the 200 as a Bokkie-only denial failure or security defect without session attribution.

Connected browser tab inspection revealed two separate open staging contexts: a Bokkie-only manager 'Your workspace' page with one permitted Bokkie business, and a Shalean owner page that lists both Shalean and Bokkie as authorised memberships. This establishes a plausible and supported explanation for HTTP 200 on Shalean: an authorised Shalean owner session. Browser tab snapshots do not cryptographically link the captured Network request cookie to that owner page; therefore session attribution for those exact two requests remains inferential.

Previous hosted Bokkie-manager navigation visibly returned 'You do not have access to this business'. Server code returns 403 on an unauthorised business selection. Read-only RLS denial tests with Bokkie manager role passed. A request-specific HTTP status captured from a verified Bokkie-only session is still required for the T29 HTTP negative test.

No user cookies, tokens or private data are stored here. No writes to production/staging, import, deployment or T30. T29 In progress; PR #306 remains Draft.
