# V1-022 — Customer document privacy

16 November 2026. Isolated repair preparation. No merge, main update or hosted installation.

## Baseline and finding

Read current Foundation Plan v87 and Defect Repair Plan v38, then live V1-022 (Critical, v1.0.0 blocker, three unchecked acceptance items). Main is `4cea37e553edd3d6b1faae277a3286f7134c3801`; draft PR66 is `d5f6f6c2c9c4e917253d5239ea40be78386f791b`; draft PR68 is `9fd4c0a6ec5192d570ef4efa4036459efb205cd8`. All three remote refs were rechecked. These guest endpoints/helpers are identical across those refs. The seven-file/two-function repair pinned to `f89d616b` is already LIVE, despite the unmerged PRs. Do not deploy main or a whole branch over its overlay.

Fresh hosted database inspection confirms deployed command/page body MD5 `244ea2a34b99082b9429c85f2c0bb981` / `b89d3db6188427d4234e24979b4b9d93`. The installed quote/invoice customer functions still match their original source logic. Guest live pages without tokens display only Unavailable. Existing synthetic preview quote/invoice links open their exact documents; no actions were submitted. No fresh hosting-filesystem PHP hash census is claimed in this audit; actual HTTP behavior and installed database definitions were inspected.

**Confirmed defect:** `quote_private.customer` returns customer email/phone in the RPC JSON although the HTML hides them. Invoice already excludes those contact fields. The repair uses explicit document/sender field lists in both guest projections. Sender business contact information remains public as intended. Document name/items/currency/customer-facing notes and optional captured rooms/extras remain available. No customer, staff, event or payment-history enumeration is introduced.

Additional bounded hardening: quote responses always use `no-referrer` even when the foundation presentation flag is off; quote HTTP methods are explicitly limited to GET/POST. Existing live foundation-enabled pages already use no-referrer; this is a fallback regression, not evidence of a live header leak. Invoice remains GET-only. Quote acceptance/decline still requires its token, session CSRF and explicit confirmation; same response is idempotent, opposite response and expiry are rejected.

**Notes distinction:** customer profile `details.notes` is private; quote/invoice `document.notes` is customer-visible agreement/requirements text. Existing hosted synthetic agreements contain text named “SYNTHETIC PRIVATE NOTES” because earlier role-filter fixtures put that literal in the agreement itself. It is not proof that profile notes were copied. Those immutable agreements are preserved. New tests use distinct private-profile and agreed-document sentinels and prove the former is absent while the latter remains. Do not silently remove customer agreement text or rewrite history.

## Hosted inspection and fixture state

Only registered A `2f16e658-e031-4c4a-930a-2731ec1d1492` and B `4627f805-8243-4890-bf18-a14fdf3fd21b` were used for fixture inspection. A has 21 quotes (5 shared), 5 invoices (4 shared); B has none. Both preview onboarding entries remain false; active nonowner synthetic delegates remain zero. No fixture or onboarding/delegation mutation was needed. No real invitations, messages, customer actions or intake/publication changes occurred. Saving V1-022 assessment/evidence in the platform tracker is the only hosted write in this task.

Read-only hosted native-role checks: anonymous guessed 64-character tokens and UUID-as-token calls return `{}` for both document RPCs; anon cannot SELECT private customer/document/staff/payment tables. Under authenticated B/preview context, A quotes, invoices, customers, staff and payments each return zero rows. A valid bearer link grants its one document regardless of whether the holder is signed in to another business; it must not grant that business's history. Tokens were kept private and are excluded from source/evidence.

Audit-end synthetic quote/invoice/payment fingerprint: `1f392ed1ce80edb3f9d7446e1f16ee34`. This is a dated audit checkpoint, not a retroactive before/after comparison. Read-only operations did not mutate business records.

## Exact proposed runtime scope

- Replace `quote/index.php` only: unconditional no-referrer and explicit method allowlist.
- Replace only `quote_private.customer(text,text,text)` and `invoice_private.customer(text,text)` with `customer-document-privacy.sql`.
- Existing public wrappers, function signatures, grants, RLS, tables, memberships, invitations, financial writers, documents/history, onboarding, published pages and five-step booking remain unchanged.
- `CREATE OR REPLACE` preserves existing function identity/ACL; patch contains no grant, row update outside the existing customer quote-response action, or migration-history operation. Existing quote-response body/lifecycle is retained.
- Tests, manifest/inventory reconciliation and this evidence are review materials, not deployment payloads. The two-function SQL patch is deliberately outside automatic migrations/installers.

Baseline installed function definition MD5: quote `0601619b4fc08ba4a049ea4f9ba6f17f`; invoice `563367514e76b712853d4e246e32cf86`. Both ACLs are postgres/anon/authenticated execute. Re-read definitions and ACL before any future authorized install; stop on drift. Retain original definitions privately. Hashes are detailed in `scope.json`.

## Validation

- Focused native PG17/PHP tests: five methods PASS including optional browser method. Four functional methods run in normal CI; browser method is explicitly skipped unless enabled.
- Before repair: quote contact projection and fallback referrer checks reproduced as failures; guessed identifiers/direct table denial already passed.
- Real anonymous/authenticated SQL roles; two businesses and multiple independent documents, private profile notes, actual payment/event entries and unknown sender metadata. Exact guest keys; no contact/history/staff/actor/reversal fields; other-document isolation; draft/expired/disabled gate denial; valid quote action/idempotency/conflict; read-only invoice and preserved paid/outstanding totals; all read-only checks retain document/customer/payment/event fingerprints.
- Desktop/mobile local browser: 1280, 390 and 320 pixels, both document types; confirmation remains required, invoice has no forms, missing/guessed-ID page returns 404, no private fields or horizontal overflow. Mobile quote and desktop invoice renders visually inspected. Local browser automation uses actual PHP/native database, simulated Auth/PostgREST, no external browser network.
- SC02 original preservation manifest remains frozen; only the separately pinned quote runtime delta is permitted. Existing inventory and its access-site line positions remain unchanged.
- Combined-source full gate PASS: 38 suites / 130 reported tests (browser method explicitly skipped in the normal gate and separately PASS with browser enabled). Results are recorded in `verification.json`. Combined snapshot incorporates PR68 plus concurrent main through the existing compatibility builder without merging or moving refs, then applies this exact bounded delta.

## Next gate and rollback

Technical preparation is separate from hosted acceptance. This repair has NOT been installed in hosted preview or live. Physical-phone acceptance and independent QA are not claimed. Keep V1-022 In progress and all hosted acceptance checkboxes unchecked; v1.0.0 remains blocked.

Future hosted preview requires explicit bounded installation authorization because the two functions are shared across live and preview. Guest read/negative tests can reuse existing synthetic documents without reopening delegation/onboarding. If a fresh quote-response fixture is later needed, explain its exact synthetic-only creation and state transition first; do not reuse an accepted historical quote. Never send a real invitation or customer message as a test.

Before any release, refresh exact main/overlay/concurrent dashboard baselines, function ACLs/definitions, encrypted backup and isolated recovery evidence. Apply only reviewed payloads after the applicable authorization. Rollback restores only the saved guest PHP/function definitions after drift and compatibility checks; never restore an old database over new activity or alter customer/document/financial history. Restoring the original quote projection would restore its known contact overexposure, so prefer a reviewed forward correction.
