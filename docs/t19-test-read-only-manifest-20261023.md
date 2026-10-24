# T19 TEST-only read-only verification manifest

Manifest: T19-RO-20261023-v1. Prepared 23 October 2026 (Africa/Johannesburg).
Status: **DRAFT FOR OWNER REVIEW — NOT AUTHORISED FOR EXECUTION**.

This manifest follows [the provider-confirmation assessment](t19-provider-confirmation-20261023.md) and [the verification plan](t19-verification-plan.md). Scope is positive organisation and known synthetic invoice identity, V01. Zoho's Accounts-level token model is accepted from ticket169559907; no repeat broad OAuth investigation is planned. Review approval alone does not authorise OAuth, provider calls, connection enablement, merge or deployment.

## Current reconciliation — 24 October 2026

The inventory and four-read design below are historical preparation, superseded for Shalean by `config/t19-shalean-review.json`, E18–E21 in `t19-shalean-verification-record-20261023.md`, and the single-business procedure in `t19-milestone-a-implementation.md`. They are not missing-work instructions. Bokkie remains a separate incomplete package. No approval or provider acceptance is granted by this reconciliation.

| Item | Current Shalean evidence | Remaining prerequisite |
|---|---|---|
| Identity/membership/role/currency | E8–E11 recorded dedicated identity, sole visible TEST membership, invoice-reader permissions and ZAR | Attended identity confirmation for any later consent; actual API enforcement untested |
| Callback | E18 local callback aligned to existing registration | Preserve exact callback; no settings change |
| Fixture | E19 records INV-000001, invoice1589458000000103010/customer1589458000000103003, Draft/ZAR100 cents | Exact API response comparison not run |
| Operator/custodian/device | E20 Farai Chitekedza, SHALEAN, shalean\info | No need to renominate; recheck at action time |
| Probe/import implementation | E21 and PR106 recorded synthetic QA | Final changed-source QA and required hosted/security gates |
| Current client type/ownership/source | JSON explicitly Unknown / source false | Independently verify existing client and private source; no secret in evidence |
| Execution package | approved:false; reviewer/digest/window/identity/cleanup/approval references incomplete | Complete and separately approve exact package later |

The current Shalean service permits one profile GET and one known-invoice GET, not a combined four-read process. It separately gates local encrypted client import and attended OAuth code exchange; it has no refresh, sync, financial mutation or foreign-org probe. The historical no-storage/no-OAuth probe design below does not authorise these lifecycle actions. The maximum two Books reads are distinct from a separately approved OAuth exchange. Bokkie must have its own manifest/identity/grant/fixture and approval.

See [bounded gap reconciliation](t19-approval-cleanup-reconciliation-20261024.md) for requirement mapping, current code changes and unresolved acceptance. Earlier missing-fixture/probe/operator statements below are retained as history only. T19 remains In progress; accounting activation NO-GO.

## Historical per-business inventory

Values below are historical recorded expectations, not fresh provider verification. Missing values block execution; placeholders must never be sent to an API.

| Required field | Shalean TEST | Bokkie TEST |
|---|---|---|
| Dedicated Zoho identity | `faraios590@gmail.com` — historical candidate observed 20 October; current account identity/membership/role NOT VERIFIED | MISSING — owner must nominate a separate dedicated TEST identity |
| Allowed membership | Only Shalean TEST943440851; exact effective Books role/permissions MISSING | Only Bokkie TEST943440162; exact effective Books role/permissions MISSING |
| FaraiOS business UUID | `612be091-b1d7-4911-9c3b-143446a9fe27` | `0cc3f518-d64e-40c2-8817-bc14d1ef1420` |
| Expected organisation ID | `943440851` | `943440162` |
| Recorded organisation label | FaraiOS - Shalean TEST | FaraiOS - Bokkie TEST |
| Required profile | Exact ID, `is_org_active: true`, currency `ZAR`; owner must reconfirm expected configuration before execution | Exact ID, `is_org_active: true`, currency `ZAR`; owner must reconfirm expected configuration before execution |
| API host | `https://www.zohoapis.com` | `https://www.zohoapis.com` |
| Recorded connection alias | `FARAIOS_SHALEAN_TEST` — metadata alias only, not proof credentials exist | `FARAIOS_BOKKIE_TEST` — metadata alias only, not proof credentials exist |
| Connection ID / credential generation | MISSING; must be read from trusted TEST connection records and match review evidence | MISSING; must be read from trusted TEST connection records and match review evidence |
| Independent grant | NO USABLE GRANT ESTABLISHED; earlier diagnostic grants were acknowledged revoked | NO USABLE GRANT ESTABLISHED |
| Non-secret grant evidence required | Separate restricted-store reference/version, dedicated identity, client type/reference, grant date, exact scopes, status and custodian: MISSING | Separate restricted-store reference/version, dedicated identity, client type/reference, grant date, exact scopes, status and custodian: MISSING |
| Known synthetic Zoho invoice ID | MISSING — no provider-issued fixture ID in reviewed evidence | MISSING — no provider-issued fixture ID in reviewed evidence |
| Expected invoice marker/reference | MISSING; distinct Shalean TEST marker, recorded independently before any call | MISSING; distinct Bokkie TEST marker, recorded independently before any call |
| Expected invoice customer ID, number, status and total | MISSING; synthetic customer only, exact expected values required | MISSING; synthetic customer only, exact expected values required |
| Expected invoice currency | ZAR, subject to pre-run fixture confirmation | ZAR, subject to pre-run fixture confirmation |
| Owner confirming TEST-only data / approving reviewer | MISSING | MISSING |

Historical connection metadata was saved disabled, staging, version1 on20October. That version is not a verified current connection generation. A local draft invoice or fake test ID (for example9001) is not a known Zoho invoice. Do not substitute either. Dedicated client registrations alone do not establish separate identities or independent grants, and aliases do not establish token custody. Never copy a refresh token across the two bindings.

## Evidence needed before an executable revision

For each business, the owner or authorised custodian must supply non-secret, independently checked references confirming the dedicated account, account/Books membership and role, expected TEST-only organisation, and existing synthetic invoice tuple. Record who checked each item and when, plus a restricted evidence reference. The account must have no production or other-business organisation membership; a shared-account exception is outside this manifest. The historical screenshot cannot prove current membership or the identity used during earlier consent.

Grant metadata must establish separate issuance and credential references for A/B without displaying or comparing raw token values. Record exact read scopes and credential version. No existing usable grants are assumed. If new consent, exchange, refresh or revocation is needed, propose a separate explicit lifecycle authorisation with endpoints, client/identity, custodian, duration and cleanup scope before any such action. Do not retrieve credentials while preparing this manifest.

If a known invoice does not exist, stop at NOT ASSESSED and propose separately authorised synthetic fixture provisioning. This manifest does not permit creating invoices or searching production data to find a substitute. No secrets, authorisation codes, raw tokens, customer data or credential-store contents belong in chat, Git or screenshots.

## Proposed provider read allowlist (future approval only)

Required scopes: `ZohoBooks.settings.READ` and `ZohoBooks.invoices.READ` only. No contacts scope or contact request is necessary for this manifest; compare the returned invoice customer ID with its previously recorded synthetic value. Requests must use an independently reviewed read-only probe, never the write-capable sync adapter or existing setup command.

| Business | Method | Exact path/query template |
|---|---|---|
| Shalean TEST | GET | `https://www.zohoapis.com/books/v3/organizations/943440851?organization_id=943440851` |
| Shalean TEST | GET | `https://www.zohoapis.com/books/v3/invoices/{SHALEAN_VERIFIED_SYNTHETIC_INVOICE_ID}?organization_id=943440851` |
| Bokkie TEST | GET | `https://www.zohoapis.com/books/v3/organizations/943440162?organization_id=943440162` |
| Bokkie TEST | GET | `https://www.zohoapis.com/books/v3/invoices/{BOKKIE_VERIFIED_SYNTHETIC_INVOICE_ID}?organization_id=943440162` |

The brace placeholders must be replaced in a new reviewed revision. One profile GET followed by one invoice GET per business, sequentially; maximum four Books requests, zero automatic retries. The invoice GET is allowed only after that business's profile matches. Stop the run on the first failure; unattempted cases remain NOT RUN. Reject redirects, unexpected hosts, overridden organisation parameters and changed business/connection/generation. Fix request timeouts to12seconds and response bounds to2MB; timeout or oversized/malformed response stops the run. No lists, pagination, other-org probes, PDFs, attachments, contacts, payments, credits, sync, mutations or background jobs are allowed. These are proposed probe requirements, not a claim that a new executable probe has been implemented.

No OAuth endpoint is authorised here, including exchange, refresh and revocation POSTs. An expired or missing credential stops execution; it must never trigger automatic OAuth. Later execution approval must specify how short-lived access is supplied and disposed of safely. No credential save or connection activation is allowed.

## Acceptance and evidence record

Before each authorised future request, validate the approved dedicated identity/credential reference and immutable business/connection/generation binding against trusted TEST records. Grant breadth is not the tenant boundary. Preserve existing broad-token negative tests; do not make foreign-org requests to re-prove the known OAuth model.

A profile PASS requires HTTP success, numeric Books success code, exact returned organisation ID, explicit active state and expected currency. The organisation label corroborates identity; a changed label requires review, not automatic rebinding. Missing fields fail verification. An invoice PASS requires HTTP/Books success and exact provider invoice ID, number, reference, customer ID, currency, status and total matching the pre-recorded synthetic fixture. Any supplied response organisation identity must also match. An organisation copied into a local receipt is not independent response evidence; invoice context depends on the positively verified profile, pinned endpoint and known fixture together.

For each of the four planned reads record: manifest revision, reviewed probe SHA, reviewer/operator, UTC and SAST time, business/connection/generation, non-secret grant reference/version, sanitised endpoint, expected/actual synthetic identity fields, HTTP/Books category, safe provider correlation ID, request count, result and evidence location. Exclude auth headers, raw responses and tokens. Evidence should contain only the minimal approved synthetic fields.

Use PASS, FAIL, INCONCLUSIVE or NOT RUN. A401/403 is an authentication/permission rejection and fails this positive acceptance attempt; it does not prove universal token isolation. A404,5xx, timeout, malformed response or missing fields leaves identity unverified. Stop without retry, fallback, scope expansion, writes or auto-reauthorisation. Quarantine the verification result in the report; no runtime connection changes are authorised. A mismatch is FAIL and must never publish a verified connection.

Cleanup for any later approved run: close the probe, discard transient access material, retain only redacted evidence and record no saved credentials/enabled connections/provider mutations. If provider revocation is required, it needs its separate approved lifecycle scope; do not claim that deleting local material revokes a grant. Cleanup failure remains open and prevents another attempt.

## Review decision and outstanding gates

| Review item | Current state |
|---|---|
| Manifest structure and four-GET-only scope | Awaiting owner review |
| Both dedicated identities/current memberships/roles | Incomplete |
| Independent usable grants/custody/lifecycle plan | Incomplete; OAuth not authorised |
| Both known synthetic invoice tuples | Missing |
| Trusted connection IDs and generations | Missing |
| Read-only probe implementation and independent review | Not supplied by this documentation task |
| GitGuardian, hosted CI and Stage C approval | Required; no bypass or new PASS claimed |
| Provider execution approval for a completed revision | Not granted |
| Full T19 / accounting activation | NO-GO |

**Exact next action:** review this draft and complete the non-secret identity, membership, connection, grant and synthetic invoice evidence fields. Return a fully populated revision for explicit execution review after the required gates. There is no provider command to run now. Approval of this document's design does not by itself authorise missing grants, fixture creation, API calls or activation.

## Sources and work performed

- [Blueprint](blueprint.md), [historical public TEST bindings](invoices-and-accounting.md), [provider-model addendum](t19-provider-confirmation-20261023.md).
- [Build tracker, T19 Evidence](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit#gid=1719202610), A4:B12 read23October: organisation IDs, historical Shalean identity, prior revocation acknowledgements and absence of verified invoice contents.

This preparation used repository and tracker reads only. No Zoho/OAuth call, credential access, fixture creation, live connection, T04 change, merge or deploy occurred. Previous tests remain historical evidence; no new test run is claimed for this documentation-only manifest.
