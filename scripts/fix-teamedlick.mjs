/**
 * Fix teamedlick.co.za: set website domain + upload .htaccess reverse proxy via FTP.
 * Plesk XML API returns ok for additional-settings but does not persist them (known limitation).
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

const SERVICE_ID = "5fcdd141-61b8-4a9a-a662-a9990e856702";
const WEBSITE_ID = "a7094dce-e509-4c22-965a-95a152a24ca2";
const DOMAIN = "teamedlick.co.za";
const ORIGIN = process.env.FARAIOS_PLESK_APP_ORIGIN ?? "http://127.0.0.1:3000";

async function supabasePatch(table, query, body) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
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
  const login = xml.match(/<name>ftp_login<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];
  const password = xml.match(/<name>ftp_password<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];
  if (!login || !password) throw new Error("Could not read FTP credentials from Plesk");
  return { login, password };
}

const htaccess = `# FaraiOS reverse proxy (Plesk API cannot set additional directives on reseller accounts)
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\\.well-known/
RewriteRule ^(.*)$ ${ORIGIN}/$1 [P,L]
`;

async function uploadViaFtp() {
  const { login, password } = await getFtpCredentials();
  const client = new Client();
  client.ftp.verbose = true;
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
    console.log("FTP connected as", login);

    await client.cd("httpdocs");
    const listing = await client.list();
    console.log(
      "httpdocs listing:",
      listing.map((f) => f.name).join(", ")
    );

    const defaultIndex = listing.find((f) => f.name === "index.html");
    if (defaultIndex) {
      await client.rename("index.html", "index.html.plesk-default.bak");
      console.log("Renamed index.html -> index.html.plesk-default.bak");
    }

    await client.uploadFrom(tmp, ".htaccess");
    console.log("Uploaded .htaccess with proxy to", ORIGIN);

    // Remove mistaken upload in FTP home root if present
    try {
      await client.cd("..");
      const homeListing = await client.list();
      if (homeListing.some((f) => f.name === ".htaccess")) {
        await client.remove(".htaccess");
        console.log("Removed stray .htaccess from FTP home root");
      }
    } catch {
      /* ignore */
    }
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
  console.log("1. Setting website domain in Supabase...");
  const updated = await supabasePatch("websites", `id=eq.${WEBSITE_ID}`, { domain: DOMAIN });
  console.log("   Updated website:", updated?.[0]?.domain ?? DOMAIN);

  console.log("2. Uploading .htaccess reverse proxy via FTP...");
  await uploadViaFtp();

  console.log("3. Done. Wait ~30s then test https://www.teamedlick.co.za/");
}

main().catch((err) => {
  console.error("Fix failed:", err.message);
  process.exit(1);
});
