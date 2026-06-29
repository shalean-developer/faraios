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

const siteId = "742";
for (const val of ["none", "non-www", "www"]) {
  const inner = `<site><set><filter><id>${siteId}</id></filter><values><hosting><vrt_hst><property><name>seo-redirect</name><value>${val}</value></property></vrt_hst></hosting></values></set></site>`;
  const xml = await pleskRequest(inner);
  const err = xml.match(/<errtext>([^<]+)<\/errtext>/i);
  console.log(`seo-redirect=${val}:`, err ? err[1] : "ok");
}

const getXml = await pleskRequest(
  `<site><get><filter><id>${siteId}</id></filter><dataset><hosting/></dataset></get></site>`
);
const seo = getXml.match(/<name>seo-redirect<\/name>\s*<value>([^<]+)<\/value>/i);
console.log("read back seo-redirect:", seo?.[1] ?? "unknown");
