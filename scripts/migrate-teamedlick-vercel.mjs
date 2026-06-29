/**
 * Move teamedlick.co.za from legacy Vercel project to FaraiOS project.
 * Configure www to serve (not redirect) because Plesk seo-redirect sends apex → www.
 */
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

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM = process.env.FARAIOS_VERCEL_TEAM_ID;
const FARAIOS_PROJECT = process.env.FARAIOS_VERCEL_PROJECT_ID;
const OLD_PROJECT = "prj_Ul8aGlAOEoyK6ngFkE8a7zrdWx5y";
const DOMAINS = ["teamedlick.co.za", "www.teamedlick.co.za"];

function vercelUrl(path) {
  const base = `https://api.vercel.com${path}`;
  if (!TEAM) return base;
  return `${base}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(TEAM)}`;
}

async function vercelFetch(path, init) {
  const res = await fetch(vercelUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function removeDomain(projectId, domain) {
  const { ok, status, data } = await vercelFetch(
    `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
    { method: "DELETE" }
  );
  console.log(`Remove ${domain} from ${projectId}:`, status, data.error?.message ?? "ok");
  return ok || /not found/i.test(data.error?.message ?? "");
}

async function addDomain(projectId, domain, redirect = null) {
  const body = redirect ? { name: domain, redirect, redirectStatusCode: 307 } : { name: domain };
  const { ok, status, data } = await vercelFetch(
    `/v10/projects/${encodeURIComponent(projectId)}/domains`,
    { method: "POST", body: JSON.stringify(body) }
  );
  console.log(`Add ${domain} to ${projectId}:`, status, data.error?.message ?? data.name ?? "ok");
  return ok || /already|exist/i.test(data.error?.message ?? "");
}

async function main() {
  for (const domain of DOMAINS) {
    await removeDomain(OLD_PROJECT, domain);
  }

  // Apex serves directly; www also serves directly (Plesk already redirects apex → www)
  await addDomain(FARAIOS_PROJECT, "teamedlick.co.za");
  await addDomain(FARAIOS_PROJECT, "www.teamedlick.co.za");

  const list = await vercelFetch(`/v9/projects/${FARAIOS_PROJECT}/domains`, { method: "GET" });
  const rows = (list.data.domains ?? []).filter((d) => /teamedlick/i.test(d.name));
  console.log("\nFaraiOS project domains:", JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
