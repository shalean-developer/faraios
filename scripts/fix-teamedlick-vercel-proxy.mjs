/**
 * Wire teamedlick.co.za to FaraiOS on Vercel (production runs on Vercel, not localhost:3000).
 */
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "basic-ftp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const DOMAIN = "teamedlick.co.za";
const WWW = "www.teamedlick.co.za";
const VERCEL_ORIGIN = "https://faraios.com";
const PROJECT_ID = process.env.FARAIOS_VERCEL_PROJECT_ID;
const TEAM_ID = process.env.FARAIOS_VERCEL_TEAM_ID;
const TOKEN = process.env.VERCEL_TOKEN;

function vercelUrl(path) {
  const base = `https://api.vercel.com${path}`;
  if (!TEAM_ID) return base;
  return `${base}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(TEAM_ID)}`;
}

async function addVercelDomain(name) {
  const res = await fetch(vercelUrl(`/v10/projects/${encodeURIComponent(PROJECT_ID)}/domains`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  console.log(`Vercel add ${name}:`, res.status, data.error?.message ?? data.name ?? "ok");
  return res.ok || /already|exist/i.test(data.error?.message ?? "");
}

async function pleskRequest(inner) {
  const endpoint = `${process.env.PLESK_API_URL.replace(/\/$/, "")}/enterprise/control/agent.php`;
  const packet = `<?xml version="1.0" encoding="UTF-8"?><packet version="1.6.9.0">${inner}</packet>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      HTTP_AUTH_LOGIN: process.env.PLESK_API_USERNAME,
      HTTP_AUTH_PASSWD: process.env.PLESK_API_SECRET,
      "Content-Type": "text/xml",
    },
    body: packet,
  });
  return res.text();
}

async function getFtpCredentials() {
  const xml = await pleskRequest(
    `<site><get><filter><id>742</id></filter><dataset><hosting/></dataset></get></site>`
  );
  return {
    login: xml.match(/<name>ftp_login<\/name>\s*<value>([^<]+)<\/value>/i)?.[1],
    password: xml.match(/<name>ftp_password<\/name>\s*<value>([^<]+)<\/value>/i)?.[1],
  };
}

const htaccess = `# FaraiOS on Vercel — proxy from Plesk LiteSpeed while preserving Host for tenant routing
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\\.well-known/
RewriteRule ^(.*)$ ${VERCEL_ORIGIN}/$1 [P,L]
`;

async function uploadHtaccess() {
  const { login, password } = await getFtpCredentials();
  const client = new Client();
  const tmp = resolve(scriptDir, ".htaccess.tmp");
  writeFileSync(tmp, htaccess, "utf8");
  try {
    await client.access({
      host: DOMAIN,
      user: login,
      password,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
    });
    await client.cd("httpdocs");
    await client.uploadFrom(tmp, ".htaccess");
    console.log("Uploaded .htaccess proxy to", VERCEL_ORIGIN);
  } finally {
    client.close();
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  if (!TOKEN || !PROJECT_ID) throw new Error("VERCEL_TOKEN / FARAIOS_VERCEL_PROJECT_ID missing");
  await addVercelDomain(DOMAIN);
  await addVercelDomain(WWW);
  await uploadHtaccess();
  console.log("Done — test https://www.teamedlick.co.za/ in ~30s");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
