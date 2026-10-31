# T19 hosted provider attempt and organisation verification correction

31Oct2026. Owner saved a fresh Self Client code privately and authorised execution. Exact merged source5ff0e53ffeb8a367af4b78464d45a8f769bfcf45/fingerprintf2ebb7e24069170eae9a7d9e99be171f67246475e82ccab5f8a303e619d0acdf was qualified before execution.

## Verified hosted facts

Private setup exchanged the code successfully and committed AES-GCM envelopeversion1 to the Shalean staging connection, generation1, organisation943440851. A later verification failed; status remains revocation_pending, organizationnull, no application activation. Reservation consumed/unresolved; durable operation lease released. No code replay or repeated grant generation attempted.

Safe read-only diagnostics using the encrypted grant: refreshHTTP200; detailedGET /books/v3/organizations/943440851?organization_id=943440851 returns403/Books104003. Error classification indicates permission denial; exact cause is not inferred from the code. GET /books/v3/organizations returns200/code0, exactly1listed organisation, exactly1matching943440851, active=true, currencyZAR, namepresent; Bokkie943440162 absent; no paginationmetadata. Neither token nor provider raw error body/customer/financial record printed. List absence alone is not proof that all Bokkie API operations are denied.

Official docs https://www.zoho.com/books/api/v3/organizations/ list GET /organizations with settings.READ and organisation metadata. Use that supported response for identity verification; no broader scopes, weakened TLS or hosting change required. This is exact ID/status/currency validation, not choosing the first/default organisation or treating empty invoice results as connection success.

## Source correction and recovery

Provider organisation() now selects exactly one pinned ID from the documented list, requires activeZAR/name and rejects absent/duplicate IDs, partial or malformed pagination and excessive lists. Keep detailed-endpoint failure evidence; do not claim a provider defect or that permission was changed.

Private --resume-staging STATE_DIGEST reauthenticates/rechecks the current owner, requires existing disabled pending connection with exact config/org binding, acquires its existing durable lease, refreshes from ciphertext, verifies identity, publishes the same generation and resolves the original consumed reservation. It never exchanges the used code, substitutes plaintext token input, or clears/reclaims leases. The digest is a non-secret hash from the scoped DB reservation, not the OAuth code/state. Ordinary second-refresh verification and failure fencing remain. No HTTP recovery endpoint.

Initial local edit had a method-closing syntax error, caught before publication; corrected. Final focused33/33PASS0skip and syntax verification; hosted recovery with corrected source not yet executed. New source must pass CI/review before staging delivery/recovery. No DB migration needed.

## Remaining controls

Keep configenabledfalse/defaultinactive startup. After successful recovery remove temporary owner-password/code input through a guarded private cleanup, verify its absence and public-pathdenial; preserve encrypted grant and encryption-key recovery material. Complete provider refresh across restart, disconnect/reconnect and ownerUI checks. Invoice worker/approvedsyntheticdraft/retryinterruptionreconciliation/Bokkie/ownerUAT remain open. No invoice creation/send/payment, no production change. T19 In progress; T20 Not started.
