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
const q = TEAM ? `?teamId=${encodeURIComponent(TEAM)}` : "";

async function vercel(path) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

const domains = await vercel(`/v9/projects/${process.env.FARAIOS_VERCEL_PROJECT_ID}/domains${q}`);
console.log("Project domains:", JSON.stringify(domains, null, 2));

const v6 = await vercel(`/v6/domains/teamedlick.co.za${q}`);
console.log("\nDomain config:", JSON.stringify(v6, null, 2));
