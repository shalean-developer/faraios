# Local dashboard preview

Run Node 24: `npm ci --ignore-scripts`, `node dev.mjs`, then open http://127.0.0.1:3100/login.

The preview is dependency-free and loopback-only. Demo personas are synthetic, not user accounts: owner sees two businesses, Bokkie manager sees Bokkie, cleaner sees assigned business navigation. Browser tampering with the business URL is denied server-side. Operational metrics show not connected rather than invented financial/job counts. Planned navigation is non-interactive and labelled.

The demo has short-lived in-memory sessions, origin checks, HttpOnly/SameSite cookies, host checks, restrictive content policy and production-mode refusal. These are demo safeguards, not production authentication. No passwords are collected. Do not deploy this server or bind a public development proxy. It does not have Supabase, persistent membership, API/RLS enforcement or production security approval. NODE_ENV=production or omitting explicit demo mode returns service unavailable.

This advances local application preparation for T06 and previews T10; T07–T10 remain uncompleted until real environments, identity, database access control and acceptance tests exist. CPU/RAM/process capacity verification is deferred by owner instruction on 19 October 2026 and remains a deployment gate.
