import { readFileSync } from "fs";
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

const xml = await pleskRequest(
  `<site><get><filter><id>742</id></filter><dataset><hosting/></dataset></get></site>`
);
const login = xml.match(/<name>ftp_login<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];
const password = xml.match(/<name>ftp_password<\/name>\s*<value>([^<]+)<\/value>/i)?.[1];

const client = new Client();
await client.access({
  host: "teamedlick.co.za",
  user: login,
  password,
  secure: true,
  secureOptions: { rejectUnauthorized: false },
});
await client.cd("httpdocs");
const listing = await client.list();
const names = listing.map((f) => `${f.name}${f.isDirectory ? "/" : ""} (${f.size ?? 0}b)`);
console.log("httpdocs files:", names.join("\n"));
const htaccess = listing.find((f) => f.name === ".htaccess");
if (htaccess) {
  const dest = resolve(scriptDir, ".htaccess.download");
  await client.downloadTo(dest, ".htaccess");
  console.log("\n.htaccess content:\n", readFileSync(dest, "utf8"));
}
client.close();
