# T19 corrected PostgreSQL image pin

The owner reported a successful --build-postgres-stat-owner copy-only build from staging commit 0a92384a390da5abd92774f7d38f9e5e8ef1eb9c, build bundle 55ed6a176285e034f0c02f8208d7cb953b0e33cc5f1a390aad79029cd412748a. The new immutable image is sha256:ab85056c03f387f1b544420d88198872035093af9df6455402284b2deabe6eec. Configuration was inherited unchanged from the accepted key-path base; two layers were added and the original 13-container/network/volume inventory remained unchanged. No runtime test or restore occurred in the build.

The synthetic harness now pins that image and migrate.sh SHA256 d408c9712be722ec27b6f9ea951be7a2e0859c1a4aeff295d927137494231afc. Its existing 32/30/29-layer parent-chain verification is retained. Storage remains on its already-built historical-migration derivative and Auth remains unchanged. The vendor stats SQL and every other audited file hash remain unchanged.

This update does not change owners by assumption or weaken the startup gate. The next fresh owner-signed run must prove all three core extension owners, restored redirection, full managed equality and all later safety/cleanup gates. The retained readback remains available on failure. Historical build records, failed runs and source captures are preserved unchanged. An old metadata capture may be reused only under the existing protected-path, signature/digest/source and 24-hour-age checks; execution requires a new receipt and owner signature.

No hosted data/permissions, checkpoint, protected restore project, provider accounting or T20 changes are included. Runtime compatibility and recovery remain unverified until their respective tests pass.
