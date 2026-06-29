import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const WEBSITE_ID = "a7094dce-e509-4c22-965a-95a152a24ca2";

// Plesk seo-redirect sends apex → www; FaraiOS had www_to_apex (loop).
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/domain_settings?website_id=eq.${WEBSITE_ID}`,
  {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ www_redirect: "apex_to_www" }),
  }
);
console.log("PATCH status:", res.status);
console.log(JSON.stringify(await res.json(), null, 2));
