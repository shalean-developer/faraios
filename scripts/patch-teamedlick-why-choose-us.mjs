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

const imgMeasure =
  "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=900&q=80";
const imgWorker =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80";

const whyChooseUsContent = {
  label: "Quality You Trust",
  heading: "Why Our Experts Stand Out",
  body: "Why Hire Our Experts. Our team brings years of experience, skill, and creativity to every renovation project. We focus on quality, attention to detail, and delivering results that exceed expectations.",
  image: imgMeasure,
  imageAlt: "Measuring wood for a renovation project",
  imageSecondary: imgWorker,
  imageSecondaryAlt: "Team Edlick renovation expert",
  badgeText: "Built with lasting quality",
  benefits: [
    { title: "Transform Your Home Effortlessly", description: "" },
    { title: "Expert Craftsmanship You Can Trust", description: "" },
    { title: "Stress-Free Renovation Process", description: "" },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.whyChooseUs&select=id,content`, {
    headers: h,
  })
).json();

const row = rows[0];
if (!row) {
  console.error("whyChooseUs section not found");
  process.exit(1);
}

const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ content: { ...row.content, ...whyChooseUsContent } }),
});
console.log("whyChooseUs", r.status);
