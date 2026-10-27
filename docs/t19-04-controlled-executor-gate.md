# T19 controlled executor gate — source-only, no Docker commands

The gate consumes a read-only container inventory and an inspected exact resource identity. It refuses name collisions and refuses all creation requests, including those with a caller-supplied `ownerApproved=true`: such a boolean is not an authenticated owner authorization. Cleanup denies absent/mismatched 64-character Docker container IDs, nonce, exact name, image, labels or stopped state, and *still* denies removal even when these match until a separately approved cleanup executor exists.

This PR does not start or remove containers, create networks, mount writable filesystems or run SQL. This is a security boundary for the future runner, **not actual runtime-enforcement evidence**. Candidate UID 999, tmpfs path, capacity, service networking, PostgreSQL/Vault bootstrapping and rollback remain unverified. A future implementation must use an approved signed run receipt and strict one-run scope, recover after interrupted commands without deleting pre-existing resources, and record Docker inspect/SQLSTATE evidence after separate operator approval.

T19 In progress · A12 unresolved · managed execution NO-GO · Zoho activation NO-GO · T20 Not started.
