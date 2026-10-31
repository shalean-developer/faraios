# T19 Shalean TEST disconnect/reconnect acceptance — 31 October 2026

Decision: PASS for the Shalean staging connection lifecycle. T19 remains In progress; T20 Not started.

Deployed fingerprint: 2a9be96b53925b0cac83b58e4985d11bf42bd0f5301c2c2274354271a06184bb.

The owner privately supplied staging login credentials and a new short-lived code from the same TEST Self Client. Existing verified membership sessions established Shalean owner permission. No secret values were printed, read into model context or committed.

One bounded executed host lifecycle returned PASS with disconnected, accessBlocked, reconnected, refreshVerified, inputRemoved, configRestored, generationAdvanced and ownerSessionClosed all true. Standard disconnect confirmed provider revocation, persisted disconnected status and cleared the old encrypted envelope. Ordinary connection access failed before its operation callback could execute. The protected configuration was temporarily disabled for the existing private setup utility, which exchanged the new code, verified organisation 943440851 and exercised persisted-token refresh. Configuration was restored afterward.

Native metadata confirmed connected, generation 2 (previously 1), encrypted material present and operation lease released. Connection ID stayed unchanged. A fresh authenticated browser read displayed Connected / FaraiOS - Shalean TEST / 943440851 and invoice synchronization Not activated on staging. Health retained the expected source fingerprint and accounting/payment/notification dispatch disabled.

The temporary provision-staging.json containing the password and code was removed after success. Both diagnostic owner sessions closed. The task form was cancelled without saving any recurring job.

Initial combined browser submission timed out. Existing form/result state and native generation 1/released lease were checked before actual Run Now execution; no code was blindly replayed. Results were subsequently recovered from existing output and reconciled against native state.

This does not close T19: independent Bokkie enrollment, reliable background execution, explicitly approved synthetic draft creation, retry/interruption duplicate prevention, reconciliation and final owner acceptance remain outstanding. No invoice/customer/payment write or production change occurred. Canonical T19 tracker note contains the same evidence.
