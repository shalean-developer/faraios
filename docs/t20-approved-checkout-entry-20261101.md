# T20 approved TEST checkout entry

Owner explicitly approved Shalean R100 and Bokkie R100 TEST checkout checks on1November2026. Existing fictitious drafts are Shalean38c9f7d2-fa07-4d3b-9451-64099c23fb14 / INV-000002 and Bokkiea7f53dfa-73bb-4971-9e0c-8495141ddddd / INV-000001, each ZAR10000c. Production and unrelated tasks remain excluded.

The previously implemented API endpoints lacked a browser form for creating a saved intent under the actual human session. Add only this missing entry to GET /payments/{business}/intents, owner-gated with existing auth.withOwner, without mutation. Its form POST uses the existing live-session database create RPC; no supplied price/account accepted. Browser HTML receives the exact saved amount/reference and an explicit TEST-only initialization confirmation form; other API callers retain JSON. Preparation cannot call Paystack. The existing initialized result returns its already allowlisted checkout URL. Return verification remains PR288.

Tests cover owner GET without mutations/provider calls, denied owner, saved RPC shape, exact saved amount display, foreign/extra/duplicate form fields, database denial and malformed result rejection. Existing native database account/role/saved-price tests remain authoritative. This is necessary T20 browser workflow, not a new financial feature.

Rollback: revert handler increment; retain saved intents/dispatch claims and inspect uncertain outcomes. Never reset claims or mint another reference automatically. Disable private TEST runtime before reverting active checkout dependencies. No migration, auth foundation, production change or new credential.
