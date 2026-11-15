# Staff email onboarding — preview candidate

Owner authorization: implement the 15 November staff onboarding audit. Production is not authorized by this work package.

## Scope
Staff search by name/email; Save then invite; owner-selected role; email-bound invitations to existing or new accounts; encrypted transactional outbox; manual explicit acceptance; atomic worker linking; scope selection; resend/expiry/revoke; explicit deactivate-and-revoke action. Existing UUID/manual invitations remain intact. No customer/admin dashboard features.

## Installation order
1. Run the Foundation regression and staff onboarding browser checks against the exact candidate. Keep original preservation manifests and inspect the bounded source delta.
2. Prepare the account release using `python3 docs/sc04/readiness.py /private/output/candidate`. This includes the earlier SC04 adapters and new onboarding files. Compare live/preview hashes before any bounded file installation; never overwrite concurrent main work.
3. Install `docs/onboarding/install.sql` exactly once after the existing SC04 live-readiness functions. It is intentionally outside automatic migrations. All new functionality starts closed through `staff_onboarding_businesses`; it does not modify the existing delegation switch or any existing membership/invitation.
4. For hosted acceptance register ONLY preview businesses `2f16e658-e031-4c4a-930a-2731ec1d1492` and `4627f805-8243-4890-bf18-a14fdf3fd21b` in the new private allowlist. The original registered preview scopes and delegation gate must also allow the exercise. Do not enable Shalean live for this new flow or reactivate old fixtures blindly.
5. Run the CLI key generator into a NEW directory outside the website. It writes disabled 0600 web/worker configs and a 0700 directory; it prints no keys. Web receives only public encryption key; worker keeps the private key. Confirm sodium support on hosting before installation. Keep private key in the existing encrypted configuration backup/restore workflow.
6. Populate the worker service/Resend keys privately through the existing secure workflow. Reuse the verified notifications sender; restrict preview recipients to approved controlled inboxes. Set `FARAIOS_STAFF_INVITE_CONFIG` for the web process and `FARAIOS_STAFF_MAIL_CONFIG` for the worker. Never commit configs or credentials. Keep enquiries and its existing schedules unchanged; add a separately reviewed invitation worker schedule only after config validation.
7. Run `php scripts/staff-invitation-worker.php` in preview. Provider acceptance is not inbox delivery: prove receipt and link operation in an approved controlled mailbox. Check existing/new account signup, confirmation, sign-in and password-reset return; reopening the invitation email supports a different device.
8. Finish desktop/physical-phone, all-role isolation/direct-API, retained-token/session revocation and fresh current-state encrypted backup/isolated restore. Disable the two new preview feature entries and any test delegation at closeout; retain all records/history. Present exact tested production scope for authorization.

## Rollback and preservation
Disable the new feature allowlist/config/worker rather than deleting data. Existing memberships are still governed by existing authorization; disabling invitation issuance alone does not revoke accepted access. Explicitly revoke any accepted synthetic memberships during closeout. Restore only the bounded previous app-file bytes if required, using hash guards. Never roll an old database over current owner records. Retain both manual and email invitation audit histories. Retain encrypted key material needed to retry pending jobs; rotate only with a deliberate invalidation/reissue procedure.

## Limits
This branch is a candidate until hosted acceptance. Local transport/Auth are simulated, though database/RLS/PHP/encryption and HTTP sessions are native. Browser viewport checks are not physical-phone proof. Email webhooks are not added: status reports queued/sending/provider_accepted/failed/cancelled and never invents Delivered. Legacy manual invitations must be explicitly resolved by their owner before a new email invitation for the same recipient; Tendai’s current invitation is preserved.

Staff activity and login membership remain separate concepts. The explicit Deactivate and revoke access action performs both in one transaction; normal staff status editing does not silently alter login access and the UI says so. Email edits never transfer identity. Duplicate staff email matches remain separate named records; only one pending email invitation per business/environment is permitted.
