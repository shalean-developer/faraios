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
| Current provider-confirmed organisation ID | Unknown | NOT VERIFIED | E5; no provider read | — |
| Historical exact organisation name | FaraiOS - Shalean TEST | RECORDED — NOT REVERIFIED | E2/E3 historical20October evidence | — |
| Current exact organisation name | Unknown | NOT VERIFIED | E5 | — |
| Organisation active state | Unknown | NOT VERIFIED | E5 | — |
| Expected base currency | ZAR | PROPOSED | E3 manifest expectation | — |
| Actual configured Books base currency | Unknown | NOT VERIFIED | No provider profile evidence | — |
| Configured connection alias / non-secret lookup reference | FARAIOS_SHALEAN_TEST | VERIFIED | E1 credential_key; not proof of stored credentials | 2026-10-23 13:06:52UTC |
| Configured API host | https://www.zohoapis.com | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| Environment / enabled | staging / false | VERIFIED | E1 | 2026-10-23 13:06:52UTC |
| Connection metadata version | 1 | VERIFIED | E1; not credential generation | 2026-10-23 13:06:52UTC |
| Connection created / last updated | Both2026-10-20 05:06:37.178148UTC | VERIFIED | E1 row timestamps | 2026-10-23 13:06:52UTC |
| Actual credential/grant generation | Unknown; absent from legacy connection schema | NOT VERIFIED | E1/E4; synthetic generation is separate | — |
| Credential-store reference existence / credential version | Unknown; alias alone does not prove credential material or version | NOT VERIFIED | Credential store not opened | — |
| Current grant state | Unknown | NOT VERIFIED | No active grant independently established | — |
| Historical diagnostic grant cleanup | Earlier newly issued refresh grants reported revoked | RECORDED — NOT REVERIFIED | E2; does not prove all grants absent | — |
| Historical login candidate | faraios590@gmail.com | RECORDED — NOT REVERIFIED | E2 screenshots20October | — |
| Current browser Zoho Accounts identity | accounts@shalean.com; label Shalean Cleaning Services | VERIFIED | E7 Accounts UI only | 2026-10-23 13:14UTC |
| Current authorised dedicated TEST identity | Unknown; browser account differs from historical candidate faraios590@gmail.com | NOT VERIFIED | E7; no TEST membership evidence | — |
| Dedicated account's full organisation memberships | Unknown | NOT VERIFIED | E5 | — |
| Exact Books role | Unknown | NOT VERIFIED | E5 | — |
| Effective invoice permissions | Unknown | NOT VERIFIED | E5; OAuth scope is not the Books role | — |
| Production/other-business account access | Unknown | NOT VERIFIED | No current full membership evidence | — |
| Historical server client reference/type | FaraiOS Shalean TEST; Server-based; exact recorded ID below | RECORDED — NOT REVERIFIED | E2 | — |
| Historical public client ID | 1000.ET7LNPRV6W7EM2HLL35E2X38RKEGVF | RECORDED — NOT REVERIFIED | E2 attempt B | — |
| Current grant client reference/type | Unknown | NOT VERIFIED | No current grant evidence | — |
| Historical diagnostic scope | ZohoBooks.invoices.READ | RECORDED — NOT REVERIFIED | E2 | — |
| Current granted scopes | Unknown | NOT VERIFIED | No current grant evidence | — |
| Grant issuance date | Unknown | NOT VERIFIED | Connection creation is not grant issuance | — |
| Grant-associated Zoho identity | Unknown | NOT VERIFIED | Historical consent identity not captured | — |
| Credential custodian | Unknown | NOT VERIFIED | No nominated custodian evidence | — |
| Support ticket/model | 169559907; Accounts-level access, membership/permissions, organisation selector | RECORDED — NOT REVERIFIED | E3 owner-supplied23October Sanu Jose guidance | — |
| Internal Shalean invoice count | 1 | VERIFIED | E1 business-filtered count only | 2026-10-23 13:06:42UTC |
| Internal rows with external invoice ID / provider binding / attempt ID | 0 /0 /0 | VERIFIED | E1 counts only | 2026-10-23 13:06:42UTC |
| Known synthetic Zoho invoice ID | Unknown | NOT VERIFIED | No provider evidence; internal row is not a Zoho invoice | — |
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
| Business-scoped credentials/permissions | Legacy operator-provisioned business/org/region/environment pins and DB membership checks exist. Stage B authenticates business/connection/generation/org context in synthetic encrypted envelopes. Actual credential custody, effective Zoho permissions and independent real grants remain unverified. |
| Organisation substitution | Existing/new synthetic tests reject foreign business/connection and org pin changes before egress. Legacy internal query spreading could allow a future reserved-key override; current controlled callers are not proof of an exploit, but hardening remains required. |
| Generation/revocation | Stage B generation fencing and disconnect races are tested. Legacy metadata version is not generation; cache lacks generation fencing. Real provider revocation/current-grant state not assessed. Local disable cannot recall already-dispatched requests. |
| Independent business ownership | Hosted metadata confirms two distinct business/org/alias rows, both disabled. This is not verification of the Zoho accounts or grant ownership. |
| No fallback | Reviewed adapter fails on wrong pins/hosts/permissions; new403 test expects only token exchange and pinned profile GET in a fake provider. No fallback is approved; actual provider/session path remains untested. |
| Cross-business invoice/customer access | Synthetic API/RLS/ACL/worker tests deny foreign records using deliberately broad tokens. Native PostgreSQL tests support local DB enforcement; privileged hosted metadata reads do not certify hosted end-user JWT/RLS. |

## Exact owner actions still needed

1. Identify the current dedicated TEST login. In a TEST-only account view, confirm the account identifier, full membership list, exact Books role and effective invoice permissions; establish whether any production/other-business membership exists without opening their financial records. Record checker/time and redacted evidence. Historical faraios590 is only a candidate.
2. In Shalean TEST organisation settings, independently confirm ID943440851, exact name, active state and actual base currency. Do not infer these from FaraiOS pins or switch into a production organisation.
3. Provide non-secret current grant/client metadata from the authorised custodian, if it already exists: separate reference/version, client reference/type, associated identity, scopes, issuance date, known state and custodian. If absent or unknown, say so. Do not issue/refresh a grant to complete the form. Resolve generation/custody implementation through the bounded design before activation; do not manufacture a generation number.
4. Identify an already-existing synthetic invoice in the verified TEST organisation only and record its ID, number, unique reference, synthetic customer ID, currency, status, total and ownership evidence. If none can be verified, retain every invoice field as NOT VERIFIED. Do not create or search production invoices.
5. Provide evidence references and timestamps. Never send credentials, codes, keys, raw auth headers or customer data. Current record completion does not change memberships, permissions, grant state or connection enablement.

Historical hold, superseded by E7: Zoho UI inspection was blocked by automatic approval review. Any request to resume that inspection must explicitly resolve the earlier no-access restriction; no workaround or API diagnostic is authorised. Manual evidence can complete the remaining record without changing this session's access boundary.

## Remaining gates and recommendation

A further controlled read-only V01 test is **necessary before connection acceptance**, once independently recorded TEST identity/profile and existing synthetic invoice expectations are available. It must prove profile and known invoice identity using the reviewed four-GET manifest, not an empty list or locally copied organisation field. A separately approved read-only probe and credential lifecycle are required; the older setup/sync helpers must not be run as substitutes. No such test was executed here.

Open gates: current dedicated identity/membership/permissions; independent grant custody and generation lifecycle; positive TEST profile/record evidence; legacy query/profile/generation corrections; hosted authenticated API/RLS acceptance; GitGuardian and hosted CI/Stage C approvals; later business-total reconciliation and visible failure acceptance. Existing scanner/CI decisions remain unchanged; no new security or CI PASS is claimed.

**PASS for completing the evidence-labelled record and confirming disabled staging metadata. NO-GO for full T19 acceptance or accounting activation.** The original tracker remains unchanged and T19 remains In progress. No T04, provider, financial, membership, credential or CI governance write, merge or deploy occurred.


## Independent QA result

Independent agent source review and fresh synthetic regression: **45/45 focused tests passed;26/26 native PostgreSQL tests passed; zero failures/skips**, Node24.14.1/PostgreSQL17.10, disposable cleanup confirmed. Runtime/test sources remained at c8cab677f75ec07dccf608420872c50abbde725e; this update changes documentation/evidence only. See E6 for final table review and limits. These checks support bounded local isolation, not current Zoho identity or hosted release acceptance.

## E7 — authorised browser follow-up, 23 October 2026

After explicit owner approval for read-only Shalean TEST account/profile/membership/permission inspection, the browser opened `https://accounts.zoho.com/home`. It displayed account label **Shalean Cleaning Services** and login **accounts@shalean.com**. Observation recorded at13:14UTC /15:14SAST. This establishes the current browser account only, not its TEST or production membership. The historical TEST candidate remains faraios590@gmail.com.

The prior automatic-review access hold is superseded by the new approval. The current blocker is account selection: the available browser identity differs from the historical TEST candidate and is not established as the dedicated TEST identity. Inspection stopped before opening Books, memberships or financial records. No sign-out, account switch, credential entry, OAuth, API diagnostic, financial access, permission change, merge or deployment occurred.

**Next action:** the user makes the intended dedicated TEST account available in the browser, or explicitly identifies the current account as the intended TEST identity for this inspection. Then continue the already-approved read-only profile, membership and permission checks. Do not infer production access merely from the email address. Current TEST organisation name/active state/base currency, account memberships and exact permissions remain NOT VERIFIED. No new approval for the same read-only scope is needed once the correct session is available.

T19 remains In progress; accounting activation NO-GO. This update is documentation only. The independent QA and regression results above describe the preceding review; no new test or independent-QA result is claimed for this browser observation.
