# T21 hosted rejection display correction

During approved staging acceptance on 1 November 2026, the synthetic Shalean R100 invoice was correctly paid by R40 and R60, and a verified excess R10 allocation correctly rejected. SQL preserved that R10 as unmatched. The server's unhandled EFT error fell through to a generic sign-in page instead of explaining the rejected action inside the EFT workspace.

This bounded correction catches T21 form-operation errors, re-reads saved receipts, and returns HTTP409 with an alert inside the existing workspace. The alert does not assert rollback or success based on a transport failure: users inspect persisted evidence and the invoice balance before retrying. Session/business authorization and Origin/exact-field/body checks remain in place. No schema, payment rule, provider, business mapping or unrelated module change.

Real HTTP-to-PGlite regression now submits a duplicate bank transaction, asserts HTTP409, alert/workspace/evidence visibility, absence of the sign-in page and unchanged receipt count. Focused T21/server regression:55/55 PASS,0fail0skip. Hosted CI must qualify the exact correction before staging deployment. Recheck the actual over-allocation rejection after deployment. User's existing T21 staging package approval covers this necessary error-handling correction; no broader scope or production authority is inferred.
