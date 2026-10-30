# T19 runtime commit refusal — exact public-schema grant correction

30 October2026. Source correction only; no new hosted execution is authorised. T19 remains In progress and T20 excluded.

The approved runtime candidate in `/root/t19-runtime-commit-fTCvFjHx` stopped before COMMIT with `T19_RUNTIME_EXACT_CONTRACT_MISMATCH`, component `runtimeSchemaGrants`. Both psql calls exited3; preserve the complete journal and intent, never replay it. Its original contract pin and approval remain historical evidence, not authority for corrected bytes.

An independent read-only execution of the unchanged native capture returned the original baseline `a94b2ba59a7bab2e2345c10e7a51a8a029dbfa642ded3633c652a7232bb94fd5`; a separate read confirmed runtime owner absence. This establishes unchanged protected state after the refused attempt, not a successful installation.

The hosted readback confirms that postgres has USAGE WITH GRANT OPTION on public. The disposable managed-role fixture had been given USAGE/CREATE without grant options. Its runtime migration could therefore rely on inherited PUBLIC USAGE but could not reproduce the direct USAGE grant to t19_runtime_owner. The exact contract guard correctly refused the differing actual direct-grant surface.

The correction gives only the disposable executor the observed public-schema grant option and explicitly asserts it, adds exactly `["public","USAGE",false]` to the expected runtime schema grants, and updates the contract integrity pin. No wildcard, optional entry or ignored schema is introduced. The original runtime SQL, rollback packets, historical evidence and all other contract entries remain unchanged. The runtime owner receives USAGE without grant option; it does not gain CREATE or role-administration authority.

Validation requires embedded full-stage and offline preparation tests plus the current-head native PostgreSQL17 TLS generated-commit, drift rollback, replay denial and fresh-readback gate. Merge only after all checks pass. Then obtain a fresh capture/new nonce/new packet and separate exact commit approval; previous approval does not cover the corrected contract. Custody services, schedules, LOGIN, machine identities, credentials, OAuth/API stages, provider operations and production remain disabled or untouched.
