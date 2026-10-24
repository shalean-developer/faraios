# T19 — Shalean TEST provisioning proposal

Proposal: T19-SHALEAN-PROVISION-20261023-v1. Prepared23October2026.
**DRAFT FOR REVIEW — NO EXECUTION AUTHORISATION. T19 remains In progress; acceptance/accounting activation NO-GO.**

This bounded proposal follows the [verification record, E10/E11](t19-shalean-verification-record-20261023.md), [read-only manifest](t19-test-read-only-manifest-20261023.md) and [provider confirmation](t19-provider-confirmation-20261023.md). It proposes one independent TEST grant and one synthetic draft invoice so a later read-only identity check has known expectations. No repeated investigation of Zoho's Accounts-level OAuth model is needed. This document supersedes earlier unknown Shalean identity statements only through the dated record; Bokkie and existing dependencies remain unchanged.

## Established evidence and proposed boundary

| Item | Value / evidence |
|---|---|
| FaraiOS business | 612be091-b1d7-4911-9c3b-143446a9fe27 |
| Books organisation | 943440851 — FaraiOS - Shalean TEST |
| Configured currency | ZAR, evidenced in E9 |
| Organisation active status | NOT VERIFIED; resolve explicitly during later V01 |
| Dedicated identity | faraios590@gmail.com, user943476475; verified E11 |
| Membership/role | E8 single Shalean TEST Books membership; E9 FaraiOS TEST Invoice Reader with View only and displayed write/admin permissions off; recheck only if changed/stale at execution |
| Existing grants | E11 Connected Apps explicitly empty; no usable dedicated grant established |
| Administrator | accounts@shalean.com, TEST Admin/Super Admin; may provision fixture only under future explicit approval |
| Existing fixture | E10 All Invoices empty; no known synthetic provider invoice |
| Existing binding | FARAIOS_SHALEAN_TEST; staging, disabled, metadata version1 at E1 timestamp; not a credential generation |
| Expected hosts | accounts.zoho.com and www.zohoapis.com, United States DC; client DC still requires confirmation |

No production data, Bokkie grant, permission change, runtime connection enablement, background sync, merge, deployment or migration is included. No existing administrator grant is reused, revoked or modified. The integration identity remains restricted; any permission rejection stops work rather than triggering elevation.

## Decisions required before an executable revision

| Required non-secret input | Current value |
|---|---|
| Named owner/approver | Unknown |
| Named credential custodian and backup | Unknown |
| Named TEST fixture operator and independent reviewer | Unknown |
| Current server-based client ID, owner, DC and exact registered callback | Unknown; historical client reference is not current verification |
| Approved callback handler implementation/reviewed SHA | Unknown |
| Restricted TEST secret-store location, access policy and audit mechanism | Unknown; no production vault capability is claimed |
| Trusted verification connection ID and credential-generation allocation | Unknown; cannot substitute legacy metadata version1 |
| Approved UTC start/end and cleanup deadline | Proposed one window of at most60minutes; exact timestamps Unknown |
| Reviewed probe SHA and security/CI/Stage C gate evidence | Unknown / outstanding |

The custodian may propose reuse of a suitable existing TEST server client after its ownership, callback and lack of operational dependency are verified without exposing secrets. If it cannot be safely reused, a separate TEST client registration must be explicitly included in a revised approval. No client creation or redirect change is implicitly authorised. Missing inputs block issuance; placeholders must never be used as runtime values.

## A — proposed independent grant lifecycle

1. Before consent, the operator verifies the Accounts identity is faraios590@gmail.com and the allowed Books membership is only organisation943440851. The reviewed callback must bind a cryptographically random, single-use state to the trusted TEST business/connection/generation, reject mismatches/replays, enforce the exact redirect and avoid logging query strings/codes. No client-supplied business claim is accepted as authorisation.
2. Proposed scopes are exactly `ZohoBooks.settings.READ` and `ZohoBooks.invoices.READ`, matching V01. No write, contacts, payments, banking or blanket scopes. These scopes do not expand the Books role. If profile READ is denied under the existing role, stop and report; no permission change or administrator credential fallback.
3. After specific action-time consent approval, allow one standard server-based authorisation-code flow under the dedicated identity and one server-side code exchange. Proposed Accounts routes: browser `https://accounts.zoho.com/oauth/v2/auth`, server POST `https://accounts.zoho.com/oauth/v2/token`. The executable revision must contain the reviewed client ID, callback, exact parameters and secret-handling path. No self-client experiment, alternate DC, fallback account or automatic retry.
4. Proposed offline grant is limited operationally to this verification window. This does not mean the provider refresh token automatically expires at60minutes. The custodian must retain it only in the approved encrypted TEST store until explicitly authorised cleanup; never chat, Git, screenshots, browser storage or a plaintext local credential file. Access tokens remain transient in the isolated runner. The existing write-capable setup/sync helpers are excluded.
5. Record non-secret grant reference/store version, client ID/type/DC, consenting identity, exact scopes, approval and exchange timestamps, custodian, verification connection ID and separately allocated generation. Bind credentials to environment/business/connection/generation/org; never share material with Bokkie or production. No claim is made that a display name or org parameter restricts the token itself.
6. **No refresh is included in this first window.** Use the newly issued short-lived access credential only while valid. Expiry,401/403, mismatch, incomplete metadata or uncertainty stops the run. A renewal attempt needs a new reviewed lifecycle revision, not automatic refresh or repeat consent. FaraiOS's staging connection remains disabled throughout; the reviewed probe is isolated from workers and sync.
7. Proposed cleanup is one narrowly targeted revocation of this newly issued TEST grant at completion or failure, followed by removal of transient/local material and disabling access to the stored grant. Prefer the custodian's dedicated-account Connected Apps UI, with exact newly created entry and identity confirmed. Never revoke all apps or the administrator's existing entry. Cleanup requires explicit approval as part of the future execution package; it is not executed now.
8. Record provider-confirmed revocation outcome, time, custodian and store disposition. If scope of revocation is ambiguous, or cleanup fails, stop and escalate to the custodian; mark cleanup incomplete and prevent another run. Local deletion alone is not provider revocation. A later operational grant would be a separate onboarding task with a new generation, refresh locking, cache/dispatch fencing and durable custody.

The proposed bound is one consent flow, one token exchange, zero refreshes and one targeted cleanup action. Any unexpected additional action needs review. Generic current Zoho documentation describes the server flow and user-managed Connected Apps revocation: [server-based OAuth](https://www.zoho.com/developer/oauth/web-server-apps/overview.html), [revocation reference](https://www.zoho.com/developer/oauth/revoke-oauth-token.html), consulted23October2026. Only public documentation was read; no authenticated provider action occurred. Programmatic revocation is not proposed for this window.

## B — proposed synthetic fixture provisioning

A future explicitly authorised administrator uses the Books UI, first confirming organisation943440851 and the TEST name. Use a separate administrator session from the integration identity. Maximum new records: **one synthetic customer if needed and one draft invoice**. No invoice-creation API scope is granted to the integration identity.

| Field | Proposed value; not yet created |
|---|---|
| Synthetic customer display name | FARAIOS SYNTHETIC — SHALEAN T19 — NO DELIVERY |
| Customer contact details | No real person, email, telephone, address, tax identifier, bank data or portal invitation; leave optional fields blank |
| Unique invoice reference | T19-SHALEAN-943440851-20261023-001 |
| Invoice number / provider IDs | Provider-assigned; Unknown until created, never guessed |
| Invoice date | Actual approved provisioning date |
| Status | Draft only; no send, mark sent, approve or payment |
| Currency | ZAR |
| Line | One synthetic verification service; quantity1; unit price ZAR1.00 |
| Expected total / balance | ZAR1.00 / ZAR1.00; zero discounts, shipping, adjustments or tax |
| Tax handling | Use existing valid no-tax treatment only if available; never change organisation tax configuration. If unavailable, stop and revise expected values before creation |
| Notes | Synthetic T19 TEST fixture. No real service, delivery or payment. Do not send. |

Before any write, confirm no email/portal/reminder/integration automation will send or act on the draft. If that cannot be established through existing TEST settings, stop; do not change settings. Reuse a clearly synthetic customer only if independently identified; do not search production contacts. Do not create an inventory/service catalogue item unless separately approved. If the UI requires additional records or real contact information, stop and revise.

Save one draft only after the owner approves the concrete fixture and creation scope. On timeout/uncertain save, do not retry creation blindly: inspect the TEST list read-only for the exact marker and reconcile. Duplicate or unexpected records stop the workflow. A second creation is outside the bound.

An independent reviewer then records organisation ID, customer ID, invoice ID, number, reference, date, currency, status, total and balance from the TEST UI, plus checker/time and minimal evidence. Confirm the draft persisted after leaving/reopening it. Only synthetic fixture fields enter Git. The tuple must be recorded before the later API probe; API output must not define its own expected values.

Proposed disposition: retain the single draft as a labelled reusable TEST fixture, with no delivery/payment and no automated cleanup. Deletion/voiding is outside this proposal and needs a separate decision. Customer and invoice state remain unchanged after provisioning.

## C — later read-only verification and gates

Fixture provisioning and grant issuance do not themselves prove T19 acceptance. Before issuing the grant, complete fixture expectations, reviewed probe and security gates so the credential window is not wasted. A Shalean-only executable revision of the existing manifest permits exactly two sequential Books GETs: pinned profile943440851, then the known invoice ID only if profile checks pass. It must enforce explicit active status, exact identity/currency, exact fixture tuple, current trusted connection/generation,12-second timeout,2MB response bound, no redirects, no lists and zero retries. Missing fields or denied permissions fail closed. No live foreign-org request is needed; existing synthetic negative tests remain applicable.

Outstanding engineering/release gates remain: reserved-query hardening; strict profile validation; generation-aware credential/cache/dispatch integration; real custody/revocation controls; hosted authenticated API/RLS acceptance; GitGuardian/CI and Stage C approval. Independent QA must review the executable lifecycle/probe, negative tests and redacted results. Previous45/45 and26/26 results are historical and do not certify new tooling or this provisioning flow. Bokkie verification, reconciliation and visible failure acceptance remain separate full-T19 gates.

## Review outcome requested

Review the scope and proposed fixture values first. Supply/resolve the Unknown owner, custodian, client/callback, store, generation, reviewer and time-window fields. The next deliverable is a complete executable approval package with exact actors, tool/runner SHA, client and store references, fixture values, time bounds, endpoint/request limits and cleanup action. **Design approval alone does not authorise OAuth, fixture writes, revocation or V01 execution.** No runtime command is provided now.

Prepared by document review only; no authenticated Zoho access, OAuth, credential read/write, fixture creation, permission change, production finance, T04 modification, merge or deployment. No new tests or independent QA run is claimed. Tracker history/dependencies are preserved.
