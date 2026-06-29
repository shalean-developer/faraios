import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve("c:/Users/info/faraios/faraios/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const h = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};
const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const websiteId = "a7094dce-e509-4c22-965a-95a152a24ca2";

const footerContent = {
  description: "Modern Home Upgrades Made Easy Today",
  newsletterHeading: "Stay Updated",
  newsletterBody:
    "Hey there! Join our newsletter for renovation tips, project ideas, and exclusive offers.",
  copyrightName: "Team Edlick",
  companyLinks: ["About", "Service", "Service Details", "Reviews"],
  resourceLinks: ["Blogs", "Projects", "Project details", "Privacy Policy"],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.footer&select=id,content`, {
    headers: h,
  })
).json();

const row = rows[0];
if (!row) {
  console.error("footer section not found");
  process.exit(1);
}

const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ content: { ...row.content, ...footerContent } }),
});
console.log("footer", r.status);
