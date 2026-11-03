# T29 — Hosted HTTP cross-business denial (3 November 2026)

The owner repeated the Shalean dashboard request after being instructed to sign out of other FaraiOS staging sessions and sign in as the Bokkie-only manager. Owner-provided Chrome Network response metadata:

- Request method: GET
- Path: `/dashboard?business=612be091-b1d7-4911-9c3b-143446a9fe27` (optional analytics query parameter omitted)
- Status: **403 Forbidden**
- HTTPS endpoint: `staging.faraios.com`

Prior independent browser context confirmed the Bokkie manager's permitted single-business Bokkie workspace, and direct navigation returned `You do not have access to this business.` The staging source handler sends HTTP 403 for a business absent from the signed-in user's businessIds, and separately executed read-only RLS checks demonstrated the Bokkie manager identity could not view tested Shalean tables.

**Judgment:** The Bokkie-only manager to Shalean hosted dashboard HTTP 403 gate now PASSES based on owner-supplied response metadata, with prior account and denial context. This is evidence of that tested authenticated application route, not a blanket audit of every endpoint or a captured direct Supabase Data API response. No credentials or session cookies retained.

**Remain open:** comprehensive isolated runtime provider/notification/recurrence egress containment, run-bound rollback/source-preservation evidence where the amended fresh-start acceptance requires it, final evidence consolidation and explicit owner T29 staging acceptance. No production modifications, data imports, deployed changes, provider actions or T30.
