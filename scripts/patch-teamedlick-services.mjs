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

const imgDrill =
  "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=1200&q=80";
const imgPaint =
  "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=80";
const imgBath =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80";
const imgHome =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80";

const servicesContent = {
  heading: "Spaces That Feel Right",
  subtitle: "Professional construction and painting with transparent quotes.",
  items: [
    {
      title: "Kitchen Remodeling & Upgrades",
      description: "Custom kitchen renovations tailored to your home.",
      priceFrom: "Quote",
      image: imgDrill,
      imageAlt: "Kitchen remodeling",
    },
    {
      title: "Bathroom Renovation Services",
      description: "Complete bathroom upgrades and modern finishes.",
      priceFrom: "Quote",
      image: imgBath,
      imageAlt: "Bathroom renovation",
    },
    {
      title: "Full Home Renovation Projects",
      description: "End-to-end home renovation with clear timelines.",
      priceFrom: "Quote",
      image: imgHome,
      imageAlt: "Home renovation",
    },
    {
      title: "Interior & Exterior Painting",
      description: "Quality painting for lasting curb appeal.",
      priceFrom: "Quote",
      image: imgPaint,
      imageAlt: "Painting services",
    },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.services&select=id,content`, {
    headers: h,
  })
).json();

const row = rows[0];
if (!row) {
  console.error("services section not found");
  process.exit(1);
}

const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ content: { ...row.content, ...servicesContent } }),
});
console.log("services", r.status, "items:", servicesContent.items.length);
