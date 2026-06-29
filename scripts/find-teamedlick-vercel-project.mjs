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

const projects = await vercel(`/v9/projects${q}`);
for (const p of projects.projects ?? []) {
  const domains = await vercel(`/v9/projects/${p.id}/domains${q}`);
  const match = (domains.domains ?? []).filter((d) =>
    /teamedlick/i.test(d.name)
  );
  if (match.length) {
    console.log("Project:", p.name, p.id);
    console.log("Domains:", match);
  }
}

// Check domain assignment via v6 config endpoint
const cfg = await vercel(`/v9/domains/teamedlick.co.za/config${q}`);
console.log("\nDomain project config:", JSON.stringify(cfg, null, 2));
