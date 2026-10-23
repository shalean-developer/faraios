# T07 hosted staging safeguards

Scope: T07 only. Source of truth: [FaraiOS Build Plan and Progress Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit), Build Tracker row8. Requires separate staging/production data and credentials, and staging unable to use live payments or send unintended messages. T07 remains In progress until all acceptance evidence passes.

## Initial hosting checkpoint — 23 October 2026

GitHub main: `58d30e51da775f9c9a5755de6377aee2e19b5e98`. Candidate PR107 is a draft. Plesk subscription738 holds production `faraios.com` (`/httpdocs`) and staging site841 `staging.faraios.com` (`/staging.faraios.com`). They share a subscription system user; separate OS account isolation is not claimed. Production has older Next.js files, no configured Git repository and Node disabled; these are untouched.

Staging Git repository `faraios-staging.git` clones `git@github.com:shalean-developer/faraios.git` using the already-authorized Default key. Initially selected main, deployment Disabled / No deployment, no post-deploy actions or configured webhook. Node24.22.0 selected; app remained disabled, startup app.js, root and document root both `/staging.faraios.com`. Owner completed Let's Encrypt issuance: certificate named `Lets Encrypt staging.faraios.com`, valid until21January2027, automatic renewal, HTTP-to-HTTPS redirect checked. Browser HTTPS loaded the Plesk default page without an interstitial. This proves TLS availability, not application readiness.

Staging Supabase is `xdmfyrsauvqznkloroxg`; held future production candidate is `zrlojsvkqipuwkkyfrkn`. Reset evidence is in [t07-environment-reset.md](t07-environment-reset.md). No staging application data is changed by this runtime work. Concurrent unrelated staging schema work is preserved; dashboard currently reports latest migration `t04_per_line_settlement_allocations`, which this task neither applies nor modifies.

Initial staging Auth:3users; email/password enabled, confirm email enabled, public signup enabled, phone/anonymous/manual linking/external providers disabled; custom SMTP off, no Auth hooks, site URL localhost3000, no redirects. Default SMTP off is **not** implied by custom SMTP off. This is an outstanding notification defect until suppression is configured and verified.

## Bounded implementation

`_passenger.cjs` imports the dedicated `hosted-staging.mjs`. Both refuse standalone boot outside verified Passenger or LiteSpeed runtimes; there is no public TCP fallback. Passenger binds its private Unix socket; LiteSpeed mode additionally validates the actual listening socket before admitting requests (see compatibility section). Hosted transport pins `https://staging.faraios.com`, checks exact Host and, in Passenger mode, Passenger's protected `!~Passenger-Proto: https`; it ignores client forwarding headers. Unsafe requests require the fixed HTTPS Origin. Session cookies use `__Host-`, Secure, HttpOnly, SameSite=Strict, Path=/ and no Domain. Existing loopback and read-only restore behavior, including their NODE_ENVproduction refusal, remains unchanged.

Hosted launcher pins the existing staging project URL/ref/publishable key. It refuses provider/database credential environment variables without printing values. Only a per-session public-key Supabase client is constructed; no accounting worker, private credential file or provider adapter is loaded. An SDK fetch boundary allows explicit existing staging REST resources/RPCs and password-token/user/local-logout Auth operations. It refuses all other destinations, message-capable Auth operations, admin/Edge/storage paths, accounting configuration/sync, schema overrides and redirects. This is a dispatch boundary, **not an OS-wide network sandbox**. No payment or message sender is implemented or activated.

`/environment-health` exposes the staging project ref, a SHA256 source fingerprint and qualified application dispatch status. It does not expose tokens, connection strings, environment contents or user records. Fingerprint generation covers runtime/config/public files and package lock; it identifies source bytes, not installed dependency integrity or a Git commit by itself. Compare its output with `node scripts/hosted-source-fingerprint.mjs` from the reviewed candidate and the Plesk Git deployment commit.

The staging-only `t07-deny-auth-email` Edge handler returns403 unconditionally without payload/token reads, imports, environment access, explicit logging or network calls. Keep gateway JWT verification enabled: gateway401 for an unsigned hook and handler403 for authenticated calls both intentionally suppress delivery. This is a deny endpoint, not successful webhook signature authentication. Enable it as the project's HTTPS Send Email hook so SMTP is replaced; disable public signup. No hook secret is copied into the application or evidence. Provider access logging is not claimed absent.

References: [Passenger secure headers](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/secure_http_headers.html), [Passenger reverse port binding](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html), [Supabase Send Email hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook). Supabase changelog checked23October2026; current relevant TLS deprecation does not require a change to this Node24 HTTPS client.

## Validation and remaining gates

Local before final fixes: syntax PASS; npm test285PASS,0FAIL,1SKIP (native PostgreSQL concurrency requires CI fixture). Independent focused review73/73PASS,0SKIP. Reviewer required sanitizing native URL-construction errors and qualifying notification health status; both corrected and a synthetic credential error test added. New deny-hook test proves it never reads the input payload. Final exact-head CI/native PostgreSQL and GitGuardian results remain required.

Pending evidence: saved staging Auth hook/signup/URL settings; safe synthetic Auth denial and existing password login; hosted Passenger/private-socket/TLS/origin/cookie/health checks; exact-source deployment readback; final CI/security and independent technical review. Formal GitHub review status must be reported separately from Codex technical review. Production remains held and undeployed. Do not promote or enable live payments/messages.

Deployment target is staging only: app root `/staging.faraios.com/app`, document root its `public/` subdirectory, startup `_passenger.cjs`, Node24, NODE_ENVproduction. Keep Git deployment manual, no webhook/autodeploy; deploy only reviewed candidate with required checks. On any failed guard, disable the staging Node application and retain the repository/data. Do not replace or clean `/httpdocs`, rotate production credentials or replay restore tooling.


## LiteSpeed compatibility (pending actual-host acceptance)

The observed Plesk server launches Node through `/usr/local/lsws/fcgi-bin/lsnode.js`, not Passenger. The initial Passenger-only guard refused startup and staging was disabled again. The separate LiteSpeed mode requires its actual loader, runtime object, matching app root/startup file and a private Unix socket. There is no standalone TCP fallback. Passenger retains its own protected HTTPS metadata.

LiteSpeed mode additionally requires the exact fingerprinted `public/.htaccess`: reject non-HTTPS requests using server TLS state, remove incoming `X-FaraiOS-Staging-HTTPS`, then set it to `on`. This ordinary header is not intrinsically protected. Configuration presence alone does not prove the web server applies these rules to Node routes. Keep staging disabled if actual-host checks cannot establish that boundary. Both modes pin the staging hostname and origin, retain Secure cookies, and ignore `X-Forwarded-Proto`; LiteSpeed also ignores Passenger metadata.

Before acceptance, run `npm run verify:t07-hosted` on the deployed source and confirm ordinary HTTPS works, wrong/duplicate/case-varied client markers are replaced, forged HTTP POST requests are rejected or redirected to HTTPS, aliases fail, and source/config paths are inaccessible. Verify the private socket and exact deployed source fingerprint independently. These probes do not replace a real authenticated staging login/logout acceptance check.
