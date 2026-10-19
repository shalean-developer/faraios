# Local client connected to staging Auth

Run Node 24: `npm ci --ignore-scripts`, then `npm run staging`. Open http://127.0.0.1:3101/login. Demo remains on port 3100; this separate port uses real Supabase staging Auth.

Project xdmfyrsauvqznkloroxg only. config/staging.json intentionally contains the publicly distributable publishable key and URL, never a secret/service-role key. SDK pinned to 2.118.0. User-password login is handled by Supabase signInWithPassword. Passwords are not logged or stored; provider tokens remain in short-lived server memory behind an opaque HttpOnly/SameSite cookie. auth.getUser verifies identity and user-token-scoped queries reload memberships and business names. Client metadata does not grant roles.

Local-only implementation. Host/origin/loopback checks reject foreign requests. Five failed login attempts per minute across the local instance trigger throttling; hosted Auth rate limits also apply. Sign-out clears local session and requests provider signOut with local scope. Browser cross-origin requests are denied. Expiry requires re-authentication after 30 minutes or provider access-token expiry; automatic refresh, durable session storage, multi-process deployment and production HTTPS cookie settings are not implemented. Do not deploy this local server.

First account: owner creates an email/password user in this exact staging project's Authentication → Users → Add user → Create new user, entering a unique staging-only password privately. Do not paste passwords or tokens in chat. An account initially has no business memberships. After identity is verified and the owner identifies the intended account, provision the two business memberships through a separately audited workflow; never infer ownership from signup.

Validation scope: automated tests use provider doubles for sign-in/session/dashboard behaviour. Live database RLS already passed separately. Real successful password login and live logout need the owner-created test account and are pending. No accounts or emails were created/sent by this package.
