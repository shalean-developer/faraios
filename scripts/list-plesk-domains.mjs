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

const endpoint = `${process.env.PLESK_API_URL.replace(/\/$/, "")}/enterprise/control/agent.php`;
const packet = `<?xml version="1.0" encoding="UTF-8"?><packet version="1.6.9.0"><webspace><get><filter/></get></webspace></packet>`;
const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    HTTP_AUTH_LOGIN: process.env.PLESK_API_USERNAME,
    HTTP_AUTH_PASSWD: process.env.PLESK_API_SECRET,
    "Content-Type": "text/xml",
  },
  body: packet,
});
const xml = await res.text();
const domains = [...xml.matchAll(/<name>([^<]+)<\/name>/gi)].map((m) => m[1]);
console.log("Plesk domains:", domains.filter((d) => !d.includes("@")).join(", "));
