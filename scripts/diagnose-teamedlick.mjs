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

const creds = {
  url: process.env.PLESK_API_URL,
  username: process.env.PLESK_API_USERNAME,
  secret: process.env.PLESK_API_SECRET,
  xmlEndpoint: `${process.env.PLESK_API_URL.replace(/\/$/, "")}/enterprise/control/agent.php`,
};

async function pleskRequest(inner) {
  const packet = `<?xml version="1.0" encoding="UTF-8"?><packet version="1.6.9.0">${inner}</packet>`;
  const res = await fetch(creds.xmlEndpoint, {
    method: "POST",
    headers: {
      HTTP_AUTH_LOGIN: creds.username,
      HTTP_AUTH_PASSWD: creds.secret,
      "Content-Type": "text/xml",
    },
    body: packet,
  });
  return res.text();
}

async function supabaseQuery(path) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  return res.json();
}

const syncXml = await pleskRequest("<webspace><get><filter/></get></webspace>");
const siteIdFromDb = "742";
const idMatch = syncXml.match(new RegExp(`<id>${siteIdFromDb}</id>[\\s\\S]*?<name>([^<]+)</name>`, "i"))
  ?? syncXml.match(new RegExp(`<name>teamedlick\\.co\\.za</name>[\\s\\S]*?<id>(\\d+)</id>`, "i"));
console.log("Plesk site from sync:", idMatch?.[0]?.slice(0, 120) ?? "NOT FOUND");

const services = await supabaseQuery("hosting_services?domain_name=ilike.*teamedlick*&select=id,domain_name,status,plesk_subscription_id,company_id");
console.log("Hosting services:", JSON.stringify(services, null, 2));

const companyId = services?.find((s) => s.status === "active")?.company_id;
let websites = [];
if (companyId) {
  websites = await supabaseQuery(`websites?client_id=eq.${companyId}&select=id,domain,status,subdomain`);
}
console.log("Websites for company:", JSON.stringify(websites, null, 2));

const logs = await supabaseQuery("hosting_provisioning_logs?service_id=eq.5fcdd141-61b8-4a9a-a662-a9990e856702&select=action,status,error_message&order=created_at.desc&limit=10");
console.log("Recent logs:", JSON.stringify(logs, null, 2));

const siteId = siteIdFromDb;
const nginx = `location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}`;
const attempts = [
  { name: "additional-nginx", value: nginx },
  {
    name: "additional-directives",
    value: "ProxyPreserveHost On\nProxyPass / http://127.0.0.1:3000/\nProxyPassReverse / http://127.0.0.1:3000/",
  },
  {
    name: "additional-settings",
    value: "ProxyPreserveHost On\nProxyPass / http://127.0.0.1:3000/\nProxyPassReverse / http://127.0.0.1:3000/",
  },
];

for (const attempt of attempts) {
  const escaped = attempt.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inner = `<site><set><filter><id>${siteId}</id></filter><values><hosting><vrt_hst><property><name>${attempt.name}</name><value>${escaped}</value></property></vrt_hst></hosting></values></set></site>`;
  const proxyXml = await pleskRequest(inner);
  const err = proxyXml.match(/<errtext>([^<]+)<\/errtext>/i);
  const status = proxyXml.match(/<status>([^<]+)<\/status>/gi)?.map((s) => s.replace(/<\/?status>/gi, "")).join(", ");
  console.log(`Proxy ${attempt.name}:`, status, err?.[1] ?? "ok");
}

// Read back hosting properties
const getXml = await pleskRequest(`<site><get><filter><id>${siteId}</id></filter><dataset><hosting/></dataset></get></site>`);
const props = [...getXml.matchAll(/<name>([^<]+)<\/name>\s*<value>([\s\S]*?)<\/value>/gi)].map((m) => ({
  name: m[1],
  valuePreview: m[2].slice(0, 80),
}));
console.log("Hosting properties:", JSON.stringify(props, null, 2));