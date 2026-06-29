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
const siteId = "742";
const domain = "teamedlick.co.za";

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

const apache = escapeXml([
  "ProxyPreserveHost On",
  "ProxyPass / http://127.0.0.1:3000/",
  "ProxyPassReverse / http://127.0.0.1:3000/",
].join("\n"));

const attempts = [
  {
    label: "webspace.set additional-settings",
    inner: `<webspace><set><filter><id>${siteId}</id></filter><values><hosting><vrt_hst><property><name>additional-settings</name><value>${apache}</value></property></vrt_hst></hosting></values></set></webspace>`,
  },
  {
    label: "site.set hosting property additional",
    inner: `<site><set><filter><name>${domain}</name></filter><values><hosting><property><name>additional-settings</name><value>${apache}</value></property></hosting></values></set></site>`,
  },
  {
    label: "site.set vrt_hst property www-root check",
    inner: `<site><get><filter><id>${siteId}</id></filter><dataset><hosting><vrt_hst/></hosting></dataset></get></site>`,
  },
];

for (const attempt of attempts) {
  console.log("\n===", attempt.label, "===");
  const xml = await pleskRequest(attempt.inner);
  console.log(xml.slice(0, 1500));
}

// Try site prefs / hosting prefs endpoints
const prefsXml = await pleskRequest(
  `<site><get><filter><id>${siteId}</id></filter><dataset><prefs/></dataset></get></site>`
);
console.log("\n=== site prefs (first 800) ===");
console.log(prefsXml.slice(0, 800));
