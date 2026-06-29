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

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/website_domains?domain=ilike.*teamedlick*&select=domain,www_redirect_mode,status,website_id`;
const res = await fetch(url, {
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
console.log(JSON.stringify(await res.json(), null, 2));

const websites = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/websites?id=eq.a7094dce-e509-4c22-965a-95a152a24ca2&select=domain,subdomain,status`,
  {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }
);
console.log("website:", JSON.stringify(await websites.json(), null, 2));

const ds = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/domain_settings?custom_domain=ilike.*teamedlick*&select=www_redirect,custom_domain,website_id`,
  {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }
);
console.log("domain_settings:", JSON.stringify(await ds.json(), null, 2));
