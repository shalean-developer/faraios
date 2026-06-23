import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/promote-platform-admin.mjs <email>");
  process.exit(1);
}

function loadEnvLocal() {
  const env = {};
  try {
    const envText = readFileSync(".env.local", "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    /* .env.local optional when vars are already exported */
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId() {
  const { data: userRow, error: userError } = await admin
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (userError) {
    console.warn(`users table lookup failed: ${userError.message}`);
  } else if (userRow?.id) {
    return userRow.id;
  }

  const authRes = await fetch(
    `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (authRes.ok) {
    const payload = await authRes.json();
    const users = Array.isArray(payload?.users)
      ? payload.users
      : Array.isArray(payload)
        ? payload
        : [];
    const match = users.find(
      (user) => (user.email || "").toLowerCase() === email
    );
    if (match?.id) return match.id;
  } else {
    console.warn(
      `auth admin users lookup failed: ${authRes.status} ${await authRes.text()}`
    );
  }

  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);

    const match = data.users.find(
      (user) => (user.email || "").toLowerCase() === email
    );
    if (match) return match.id;

    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

const userId = await findUserId();
if (!userId) {
  console.error(`No auth user found for ${email}`);
  process.exit(1);
}

console.log(`Found user ${email} (${userId})`);

const restRes = await fetch(`${url}/rest/v1/platform_admins`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({ user_id: userId }),
});

if (!restRes.ok) {
  const body = await restRes.text();
  console.error(`platform_admins insert failed: ${restRes.status} ${body}`);
  process.exit(1);
}

console.log(`Promoted ${email} to platform admin (user_id: ${userId})`);
