# T19 — Zoho Books research, audit and proposed architecture

Review date: 22 October 2026 (Africa/Johannesburg). Status: **PROPOSED — awaiting architecture and safety approval**. Engineering owner: Codex; product/accounting approval: Farai and a designated accounting reviewer. This is a documentation-only work package, not permission to resume OAuth attempts or accounting writes.

## Decision and scope

**PASS for research and architecture review. NO-GO for beginning integration implementation until this proposal is approved; NO-GO for provider writes or activation.** After approval, bounded local implementation using synthetic providers can begin. Real read-only verification additionally needs the support questions resolved sufficiently to define an approved probe. Production remains a separate release decision after all stages pass.

FaraiOS must enforce tenant isolation even when a Zoho token can access multiple organisations. Separate client names, OAuth grants or refresh tokens are not proof of organisation isolation. A successful empty invoice list is not evidence identifying the organisation that supplied it. The previous sole-organisation-list check is an existing safety gate, not a documented universal OAuth guarantee. Do not remove it as part of this report; any replacement requires an approved design and negative tests.

This proposal extends the eventual T19 scope beyond the current draft adapter to contacts, invoice lifecycle, payment observations, credits, recovery and monthly accounting reconciliation. It does not modify T04 policies, T20 payment authorisation, T21 evidence approval, T22/T23 earnings or payouts. No production changes, migrations, new grants, credential inspection, provider API diagnostics or accounting writes were performed for this review. Existing websites remain authoritative until separately approved cutover.

Deliverables are organised as research and evidence below, current-code audit, architecture, workflows/source-of-truth matrix, risk register, bounded stages, staging acceptance plan and support questions. [Original T19 record](invoices-and-accounting.md) remains historical evidence; this report is the latest proposed direction, not an approval replacing its hold.

## Evidence and research method

Started from [blueprint](blueprint.md) and the linked [Build Plan and Progress Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit). Read the current tracker and T19 evidence on 22 October. T19 remains In progress; acceptance is “Business totals reconcile; failures visible”; accounting activation is NO-GO. The tracker explicitly holds further OAuth/save/enable/sync work. This report records decisions locally and does not change tracker status or T04.

Audited source at local checkout `8452de50cedbc50f1b5fc5f6858bfef14ba24908`; documentation branch starts at fetched local `origin/main` `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`. The seven core adapter, invoice, setup, SQL and focused test files compared identical between those revisions. The original T04 checkout and its untracked evidence were left in place. These are source observations, not assertions about deployed runtime or current secret state.

Evidence labels used here: **Documented** = official public contract; **Observed/reported** = repository, tracker or correspondence evidence with its limits; **Proposed** = FaraiOS design requiring approval; **Unresolved** = no adequate evidence yet.

### Official source register

All links checked on 22 October 2026. Large invoice/contact reference pages exceeded the web reader's page-size limit; official search excerpts were available, but detailed endpoint schema and unique-field behaviour must be revalidated against the official OpenAPI before implementation. No third-party source is used as API authority.

| ID | Official source | Relevant contract |
|---|---|---|
| Z1 | [Books OAuth](https://www.zoho.com/books/api/v3/oauth/) | Authorisation, scopes, expiry, refresh, token limits, multi-DC |
| Z2 | [Books introduction](https://www.zoho.com/books/api/v3/introduction/) | Organisation parameter, regional API hosts, quotas |
| Z3 | [Organisations](https://www.zoho.com/books/api/v3/organizations/) | List and get organisation; settings.READ |
| Z4 | [Instance-level OAuth](https://www.zoho.com/developer/oauth/instance-level-oauth.html) | ORG client, administrator consent and instance lifecycle |
| Z5 | [Instance authorisation code](https://www.zoho.com/developer/oauth/instance-level-oauth/get-auth-code.html) | `/oauth/v2/org/auth`, instance selection |
| Z6 | [Developer token revocation](https://www.zoho.com/developer/oauth/revoke-oauth-token.html) | Client-authenticated revocation and derived access tokens |
| Z7 | [Errors](https://www.zoho.com/books/api/v3/errors/) | HTTP/provider error classification |
| Z8 | [Invoices](https://www.zoho.com/books/api/v3/invoices/) | Invoice identities, read/create/update and references; partial retrieval |
| Z9 | [Contacts](https://www.zoho.com/books/api/v3/contacts/) | Contact identities and scoped operations; partial retrieval |
| Z10 | [Customer payments](https://www.zoho.com/books/api/v3/customer-payments/) | Payments, allocations and excess-payment refunds |
| Z11 | [Credit notes](https://www.zoho.com/books/api/v3/credit-notes/) | Credit lifecycle, invoice application and refunds |

### OAuth and organisation findings

**Documented (Z1):** server OAuth uses `/oauth/v2/auth`; one-use codes last two minutes. Offline access requests a refresh token; repeat consent can issue another. Exchange and refresh use POST `/oauth/v2/token`. Access tokens last one hour; refresh tokens normally have no timed expiry but can become invalid. Books documents 20 refresh tokens per user, 15 active access tokens per refresh token and 10 access-token generations per ten minutes. Reuse valid tokens; confirm applicability to ORG grants with support. Use `expires_in` and the returned, validated `api_domain`; send Books tokens in the `Zoho-oauthtoken` header. These limits make uncontrolled consent/refresh loops unsafe.

**Documented (Z4/Z5):** Books organisations are app instances. ORG clients use administrator instance consent and `/oauth/v2/org/auth`. Instance tokens are described as surviving removal of the consenting administrator, unlike user-based grants. This is a reason to require explicit disconnect and membership-change controls. It is not evidence that FaraiOS's actual ORG attempts successfully accessed Books.

**Documented (Z2/Z3):** requests identify the target with `organization_id`. `GET /organizations` and `GET /organizations/{organization_id}` require `ZohoBooks.settings.READ`. Organisation metadata provides identity and configuration checks, not proof of legal business ownership or exclusive token access. Verify the exact ID, active state, expected currency and business-owner attestation; names are corroborating labels and may legitimately change. Membership in FaraiOS and authority to approve its business connection must be checked independently.

**Proposed minimal read-only verification:** an approved TEST-only identity grants settings.READ and invoices.READ; add contacts.READ only for contact validation. Verify expected organisation metadata, then a known synthetic invoice ID and its expected reference/customer/currency. Exercise the other TEST organisation and a known other-org record in a separately approved provider-boundary diagnostic. An empty list, 401, 404, 5xx or malformed body cannot establish isolation. A 403 is one rejected request, not universal proof. If a token legitimately sees both organisations, record that capability and still require FaraiOS to deny cross-tenant requests before any provider call. Never probe live organisations to answer this question.

**Unresolved:** whether the particular Books ORG flow supports the organisation endpoints used by the helper, the cause of the list 500/profile 403, and a supported way to bind a token's effective organisation identity. There is no verified introspection procedure in the reviewed evidence. Selecting a client/organisation in the UI is not sufficient to close this gap.

### Regions, revocation and error handling

Z2 lists API hosts `.com`, `.eu`, `.in`, `.com.au`, `.jp`, `.ca`, `.com.cn`, `.sa`, `.ae` under `www.zohoapis`. Use an explicit API/accounts-host pair allowlist, not string concatenation or a callback-supplied URL. Validate callback location/accounts-server against the pending connection. Enable multi-DC only when needed and verified. The current code excludes UAE; fail closed there until its Accounts pairing is verified.

Z2 documents 100 requests/minute/organisation; daily quotas are Free 1,000, Standard 2,000, Professional 5,000, and Premium/Elite/Ultimate 10,000, with 429 on excess. Confirm the selected organisation's plan and concurrency limits before setting budgets. FaraiOS should share budgets across workers and connections targeting the same organisation.

Z6 documents POST `/oauth/v2/revoke/token` using Basic client authentication and a form-body token/type; refresh revocation also revokes derived access tokens. Z1 separately presents `/oauth/v2/token/revoke` and query examples. Retain the current Z6 contract, keep secrets out of URLs, and ask support to confirm the supported route for both grant types. Acknowledgement is not proof that unknown older grants were removed. Disable locally before revocation; retain a restricted cleanup task until revocation is confirmed.

Proposed error policy: parse HTTP and numeric Books code, validate the expected response schema, and keep only safe diagnostic metadata. Retry GETs for timeouts/5xx/429 with bounded exponential backoff and jitter (for example 1, 2, 4, 8, 16 seconds, maximum five retries); honour a valid Retry-After without exceeding the job deadline. Daily quota exhaustion waits for its confirmed reset window. Refresh once after an access-token rejection, then require reauthorisation if still invalid. Treat 403 as scope/permission/organisation investigation, 404 as missing or inaccessible, and validation errors as terminal until corrected. Never classify them as evidence of ownership. After a dispatched mutation, a timeout, malformed response or 5xx is an uncertain outcome: reconcile, never blindly retry. Do not assume 429 or another rejection proves no write occurred without an endpoint guarantee.

### Historical diagnostics and Zoho correspondence

| Evidence | What it supports | What it does not support |
|---|---|---|
| 20 Oct ORG consent selected Shalean TEST; list later reported HTTP 500 / Books 1000 | Consent UI and a failed organisation-list attempt | Successful binding or cause of failure |
| 20 Oct 12:39 SAST reported target profile HTTP 403; other TEST not run; refresh cleanup acknowledged | Target remained unverified; known token cleanup acknowledged | Other-org denial or full grant cleanup |
| Standard comparison, including a dedicated Server-based client around 12:21 UTC on 20 Oct | Target and other TEST invoice lists passed HTTP/code/array/pagination classifier | Returned organisation identity, nonempty data or cross-business disclosure; raw responses were not retained |
| Separate earlier ORG-client attempt via standard authorisation | A second adverse classifier observation | Equivalent semantics to instance-level `/org/auth` |

The original local T19 document still says support mail was unsent. The tracker and Gmail supersede that statement: the initial message was sent on 20 October at 14:50:53 SAST. [Support ticket 169559907 reply](https://mail.google.com/mail/u/0/#all/1a15de532d1bec95), 21 October 11:57:39 SAST, explains that scope and correct organisation IDs can allow access to the organisations associated with the email account, and asks for context/error details. This is support guidance about likely user-based behaviour, not a test result or resolution of ORG endpoint compatibility.

The [22 October follow-up](https://mail.google.com/mail/u/0/#all/1a165230fd386703), 21:42:36 SAST, clarifies that both lists succeeded, that response identity was unverified, and asks about grant boundaries, empty lists, verification endpoints and recommended multi-tenant authorisation. Search also found a separate sent copy at 21:41:51 SAST. No later support answer appeared in the retrieved thread. No new message was sent during this review. Only technical summaries and message references are retained here, not raw mailbox exports or customer information.

## Current implementation audit

This is a bounded source audit, not a production security certification. Findings below distinguish protections already present from missing production capabilities.

| Component | Existing protection | Gap / consequence |
|---|---|---|
| `database/invoices-draft.sql` | One connection per business; unique region/org and credential alias; business composite foreign keys; RLS; owner-only configuration; owner/manager invoice RPCs; service-role-only claim/finish | Staging-only Zoho/ZAR/draft schema. No connection history/credential generations, payment/credit objects or customer invoice portal policy |
| `src/staging-server.js`, `src/invoices.js` | Server membership checks, scoped invoice queries, actor from authenticated context, owner gate and POST Origin check; foreign claim rejected | Must repeat real HTTP + JWT + PostgreSQL/RLS denial acceptance for future endpoints and workers; mocks are insufficient |
| `src/zoho-books.js` | Independent credential business/org/region/environment pins; fixed hosts; rejected redirects; timeouts; organisation/contact checks; exact draft totals and lines; VAT dispatch refused | Profile only checks ZAR, ID and not explicitly inactive; production needs active-state validation/configurable expected currency. Contact name equality is a consistency check, not identity proof |
| Token context | Cache key includes business/alias/org/domain; 60-second expiry margin; credentials error clears cache | No distributed refresh lock, credential generation in cache key, automatic one-time recovery, encrypted vault or revoke/disconnect lifecycle |
| Provider receipt | Reads invoice back, verifies reference/customer/currency/lines/status; rejects payments/tax/discount changes | Receipt organisation is copied from the binding rather than independently supplied by invoice response. Correct organisation relies on verified routing/provider contract; this is not independent response-origin attestation |
| URL builder | All present callers pass controlled queries and pinned paths | Internal `{organization_id: pinned, ...query}` allows a future caller to override the pin. No present untrusted-query exploit established; harden by rejecting reserved keys and setting the pin last |
| Dispatch / recovery | One invoice per booking; durable claim; uncertain POST becomes review_required; expired claims reconcile only; duplicate reference matches stop | No general outbox/inbox or provider-independent operation ledger. Reference search is not atomic provider idempotency; cap of ten pages fails closed but cannot prove absence beyond the cap |
| Finish and disable | Attempt ID and actor must match; bound identities cannot silently change after attempts | Disabling a connection does not cancel an already-dispatched request; finish does not recheck enabled state/generation. Need defined quiescence and late-result recording, not a promise of immediate remote cancellation |
| `staging.mjs`, setup helper | Private file outside repository; hidden prompts; state/host/region/callback checks; atomic file replacement and lock; current-attempt-only cleanup; diagnostic modes do not save | JSON credentials are plaintext at rest. Windows ACL enforcement is operator-dependent; file loading is startup-based. Not a production secret store. Setup's sole-list acceptance currently blocks onboarding |
| Audit and totals | Database invoice/connection audit; preserved snapshots; UI exposes failure/review; totals exclude unrelated Zoho records | Audit snapshots contain business information and require tenant restrictions/retention. Current totals compare draft snapshots, not ledger, cash, bank settlement or monthly close |

Relevant tests: `test/zoho-books.test.js` (fake-provider routing/receipt/uncertainty), `test/zoho-setup.test.js` (fake OAuth, file safety, callback/cleanup/diagnostics), `test/invoices.test.js` (PGlite SQL/RLS/RPC fixtures), `test/staging-server.test.js` (HTTP with mocked database), and VAT guards in `test/vat.test.js` plus `database/business-vat-draft.sql`. Existing tests are valuable evidence of these narrow contracts; they do not exercise a real Zoho grant or deployed RLS through authenticated APIs.

Validation record is in [T19 verification](t19-verification-plan.md). No implementation change is included to fix these findings before approval.

## Proposed OAuth and tenant-isolation architecture

### Non-negotiable invariants

1. Resolve user and active business membership on the server for every request. A route business ID is a selector, never an authority claim. Connection configuration/disconnect/rebinding is owner-only. Managers retain approved invoice operations; staff receive no general accounting data. Customer access, when implemented, additionally requires that business's verified customer ownership. Platform administrators gain no implicit tenant access.
2. Exactly one active accounting connection per business. Historical connections remain immutable. Enforce unique `(environment, provider, region, organisation_id)` across business bindings; sharing an organisation between independent businesses is outside this design.
3. Every mapping, job, cursor, receipt, reconciliation and audit event carries `business_id` and `connection_id` plus generation where relevant. Composite foreign keys prevent attaching a Bokkie object to a Shalean connection. RLS restricts both reads and writes; service workers receive no client-supplied authority.
4. Only the connection resolver can obtain credentials or build provider context. Public APIs accept local record IDs, not arbitrary provider URLs, org IDs, credential aliases or remote object IDs. Resolve remote IDs from business-scoped mappings. Internal jobs reload their durable record and connection; never trust a queued business claim alone.
5. Provider routing pins region and org in one immutable context. Reject reserved query keys, unexpected response identity where supplied, redirects and region changes. Any mismatch quarantines the connection and dependent jobs; no fallback to a default organisation.
6. One active writer per object and connection. Shared users may explicitly switch businesses but do not mix mappings, caches, exports or financial totals.

### Connection and credential lifecycle

Proposed records: `accounting_connections` (business, provider, region, organisation, expected profile, status, generation, scopes, verification timestamps, consent actor); `accounting_credentials` (restricted secret reference/version, encrypted envelope metadata); `accounting_object_links` (local type/ID, remote type/ID, connection generation, last verified hash); `accounting_operations` (stable operation key, request hash, state, attempt/lease, provider correlation, receipt); `accounting_sync_cursors`, `accounting_reconciliation_runs/items` and tenant-scoped audit events. These names are a design, not new tables created here.

States: disconnected → authorising → verifying → connected_read_only; later explicit approval may permit writes. Failures lead to degraded, reauthorisation_required, mismatch_quarantined or revocation_pending. “Connected” must show scope, organisation and last verification freshness, not imply perpetual validity. Derive connection status separately from individual invoice sync status.

Owner initiation creates a short-lived, random, single-use server-side state record bound to session, business, intended organisation/region, exact scopes and redirect URI. Recheck owner membership at callback. Use HTTPS callbacks in hosted environments; loopback remains a dedicated local diagnostic exception. Reject replay, duplicate parameters, unsolicited callbacks and changed state. Validate the Accounts host rather than following callback URLs. Use PKCE if confirmed supported for the chosen client flow; do not claim it is already implemented or substitute it for state/client authentication.

Prefer documented ORG consent if support and staging evidence establish Books compatibility. A standard server-based grant is an alternative only after explicit review accepts its potentially broader provider access. Each business still has a separate grant and credentials, and ideally a dedicated integration identity with access only to its intended org. Do not duplicate one refresh token into two business aliases. Dedicated clients may reduce revocation blast radius, but separate clients are not themselves an isolation proof. Production and staging require separate clients, identities, grants, vaults and data.

Encrypt refresh tokens and client secrets using a managed secret store or envelope encryption (authenticated encryption with a unique nonce; key-encryption key outside the database). Bind ciphertext to environment/business/connection/credential version as authenticated context. Only the integration worker can decrypt; browser, normal DB roles, logs and support exports cannot. Audit secret access without recording values. Define key rotation, backup encryption, restore and emergency revocation tests. Access tokens stay in worker memory or an equally protected cache; no Git, browser storage or plaintext operational backups.

Refresh under a distributed per-connection/version lease with fencing and compare-and-swap publication. Re-read generation/status before decrypting and before dispatch. Reuse valid tokens with clock-skew margin; validate expiry and allowlisted API domain. Do not require a new refresh token on a refresh response; retain the existing one if absent. If rotation is supported and a replacement is returned, store it atomically under the same lock. Invalid grants stop jobs and request owner reauthorisation; network errors do not trigger consent loops. Reauthorisation for the same org increments credential generation and clears old caches; changing org follows the separate workflow below.

Provider-independent port: `verifyConnection`, `readContact`, `findInvoiceByOperationKey`, `readInvoice`, `listChanges`, `readPayments`, `readCredits`, `revokeConnection`; later approved command methods `createContact`, `updateContact`, `createDraftInvoice`, `updateDraftInvoice`, `createCredit`. Each accepts a server-created context and typed local intent. Capabilities explicitly declare supported currencies, taxes, updates, pagination and idempotency. Return typed results: verified, rejected, retryable_read, uncertain_write, mismatch, reauth_required. Provider payloads stay within the adapter; no generic arbitrary-request escape hatch. Payment execution is a separate interface and out of T19 scope.

Audit each consent, binding, refresh outcome, scope change, dispatch, retry, mismatch, disconnect and approval with actor/service identity, business, connection version, operation ID, safe provider status and timestamp. Keep customer payloads and secrets out of operational logs. Restrict detailed accounting evidence to that tenant, define retention with the accounting/privacy owner, and retain an immutable financial history through disconnect.

### Least-privilege scope plan

| Stage / feature | Scope proposal | Guard |
|---|---|---|
| Organisation verification | `ZohoBooks.settings.READ` | No settings writes |
| Invoice evidence | `ZohoBooks.invoices.READ` | Read-only first |
| Contact binding | `ZohoBooks.contacts.READ` | Explicit mapped identity |
| Payment/credit reconciliation | `ZohoBooks.customerpayments.READ`, `ZohoBooks.creditnotes.READ` | Later read-only expansion |
| Approved contact sync | `ZohoBooks.contacts.CREATE`, `ZohoBooks.contacts.UPDATE` | Field ownership and conflict review |
| Approved draft invoice sync | `ZohoBooks.invoices.CREATE`, later `.UPDATE` | No issuance/send/delete by default |
| Credit creation/application/refund recording | Endpoint-specific scopes from Z11, verified before enabling | Owner/accounting approval; no payment execution |

Never request `.ALL` for convenience. Scope is not a business-operation boundary: a CREATE scope can cover more than a draft-only operation. Enforce a method/path/action allowlist as well. The existing setup requests invoices.CREATE and is therefore not the proposed read-only onboarding path. Do not run it under this research approval.

## Integration plan and source of truth

The following ownership is proposed for review. Until an approved cutover, existing business systems remain authoritative. No tenant's rules are inferred from another's configuration.

| Object / fields | Authoritative source after approved cutover | FaraiOS behaviour |
|---|---|---|
| Business membership, connection binding, consent and local operation identity | FaraiOS server records | Never inferred from provider email/client claims |
| Customer relationship, operational contact details and booking instructions | FaraiOS business customer | Export only reviewed billing fields; never export private job notes by default |
| Zoho contact ID, accounting classification/tax identity and accountant-managed billing fields | Zoho, with explicit field ownership map | Cache observation; conflicts require review, not last-write-wins |
| Booking/quote price and accepted scope snapshot | FaraiOS frozen agreement | Source for invoice intent; changes create a reviewed revision |
| Local invoice UUID, operation key and source linkage | FaraiOS | Stable across retries; separate from legal invoice number |
| Issued invoice number, accounting document state, ledger balance, tax/account codes | Zoho/accounting reviewer | Read and reconcile; do not fabricate or overwrite issued history |
| Payment authorisation/transaction result | Payment provider or verified bank evidence under T20/T21 | Never inferred from invoice status or a browser return |
| Payment allocation, credit note and refund accounting entry | Zoho ledger | Reconcile to original payment/invoice and external cash evidence |
| Refund execution | Payment provider/bank with owner-approved workflow | Separate from credit creation and accounting entry |
| Reconciliation evidence and exception resolution | FaraiOS run record with accountant sign-off | Immutable snapshot; ledger is not silently “corrected” |
| Earnings and payouts | Existing approved T04/T22/T23 contracts | Not derived automatically from Zoho paid status |

### 1. Customer/contact synchronisation

Begin with read-only explicit linking. Resolve a local business customer, verify the chosen remote contact in the pinned org, and persist a unique scoped mapping. Same email/name across businesses never auto-links records. Later create only when no mapping exists and approved matching/review establishes no existing contact; persist one operation before dispatch. Read back and validate the identity. Updates use a field ownership allowlist and last-observed revision/hash; remote changes trigger conflict review. Inactive/merged contacts invalidate dependent jobs until reviewed. Do not enable portals, reminders or emails as side effects.

### 2. Invoice creation and updates

Validate membership, source ownership, frozen snapshot, contact mapping, currency and approved tax/account configuration. Persist the invoice and operation/outbox entry in one transaction, enforcing one original invoice per source booking; future adjustments have distinct typed lineage. Claim the operation with a lease, recheck connection generation, then dispatch one draft command. Validate remote ID, reference, customer, currency, totals, line rounding and state through readback. An update is a new operation against the existing remote ID and expected version/hash. If Zoho offers no conditional update guarantee, serialize FaraiOS writes and require review where external edits can race; pre-read alone cannot eliminate that race. Issued/paid/credited documents are not rewritten: use an accountant-approved correction/credit process. Tax/VAT mapping and invoice compliance remain blocked until separately reviewed.

### 3. Status and payment reconciliation

Poll mapped records with per-connection cursors and overlapping windows; deduplicate provider IDs/revisions. Start with polling; webhooks may later wake a fetch only after sender/authentication/replay rules are verified. An event is not authoritative financial evidence by itself. Read invoice, payment allocations, credits, balance and timestamps. Preserve partial payment, overpayment, unallocated cash, void, write-off and reversal distinctions. Mark stale/failed observations visibly. Never turn a paid invoice into a payout or provider-confirmed cash receipt without the corresponding evidence. Recording customer payments is a later T20/T21-coordinated decision, not this read-only stage.

### 4. Credit notes and refunds

Link every proposed credit to the business, original invoice and approved reason. Owner/accounting approval precedes dispatch; reconcile credit amount, tax, applications and remaining balance. A credit note is not a cash refund. Track refund intent, payment execution evidence and Zoho refund entry separately with distinct operation keys. Reversed/partial/failed refunds remain visible. Do not issue payment instructions, delete history or mark refunded from a mere API acceptance. Exact Z11/Z10 action scopes and regional semantics are implementation gates.

### 5–6. Duplicate prevention, uncertain responses and partial sync

Operation uniqueness: `(business_id, connection_id, object_type, local_id, action, revision)` plus a payload hash. Same key/different payload is a conflict. Mapping uniqueness includes provider, region, organisation, type and remote ID. Persist intent before network, then states `pending → claimed → dispatched → verified`, with `retry_wait`, `failed`, `uncertain` and `review_required` branches. A worker crash after dispatch enters reconciliation, including when no response was received. Fencing prevents a stale worker from creating again or overwriting a newer result.

The existing `FaraiOS:<invoice UUID>` reference is correlation, not a documented atomic deduplication key. Investigate a provider unique custom field only after confirming edition support, uniqueness, atomicity, filtering and collision semantics. Do not assume an Idempotency-Key header exists. For uncertain writes, search the pinned org by stable reference, exhaust pagination, require exactly one exact match, then read the full record. Zero results may reflect delayed visibility; keep the operation uncertain and schedule bounded reads, then manual review. More than one match stops. Never retry POST just because a search is empty. A successful contact create followed by invoice failure retains the contact link and resumes only the invoice step. Persist page progress only with its committed observations; failed pages cannot silently advance a cursor.

### 7. Monthly accounting reconciliation

For each business/org/currency and configured timezone/period, capture a run cutoff and enumerate invoices, credits, payment allocations, refunds, voids, write-offs and outstanding items with complete pagination. Distinguish FaraiOS-origin records from other legitimate Zoho activity. Reconcile counts, subtotal, tax, discounts, total and balance movements; reconcile cash separately to payment/bank evidence. Opening receivables plus invoice debits less credits, allocations and approved write-offs must explain closing receivables, with void/reversal and FX treatment explicitly defined. Report unlinked/duplicate/missing/stale records and rounding differences; do not net currencies or businesses. Unknown is not zero. Store run version, source timestamps, exceptions, reviewer and signed close. Late changes generate a new run/adjustment trail. Monthly ledger reconciliation does not approve monthly payouts.

### 8. Disconnect or change organisation

Owner disables dispatch first, increments generation, invalidates caches and pauses scheduled work. Fence pending claims and classify already-dispatched operations as potentially completed; reconcile their receipts under the historical binding using controlled access. A request already sent cannot be recalled by a local toggle. Attempt targeted revocation; failure leaves revocation_pending and an operator task, with local access disabled. Retain mappings/audit and required accounting history; delete secret material once cleanup and retention requirements permit.

Changing org creates a new verified connection version, never edits old mappings into the new org. Resolve or explicitly freeze outstanding uncertain operations, reconcile the old org at a cutoff, verify new owner authority/profile, and approve a mapping/cutover plan. Do not replay old invoice jobs into the new org. Same-org reauthorisation preserves remote identities after revalidation; changed-org reauthorisation is a migration requiring its own approval.

## Security and accounting risk register

| ID / severity | Risk | Required mitigation / owner | Residual gate |
|---|---|---|---|
| R1 Critical | Broad grant plus tenant-routing bug exposes another business | Server resolver, composite keys/RLS, immutable context, broad-token negative tests; engineering/security reviewer | HTTP and real DB denial proof |
| R2 Critical | Token theft or plaintext backups | Encrypted vault, restricted decrypt identity, rotation/redaction/restore tests; infrastructure owner | Secret lifecycle acceptance |
| R3 High | ORG endpoint failures mistaken for accepted ownership | Support-confirmed probe and known synthetic record verification; integration owner | Target org verification unresolved |
| R4 High | Lost response or worker race creates duplicate invoice/payment | Durable operation ledger, lease fencing, no blind write replay; engineering | Crash and concurrent-worker tests |
| R5 High | Disconnect/rebind allows old jobs into new org | Generation fence, quiescence, immutable historical connection; engineering | Race acceptance |
| R6 High | Wrong tax/rounding/numbering or issued-document update | Accountant-approved mapping, exact decimals/minor units, immutable issued history; accounting reviewer | VAT and legal issuance not approved |
| R7 High | Paid/credited confused with settled/refunded | Separate cash evidence, allocation and refund execution; finance owner | T20/T21 dependencies |
| R8 High | Refresh storm, consent churn or invalidation of older grants | Distributed refresh lease, token budgets, no automatic consent; engineering | Token-limit/support confirmation |
| R9 High | Partial pagination or late changes produce false close | Durable cursors, overlap, full period reconciliation and exceptions; finance/engineering | No unexplained variance |
| R10 High | Shared operator or platform admin bypasses business access | Explicit memberships and record ownership; no implicit support access; security reviewer | Real role matrix tests |
| R11 Medium | PII leaks through logs, exports or audit snapshots | Minimise/redact, tenant access, retention/export controls; privacy owner | Evidence inspection |
| R12 Medium | Regional mismatch/SSRF or unsupported DC | Fixed verified host pairs, no redirects, fail closed; engineering | UAE deliberately unsupported until verified |
| R13 High | Manual Zoho edits conflict with FaraiOS writer | Field authority, conflict detection, reviewed revisions; accounting owner | Conditional-write behaviour unresolved |

## Bounded implementation stages and approval gates

| Stage | Bounded output | Exit / stop condition |
|---|---|---|
| A — this review | Research, audit, design, risks and acceptance plan | Owner/security/accounting review; approve ADR decisions below. No code writes to integration |
| B — offline foundation after approval | Provider port, scoped connection generations, fake-provider tests, encryption/refresh interfaces | Local tests and code review; no new OAuth grant or live DB migration |
| C — approved synthetic read-only connection | Read-only onboarding, vault, profile/known-record verification and disconnect | Support questions S1–S4/S7 resolved sufficiently; two synthetic orgs; real HTTP/RLS tests; no provider accounting writes |
| D — reconciliation read path | Contact links, mapped invoice/payment/credit reads, cursors and exceptions | Complete synthetic seeded reads; failure and tenancy matrix pass |
| E — separately approved test writes | Outbox, draft/contact commands and uncertain recovery | Fresh approval to create synthetic records, no send/payment actions; duplicates/crash cases pass |
| F — accounting lifecycle | Updates/credits/refund recording, monthly close | Accounting sign-off, tax/rounding policies, T20/T21 boundaries and all safety cases pass |
| G — production readiness / business cutover | Operational runbooks, recovery, monitoring, credential separation, one-business rollout | Separate production approval; existing writers disabled under an approved migration plan |

Proposed ADRs for review: **D1** mandatory application isolation independent of grant breadth; **D2** ORG preferred pending compatibility, standard OAuth only with explicit broader-access risk acceptance; **D3** replace plaintext setup with vault-backed read-only onboarding; **D4** immutable connection history and generation fencing; **D5** durable operations and uncertain-write reconciliation; **D6** field-level source ownership and accountant-reviewed monthly close. None is marked approved by this report.

## Questions for Zoho support

Continue ticket 169559907; this list is not a newly sent message.

1. **S1:** For standard Server-based, Self Client and ORG `/org/auth` grants respectively, what determines effective Books organisation access? Can one grant access multiple organisations, and what changes when the user is removed or their role changes?
2. **S2:** Are Books `GET /organizations` and `GET /organizations/{id}` supported with ORG grants/settings.READ in the US data centre? What explains the reported list 500/code 1000 and profile 403, and which safe correlation metadata should we retain on a fresh approved test?
3. **S3:** What minimal read-only endpoint/procedure verifies token principal, permitted organisation and returned organisation identity? Does a successful empty invoice list prove access to the requested ID? What are expected behaviours for inaccessible, invalid or omitted organisation IDs?
4. **S4:** For a SaaS serving independent businesses, does Zoho recommend ORG or standard OAuth, shared app registration or dedicated clients? What is required for external business onboarding and multi-DC approval?
5. **S5:** Are invoice/contact reference fields or unique custom fields atomically unique for creates? Is there supported idempotency or conditional-update/version control? What is the visibility delay after a successful create, and can reference searches be exhaustive/exact?
6. **S6:** Confirm per-plan daily, per-org minute/concurrency and token-generation limits, reset timezone, retry headers and whether failed calls count. Are documented user token caps also applicable to ORG grants?
7. **S7:** Confirm the supported revocation endpoint/authentication for both grant types, propagation delay and derived-token invalidation. Does consent/client deletion affect other grants? Are refresh tokens ever rotated, and is PKCE supported for these client flows?
8. **S8:** Confirm applicable edition-specific invoice tax/rounding, immutable/locked periods, credit application and refund-record semantics. Which operations can send mail or trigger collection automatically? Which webhook verification/replay and change-listing guarantees are supported?

S1–S4 and S7 gate the connection experiment; S5 gates writes; S6 gates worker scheduling; S8 gates affected lifecycle features. Unanswered questions do not justify weakening current safeguards. FaraiOS isolation remains required regardless of the answers.

## 23 October provider-model addendum

See [Zoho support confirmation and acceptance reassessment](t19-provider-confirmation-20261023.md). The owner supplied Sanu Jose's 23 October reply on ticket169559907: Accounts-level tokens are not inherently organisation-exclusive; membership/permissions determine access and organization_id selects the request target. This supersedes the unresolved basic grant-breadth question and D2's ORG-first preference with dedicated identities and independent per-business grants. It does not close positive TEST organisation/record identity verification, approve onboarding or erase earlier diagnostics. Stage B remains offline; full T19 acceptance and activation remain NO-GO.
