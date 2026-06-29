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

const xmlEndpoint = `${process.env.PLESK_API_URL.replace(/\/$/, "")}/enterprise/control/agent.php`;

async function pleskRequest(inner) {
  const packet = `<?xml version="1.0" encoding="UTF-8"?><packet version="1.6.9.0">${inner}</packet>`;
  const res = await fetch(xmlEndpoint, {
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
const getXml = await pleskRequest(
  `<site><get><filter><id>${siteId}</id></filter><dataset><hosting/></dataset></get></site>`
);

for (const name of ["additional-nginx", "additional-settings", "additional-directives"]) {
  const m = getXml.match(new RegExp(`<name>${name}</name>\\s*<value>([\\s\\S]*?)</value>`, "i"));
  console.log(`\n=== ${name} ===`);
  console.log(m ? m[1] : "NOT SET");
}

// Also check web server type
const genXml = await pleskRequest(`<server><get/></server>`);
const platform = genXml.match(/<platform>([^<]+)<\/platform>/i)?.[1];
const version = genXml.match(/<version>([^<]+)<\/version>/i)?.[1];
console.log("\n=== Plesk server ===");
console.log({ platform, version });
