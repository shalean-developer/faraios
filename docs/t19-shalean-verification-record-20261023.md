# Shalean TEST — T19 connection verification record

23 October 2026. **PASS for bounded record verification; NO-GO for Zoho connection acceptance/accounting activation. T19 remains In progress.** No new runtime, schema, connection or grant was created. This record supplements, rather than overwrites, the [review manifest](t19-test-read-only-manifest-20261023.md).

## Evidence register

- E1: current Faraios connector project discovery and read-only schema/connection inspection in `faraios-staging`, project `xdmfyrsauvqznkloroxg`; non-secret readback [here](evidence/t19-shalean-record/staging-readback.json). Connection observations at2026-10-23 13:06:52UTC /15:06:52SAST; invoice aggregate at13:06:42UTC /15:06:42SAST. Only explicit metadata columns and business-filtered counts were read. No invoice snapshot, customer payload, secret or production database was read. These privileged metadata reads are not proof of RLS enforcement.
- E2: [tracker T19 Evidence](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit#gid=1719202610), A4:B12, read23October; historical20October organisation/identity/diagnostic evidence.
- E3: [historical accounting record](invoices-and-accounting.md), [provider confirmation](t19-provider-confirmation-20261023.md), owner-supplied ticket169559907 summary from Sanu Jose dated23October. Original support message not independently retrieved in this review.
- E4: inspected `database/invoices-draft.sql`, `database/accounting-stage-b.sql`, `src/zoho-books.js`, `src/accounting-stage-b.js` and focused test sources on branch `codex/t19-provider-confirmation`, base `c8cab67`.
- E5 (historical; browser access subsequently approved, see E7): browser inventory showed no existing Zoho tab. Attempt to open the Accounts page for identity verification was rejected by automatic approval review, citing prior no-Zoho-access instruction and private-session risk; no retry/workaround. Current Zoho UI identity/profile/permissions/invoice were not inspected. This does not prove an account is logged out or unavailable generally.
- E6: [independent QA](evidence/t19-shalean-record/independent-qa.md), fresh synthetic regression and source review. Same host/tool environment, not an external human audit.

Verified dates below refer only to the stated claim and evidence layer. A configured org pin is not a provider-verified org identity. A dash means no verification date, not an implicit pass.

## Completed verification table

| Field | Value | Verification status | Evidence source | Verified date |
|---|---|---|---|---|
| FaraiOS staging project | faraios-staging / xdmfyrsauvqznkloroxg | VERIFIED | E1 project discovery | 2026-10-23 |
| Connection row exists | Yes, public.business_accounting_connections | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| FaraiOS business association | 612be091-b1d7-4911-9c3b-143446a9fe27 | VERIFIED | E1 connection row | 2026-10-23 13:06:52UTC |
| Legacy connection record key | business_id =612be091-b1d7-4911-9c3b-143446a9fe27 | VERIFIED | E1 schema; E4 primary key | 2026-10-23 |
| Separate legacy connection ID | No separate id field in this schema | NOT APPLICABLE | E1 schema; E4 | 2026-10-23 |
| Configured provider | zoho_books | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| Configured organisation pin | 943440851 | VERIFIED | E1; configuration only | 2026-10-23 13:06:52UTC |
| Current browser-confirmed Books organisation ID | 943440851 | VERIFIED | E8 Books organisation listing and account panel; not API verification | 2026-10-23 13:20UTC |
| Historical exact organisation name | FaraiOS - Shalean TEST | RECORDED — NOT REVERIFIED | E2/E3 historical20October evidence | — |
| Current exact organisation name | FaraiOS - Shalean TEST | VERIFIED | E8 Books listing and header | 2026-10-23 13:20UTC |
| Organisation active state | Unknown; no explicit organisation active-status field visible | NOT VERIFIED | E9 profile screenshot; user Active and trial labels are not organisation status | — |
| Expected base currency | ZAR; now corroborated by configured base currency | VERIFIED | E9 currencies and profile screenshots | 2026-10-23 screenshot review |
| Actual configured Books base currency | ZAR — South African Rand; symbol R | VERIFIED | E9 Base Currency label and profile ZAR field | 2026-10-23 screenshot review |
| Configured connection alias / non-secret lookup reference | FARAIOS_SHALEAN_TEST | VERIFIED | E1 credential_key; not proof of stored credentials | 2026-10-23 13:06:52UTC |
| Configured API host | https://www.zohoapis.com | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| Environment / enabled | staging / false | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| Connection metadata version | 1 | VERIFIED | E1; not credential generation | 2026-10-23 13:06:52UTC |
| Connection created / last updated | Both2026-10-20 05:06:37.178148UTC | VERIFIED | E1 row timestamps | 2026-10-23 13:06:52UTC |
| Actual credential/grant generation | Unknown; absent from legacy connection schema | NOT VERIFIED | E1/E4; synthetic generation is separate | — |
| Credential-store reference existence / credential version | Unknown; alias alone does not prove credential material or version | NOT VERIFIED | Credential store not opened | — |
| Current grant state | No usable dedicated grant established; dedicated Connected Apps list is empty | NOT VERIFIED | E11 UI observation; no token/API validation performed | — |
| Historical diagnostic grant cleanup | Earlier newly issued refresh grants reported revoked | RECORDED — NOT REVERIFIED | E2; does not prove all grants absent | — |
| Historical login candidate | faraios590@gmail.com | RECORDED — NOT REVERIFIED | E2 screenshots20October | — |
| Current browser Zoho Accounts identity | faraios590@gmail.com; User ID943476475 | VERIFIED | E11 switched Accounts session; E10 administrator observation retained as history | 2026-10-23 14:13UTC |
| Current authorised dedicated TEST identity | faraios590@gmail.com; owner-selected TEST session | VERIFIED | E8; user confirmed switch, UI identity and membership match | 2026-10-23 13:20UTC |
| Current Books organisation membership list | My Organizations 1: FaraiOS - Shalean TEST943440851 only | VERIFIED | E8 Books Manage Organizations page | 2026-10-23 13:20UTC |
| Exact Books role | FaraiOS TEST Invoice Reader | VERIFIED | E9 Users and role screenshots | 2026-10-23 screenshot review |
| Configured invoice permissions | View selected; Create, Edit, Delete, Approve, Communication, Void invoices, Write Off invoices, Edit and Delete approved Invoices unselected | VERIFIED | E9 role matrix and More Permissions; configuration evidence only | 2026-10-23 screenshot review |
| Provider API enforcement of invoice permissions | Not tested | NOT VERIFIED | Screenshots are not an enforcement test | — |
| TEST user status | faraios590@gmail.com: Active | VERIFIED | E9 Users list; user status only | 2026-10-23 screenshot review |
| TEST administrator role/status | accounts@shalean.com: Admin, Super Admin designation, Active | VERIFIED | E9 Users list in Shalean TEST | 2026-10-23 screenshot review |
| Production/other-business Books memberships shown | None; current Books list has one TEST organisation only | VERIFIED | E8; bounded to current Books UI list, not all Zoho products/grants | 2026-10-23 13:20UTC |
| Historical server client reference/type | FaraiOS Shalean TEST; Server-based; exact recorded ID below | RECORDED — NOT REVERIFIED | E2 | — |
| Historical public client ID | 1000.ET7LNPRV6W7EM2HLL35E2X38RKEGVF | RECORDED — NOT REVERIFIED | E2 attempt B | — |
| Current grant client reference/type | Unknown; no connected-app entry available for dedicated identity | NOT VERIFIED | E11; administrator app in E10 is separate | — |
| Historical diagnostic scope | ZohoBooks.invoices.READ | RECORDED — NOT REVERIFIED | E2 | — |
| Current granted scopes | Unknown | NOT VERIFIED | No current grant evidence | — |
| Grant issuance date | Unknown | NOT VERIFIED | Connection creation is not grant issuance | — |
| Grant-associated Zoho identity | Unknown | NOT VERIFIED | Historical consent identity not captured | — |
| Credential custodian | Unknown | NOT VERIFIED | No nominated custodian evidence | — |
| Support ticket/model | 169559907; Accounts-level access, membership/permissions, organisation selector | RECORDED — NOT REVERIFIED | E3 owner-supplied23October Sanu Jose guidance | — |
| Internal Shalean invoice count | 1 | VERIFIED | E1 business-filtered count only | 2026-10-23 13:06:42UTC |
| Internal rows with external invoice ID / provider binding / attempt ID | 0 /0 /0 | VERIFIED | E1 counts only | 2026-10-23 13:06:42UTC |
| Known synthetic Zoho invoice ID | Unknown; no existing invoice found in TEST All Invoices | NOT VERIFIED | E10 empty-state browser observation; internal row is not a Zoho invoice | — |
| Zoho invoice number | Unknown | NOT VERIFIED | Same limitation | — |
| Unique synthetic invoice reference | Unknown | NOT VERIFIED | Same limitation | — |
| Synthetic Zoho customer ID | Unknown | NOT VERIFIED | Same limitation | — |
| Zoho invoice currency | Unknown | NOT VERIFIED | Same limitation | — |
| Zoho invoice status | Unknown | NOT VERIFIED | Same limitation | — |
| Zoho invoice total | Unknown | NOT VERIFIED | Same limitation | — |
| Invoice organisation ownership | Unknown | NOT VERIFIED | Same limitation | — |
| Provider invoice evidence reference | Unknown | NOT VERIFIED | No independently identifiable fixture | — |
| Separate Bokkie binding metadata | business0cc3f518-d64e-40c2-8817-bc14d1ef1420; org943440162; FARAIOS_BOKKIE_TEST; staging; disabled; version1 | VERIFIED | E1, metadata only | 2026-10-23 13:06:52UTC |
| Independent current Shalean/Bokkie grants | Unknown | NOT VERIFIED | Distinct metadata aliases are not grants | — |

## Isolation/security assessment

The bounded Stage B synthetic implementation and the legacy staging adapter are different layers. Stage B is not evidence of an active Zoho grant and was not installed during this review. No `t19_local.connections` columns appeared in the authorised hosted schema inspection.

| Required property | Assessment and remaining limit |
|---|---|
| Immutable business/org association | Stage B enforces immutable connection identity. Legacy business identity is immutable, but owner configuration can change org/alias before provider bindings exist; afterwards the configure function pins them. Do not claim unconditional legacy org immutability. |
| Business-scoped credentials/permissions | Legacy operator-provisioned business/org/region/environment pins and DB membership checks exist. Stage B authenticates business/connection/generation/org context in synthetic encrypted envelopes. Configured invoice permissions are now evidenced by E9; actual provider enforcement, credential custody and independent real grants remain unverified. |
| Organisation substitution | Existing/new synthetic tests reject foreign business/connection and org pin changes before egress. Legacy internal query spreading could allow a future reserved-key override; current controlled callers are not proof of an exploit, but hardening remains required. |
| Generation/revocation | Stage B generation fencing and disconnect races are tested. Legacy metadata version is not generation; cache lacks generation fencing. Real provider revocation/current-grant state not assessed. Local disable cannot recall already-dispatched requests. |
| Independent business ownership | Hosted metadata confirms two distinct business/org/alias rows, both disabled. This is not verification of the Zoho accounts or grant ownership. |
| No fallback | Reviewed adapter fails on wrong pins/hosts/permissions; new403 test expects only token exchange and pinned profile GET in a fake provider. No fallback is approved; actual provider/session path remains untested. |
| Cross-business invoice/customer access | Synthetic API/RLS/ACL/worker tests deny foreign records using deliberately broad tokens. Native PostgreSQL tests support local DB enforcement; privileged hosted metadata reads do not certify hosted end-user JWT/RLS. |

## Owner actions identified at the initial review (updated by E8 below)

1. Identify the current dedicated TEST login. In a TEST-only account view, confirm the account identifier, full membership list, exact Books role and effective invoice permissions; establish whether any production/other-business membership exists without opening their financial records. Record checker/time and redacted evidence. Historical faraios590 is only a candidate.
2. In Shalean TEST organisation settings, independently confirm ID943440851, exact name, active state and actual base currency. Do not infer these from FaraiOS pins or switch into a production organisation.
3. Provide non-secret current grant/client metadata from the authorised custodian, if it already exists: separate reference/version, client reference/type, associated identity, scopes, issuance date, known state and custodian. If absent or unknown, say so. Do not issue/refresh a grant to complete the form. Resolve generation/custody implementation through the bounded design before activation; do not manufacture a generation number.
4. Identify an already-existing synthetic invoice in the verified TEST organisation only and record its ID, number, unique reference, synthetic customer ID, currency, status, total and ownership evidence. If none can be verified, retain every invoice field as NOT VERIFIED. Do not create or search production invoices.
5. Provide evidence references and timestamps. Never send credentials, codes, keys, raw auth headers or customer data. Current record completion does not change memberships, permissions, grant state or connection enablement.

Historical hold, superseded by E7: Zoho UI inspection was blocked by automatic approval review. Any request to resume that inspection must explicitly resolve the earlier no-access restriction; no workaround or API diagnostic is authorised. Manual evidence can complete the remaining record without changing this session's access boundary.

## Remaining gates and recommendation (see E11 for latest browser evidence)

A further controlled read-only V01 test is **necessary before connection acceptance**, once independently recorded TEST identity/profile and existing synthetic invoice expectations are available. It must prove profile and known invoice identity using the reviewed four-GET manifest, not an empty list or locally copied organisation field. A separately approved read-only probe and credential lifecycle are required; the older setup/sync helpers must not be run as substitutes. No such test was executed here.

Open gates: explicit organisation active status; independent usable grant/client/scopes/issuance/identity/custodian evidence and generation lifecycle; known synthetic Zoho invoice and positive read-only profile/record verification; actual provider permission enforcement; legacy query/profile/generation corrections; hosted authenticated API/RLS acceptance; GitGuardian and hosted CI/Stage C approvals; later business-total reconciliation and visible failure acceptance. Current browser identity/membership and screenshot-evidenced role/configuration/base currency are recorded separately and need not be reinvestigated without changed evidence. Bokkie provider identity/grant verification remains a separate business gate. Existing scanner/CI decisions remain unchanged; no new security or CI PASS is claimed.

**PASS for completing the evidence-labelled record and confirming disabled staging metadata. NO-GO for full T19 acceptance or accounting activation.** The original tracker remains unchanged and T19 remains In progress. No T04, provider, financial, membership, credential or CI governance write, merge or deploy occurred.


## Independent QA result

Independent agent source review and fresh synthetic regression: **45/45 focused tests passed;26/26 native PostgreSQL tests passed; zero failures/skips**, Node24.14.1/PostgreSQL17.10, disposable cleanup confirmed. Runtime/test sources remained at c8cab677f75ec07dccf608420872c50abbde725e; this update changes documentation/evidence only. See E6 for final table review and limits. These checks support bounded local isolation, not current Zoho identity or hosted release acceptance.

## E7 — historical browser follow-up, superseded by E8 for current identity

After explicit owner approval for read-only Shalean TEST account/profile/membership/permission inspection, the browser opened `https://accounts.zoho.com/home`. It displayed account label **Shalean Cleaning Services** and login **accounts@shalean.com**. Observation recorded at13:14UTC /15:14SAST. This establishes the current browser account only, not its TEST or production membership. The historical TEST candidate remains faraios590@gmail.com.

The prior automatic-review access hold is superseded by the new approval. The current blocker is account selection: the available browser identity differs from the historical TEST candidate and is not established as the dedicated TEST identity. Inspection stopped before opening Books, memberships or financial records. No sign-out, account switch, credential entry, OAuth, API diagnostic, financial access, permission change, merge or deployment occurred.

**Next action:** the user makes the intended dedicated TEST account available in the browser, or explicitly identifies the current account as the intended TEST identity for this inspection. Then continue the already-approved read-only profile, membership and permission checks. Do not infer production access merely from the email address. Current TEST organisation name/active state/base currency, account memberships and exact permissions remain NOT VERIFIED. No new approval for the same read-only scope is needed once the correct session is available.

T19 remains In progress; accounting activation NO-GO. This update is documentation only. The independent QA and regression results above describe the preceding review; no new test or independent-QA result is claimed for this browser observation.

## E8 — switched TEST session: current browser verification

23 October2026, observation completed13:20UTC /15:20SAST. The owner reported switching to faraios590@gmail.com and authorised continued read-only TEST profile/membership/permission inspection. This supersedes E7's account-selection blocker and the initial owner-action item asking to identify the TEST login.

Browser-visible evidence:

- `https://accounts.zoho.com/home#profile/personal`: faraios590@gmail.com, user943476475, display profile Farai Chitekedza Faraios; United States data centre. No profile edit performed.
- `https://books.zoho.com/app/943440851#/organizations`: “You are a part of the following organizations”; **My Organizations 1**; only **FaraiOS - Shalean TEST**, organisation943440851, DEFAULT, PREMIUM TRIAL, created2026/10/20, edition South Africa. The organisation sidebar independently showed that same single organisation. No other Books membership, production or Bokkie, was listed. This is a current Books UI observation, not a universal statement about other Zoho services, old grants or future memberships.
- `https://books.zoho.com/app/943440851#/home/recentupdates`: exact TEST name in header. Account panel confirmed faraios590@gmail.com, user943476475 and organisation943440851 together. The page was accessible and the panel said premium trial ends in11days. Accessibility/trial status does not independently establish the provider's explicit active flag or base currency.
- Available navigation showed Home, Sales and Configure Features; account panel showed identity/help controls. No organisation-profile or Users/Roles settings were exposed in the inspected navigation. No role name or invoice permission matrix was displayed. No role is inferred from this limited UI. No guessed deep link, API call, privilege change or financial operation was used to work around the limitation.

The Accounts application launcher and Books navigation/account/organisation panels were read only. A referral information panel was opened while identifying an unlabeled top-bar control and closed without submission. The Leave Organization action was visible in the management menu but was never selected. No invoice/customer list or record was opened. No OAuth flow, provider API diagnostic, production finance, credential inspection, settings save, membership/permission change, merge or deployment occurred.

### Updated remaining owner actions

1. Provide an authorised Shalean TEST administrator's read-only evidence of the explicit organisation active state and configured base currency. South Africa edition is not proof of ZAR.
2. Provide the exact Books role assigned to user943476475 /faraios590@gmail.com and its effective invoice permission matrix (including read/create/edit/delete/send/payment capabilities where applicable), from TEST Users/Roles settings. Do not elevate this account merely to fill the record. No permission action test is requested.
3. Current usable grant/client/scopes/issuance/custodian and credential-generation/custody evidence remain unverified; supply existing non-secret evidence only. Browser sign-in is not OAuth grant verification.
4. Known synthetic provider invoice and positive V01 API verification remain outstanding under their separate approval requirements. Current browser identity/org evidence narrows the gap but does not replace the known-record test or activate accounting.

**PASS for browser identity, exact organisation name/ID and the current single-organisation Books membership list. NO-GO for full profile/permission verification and T19 acceptance.** T19 remains In progress, accounting activation NO-GO. Existing staging metadata retains its earlier timestamp. Existing QA/tests are historical; no fresh automated or independent-QA claim is made for this documentation-only browser update.

## E9 — owner-supplied administrator screenshots

Reviewed23October2026. These are user-supplied UI evidence, not a fresh live browser or API check. Exact screenshot capture times were not supplied; the review date must not be treated as an exact capture timestamp. Earlier unknown findings and E8 follow-up actions are preserved as history and superseded only for the fields below. The original attachments are retained byte-for-byte in [screenshots](evidence/t19-shalean-record/screenshots/).

| Evidence | Original attachment ID | What it establishes |
|---|---|---|
| [Users](evidence/t19-shalean-record/screenshots/users.png) | cb1d4b3b-8c95-43e1-9e07-6cdc2f95d97b | URL contains org943440851 and header Shalean TEST. faraios590@gmail.com is Active with FaraiOS TEST Invoice Reader role. accounts@shalean.com is Active, Admin, Super Admin. |
| [Role matrix](evidence/t19-shalean-record/screenshots/role-permissions.png) | 2df889de-98b7-4644-98a2-a4b4d1f6b280 | Invoices View selected; Create/Edit/Delete/Approve unselected. Full is an indeterminate/partial-selection indicator, not full access. Visible Settings permissions and Customer Payments main permissions unselected. |
| [Invoice additional permissions](evidence/t19-shalean-record/screenshots/invoice-more-permissions.png) | 02b73397-7290-4552-8e2d-822d6eb34399 | Communication, Void invoices, Write Off invoices, Edit and Delete approved Invoices all unselected. This cropped detail is correlated with the preceding role screenshot; it does not independently display org/user identity. |
| [Currencies](evidence/t19-shalean-record/screenshots/base-currency.png) | ee8b35df-71a2-44e0-9315-cddac45c08d1 | Shalean TEST header; ZAR — South African Rand explicitly labelled Base Currency, symbol R. |
| [Organisation profile](evidence/t19-shalean-record/screenshots/organisation-profile.png) | 848ea292-8dce-479a-9020-2dacfa568c37 | Organisation943440851, FaraiOS - Shalean TEST, South Africa, base currency ZAR. No explicit active-status field displayed. |

The screenshots of Edit Role/Profile are evidence of displayed values; they do not independently prove a save or lack of a save, persistence after editing, absence of unsaved changes, API behaviour, grant scope or current token state. No setting changes were performed by this update. The role description is intent; the checkbox screenshots support the recorded configured permissions. No claim is made about hidden permission options not shown. No elevation is needed merely to complete this record.

### Current remaining gates and exact next action

1. **Organisation active status: NOT VERIFIED.** No further UI search or status change is required now. Resolve through admissible explicit provider evidence during the separately approved controlled verification; do not infer it from active users, successful navigation or Premium Trial.
2. **Usable independent grant and custody:** non-secret reference/version, client/type, associated identity, granted scopes, issuance date, state and custodian remain unknown. Historic revoked diagnostics and browser login are not active grant evidence. Credential generation is not legacy metadata version1.
3. **Known synthetic provider invoice:** ID, number, unique test reference, customer ID, currency, status, total and organisation ownership evidence remain NOT VERIFIED. The existing internal FaraiOS draft is not provider evidence. Do not create an invoice to fill a gap without separate approval.
4. **Controlled read-only V01 verification:** complete the manifest with independently known expectations; implement/review a read-only probe and separately approve its execution and any credential lifecycle needed. For Shalean, the planned pair is the pinned organisation profile GET and known synthetic invoice GET. No OAuth/API diagnostics are authorised by this documentation task. Do not use the write-capable setup/sync helper.
5. **Engineering and release gates:** reserved org-query hardening, strict profile validation, generation-aware credential/dispatch integration, real custody/revocation controls, hosted authenticated API/RLS, GitGuardian, hosted CI and Stage C approval remain. Later business-total reconciliation and visible failure acceptance, plus independent Bokkie verification, are still required for full T19. No bypass, merge or activation follows from screenshot verification.

**Exact next action:** have the authorised TEST owner/custodian complete the manifest using already-existing non-secret grant metadata and an independently identifiable existing synthetic Shalean TEST invoice tuple, including evidence references and checker/date. If either is unavailable, record “No usable grant established” / “No known synthetic invoice” and return the incomplete manifest for a separately reviewed provisioning/lifecycle proposal; do not obtain new grants or create fixtures now. Stop there for review. Organisation active status stays NOT VERIFIED pending explicit evidence in the later controlled verification.

**PASS for incorporating the screenshots and documenting the displayed configuration; NO-GO for full T19 acceptance/accounting activation.** T19 remains In progress. No OAuth, provider API diagnostic, production-finance access, financial write, T04 change, settings modification, merge or deployment was performed. Prior independent QA and test results remain historical; this documentation-only update claims no new run. The original tracker and task dependencies are unchanged.

## E10 — read-only browser inspection of existing grant metadata and invoices

23 October 2026, completed approximately14:05UTC /16:05SAST. The owner authorised browser inspection to minimise manual work. Scope remained existing non-secret metadata and existing synthetic invoices in Shalean TEST only. Earlier observations remain historical evidence; this section supplies the latest account attribution and invoice result.

- Zoho Accounts displayed the signed-in identity **accounts@shalean.com**, label Shalean Cleaning Services. Its Connected Apps detail showed **FaraiOS Shalean TEST**, **United States DC**, **Approved on2026/10/20**. This verifies a connected-app entry under the administrator identity, not an independent grant under faraios590@gmail.com. The app display name does not establish organisation restriction. Approval date is not a verified token-issuance timestamp.
- The UI did not establish public client ID/type, current granted scopes, token validity, independent grant reference/version, custodian or credential generation. None was inferred from DOM identifiers, app name, historical client metadata or staging alias. The dedicated TEST identity's current Connected Apps list was not inspected in this administrator session. Its grant remains **NOT VERIFIED**; this does not establish that no grant exists.
- Books remained in **FaraiOS - Shalean TEST**, organisation **943440851**. Closing settings and opening Sales > Invoices reached `https://books.zoho.com/app/943440851#/invoices?filter_by=Status.All&per_page=25&sort_column=created_time&sort_order=D`. **All Invoices** displayed the empty onboarding state: “It's time to get paid!” and “Learn how to create your first invoice”, with no invoice rows. **No known synthetic provider invoice was found.** This is an administrator UI observation, not an API/database assertion that no record can exist elsewhere. No invoice was created or imported. All required provider invoice tuple fields remain **NOT VERIFIED**.
- Organisation active status remains **NOT VERIFIED**. Browser accessibility, trial labels and active user statuses are not an explicit organisation-active result.

Only necessary textual observations are retained. The supplied Accounts screenshots contain unrelated session/IP/location details and were not copied into repository evidence. No OAuth, token exchange/refresh, provider API diagnostic, credential inspection, production organisation/finance access, revocation, settings/permission change, financial write, merge or deployment occurred. Prior QA/test results are historical; no new automated test, independent QA, CI or GitGuardian result is claimed for this documentation-only update. Tracker status/dependencies remain unchanged.

### Exact next action and remaining gates

**Exact next action:** the owner makes the existing `faraios590@gmail.com` Accounts session available, then the agent can continue the already-authorised read-only Connected Apps inspection to attribute any existing grant metadata. Do not initiate consent or create/refresh a grant. If no suitable existing entry is available, record that limitation. No permission elevation is needed.

The invoice gate now requires a separately reviewed synthetic-fixture provisioning proposal because this TEST All Invoices view is empty; current authorisation does not permit creating one. Existing non-secret custodian/client/scope/generation details not exposed in Accounts must come from the authorised custodian, without sharing secrets. After those expectations are available, separately approved controlled V01 profile/known-invoice verification must resolve explicit active status and actual provider enforcement. Engineering corrections, hosted authenticated API/RLS, GitGuardian/CI, Stage C approval, later reconciliation/failure acceptance and separate Bokkie verification remain as listed in E9.

**PASS for bounded browser evidence collection. NO-GO for T19 acceptance or accounting activation.** T19 remains In progress.

## E11 — dedicated TEST identity and empty Connected Apps list

23 October 2026, observed14:13UTC /16:13SAST. The owner reported switching to faraios590@gmail.com and explicitly authorised identity verification, existing Connected Apps inspection and this record update. This completes E10's account-switch next action. Historical observations remain intact.

- The Accounts session visibly identified **Farai Chitekedza Faraios**, **faraios590@gmail.com**, **User ID943476475**, **United States data center**.
- From the visible Sessions navigation, Connected Apps was opened at `https://accounts.zoho.com/home#sessions/userconnectedapps`. The section explicitly displayed **“There are no apps connected to this account.”** This is a verified UI observation for that identity at the stated time. No existing entry or grant detail was available to inspect.
- The **FaraiOS Shalean TEST** entry observed under **accounts@shalean.com** in E10 remains separate administrator-account evidence. It must not be relabelled as a grant belonging to faraios590@gmail.com or used to certify the restricted invoice-reader identity.
- **No usable dedicated grant established.** Public client/type, scopes, issuance date, custody/reference/version and credential generation remain **NOT VERIFIED**. The empty UI is not an exhaustive token inventory or an API revocation/validity test. No stored credentials were inspected.

Only minimal non-secret textual evidence is recorded; unrelated session/device/location information is omitted. No OAuth/consent, token exchange/refresh, API diagnostic, permission change, invoice creation, production-finance access, merge or deployment occurred. No Books financial page was opened in this follow-up. Organisation active status remains **NOT VERIFIED**. E10's empty TEST invoice-list observation stands; no known synthetic provider invoice is established.

### Current next action and acceptance readiness

**Exact next action:** prepare a bounded Shalean TEST provisioning/lifecycle proposal for owner review, covering an independent invoice-read grant under faraios590@gmail.com, named credential custodian and secret storage/generation/revocation controls, and one synthetic invoice fixture in organisation943440851 with independently recorded expected values. Preparing the proposal does not authorise issuing a grant, creating an invoice or executing V01. No additional account switching or repeated OAuth investigation is needed to complete this evidence check.

Remaining gates: separately approved provisioning where required; explicit organisation active status; controlled read-only profile/known-invoice identity and permission enforcement verification; outstanding engineering corrections and hosted authenticated API/RLS acceptance; GitGuardian/CI and Stage C approvals; later reconciliation/visible failure acceptance; independent Bokkie verification. See E9 for the detailed engineering list. Tracker status and dependencies remain unchanged.

**PASS for the requested identity/Connected Apps inspection and record update; NO-GO for T19 acceptance/accounting activation.** T19 remains In progress. Prior independent QA/tests are historical; no fresh automated or independent-QA result is claimed for this documentation-only follow-up.
