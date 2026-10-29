# T19 PostgreSQL extension gate diagnostic correction

The first owner-signed run using the new derivative pins passed isolation, then failed POSTGRES_EXTENSION_OWNER_OR_CONFIG. Cleanup was verified; no checkpoint, restore or operational custody was used. This proves PostgreSQL startup and role checks reached the core-extension gate, not that the requested extension owners/configuration passed.

The adapter recorded the detailed readback only after the assertion. Cleanup consequently removed the fresh PostgreSQL container without retaining the failed values. The next signed bundle must durably record the non-secret extension name/version/schema/owner rows and privileged-extension setting before asserting the same requirements. A negative test proves this record survives gate failure and that no success record is emitted.

Extension identity is also compared as an exact set ordered locally by name, rather than relying on database row ordering/collation. Missing, duplicate or additional rows, incorrect version/schema/owner and disabled/missing redirection entries still fail. No cause is attributed to row ordering without actual runtime evidence. Full managed catalogue equality is unchanged.

Use a fresh nonce/signature for the changed bundle. The prior signed, protected metadata capture may be copied only after verifying its historical owner signature, expected-data digest, source identity and age under the existing 24-hour policy; the old approval must not authorize execution. Preserve the failed journal and both image-build receipts unchanged. Images and modified-file hashes do not change in this diagnostic source update.

T19 recovery remains unverified. The protected restore project and T20 remain excluded.
