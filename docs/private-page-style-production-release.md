# Private page styling production release — 13 November 2026

Owner reviewed tested preview and instructed Deploy. PR16 merged as f28830d373b77b70ca6ff2e4c1f1248ecfdcf663 with expected headb663c3d864687e8c5608affef1a72a1417fe0c91. Latest-head GitGuardian security check success; no combined commit statuses. Prior11 native workflow checks PASS, profiles/services/dashboard6 rerun checks PASS after duplicate cleanup, PHP/whitespace PASS. Preview evidence docs/private-page-style-preview.md. No paid Actions.

Connected Allanux existing session → reseller Log in to Plesk → fresh hosting session. Confirmed faraios.git main production /faraios.com target. Pull now displayed PR16 merge. Production Deploy now returned Deployment task has completed, Done. Preview and waitlist repositories not deployed/changed during release.

Live /account/profile.php correctly redirected expired session to existing sign-in. Owner asked to sign in and reply Ready. Authenticated live styling/headings/action verification is PENDING. Do not label live UI checks passed until observed.

No schema changes, hosted data writes, integrations, notifications, Resend access or waitlist webhook/recovery operations. Protected production bookings/invoices/reversal ledger/staff/publication state and retained preview history preserved through unchanged handlers/database. Source-only presentation changes plus existing Services create-link correction. No new database fingerprint claim.

Rollback application to PR15 a667162e145ed5b0028f68b8e9cb11256ea2bab9 and deploy using production Git; no data rollback/reset/deletion.
