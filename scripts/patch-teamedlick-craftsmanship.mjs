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

const imgCarpenter =
  "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=900&q=80";
const imgKitchen =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80";
const imgLiving =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80";

const craftsmanshipContent = {
  label: "Homes Made Perfect",
  heading: "Craftsmanship That Stands the Test",
  body: "Expert Craftsmanship Guaranteed. Our skilled team brings years of experience and meticulous attention to every renovation project.",
  features: [
    "Modern designs that enhance daily living",
    "Durable materials ensure long-lasting quality.",
  ],
  phoneLabel: "Call us 24/7",
  image: imgCarpenter,
  imageSecondary: imgKitchen,
  imageTertiary: imgLiving,
  imageAlt: "Carpenter measuring wood for a renovation",
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.craftsmanship&select=id`, {
    headers: h,
  })
).json();

if (rows[0]) {
  const r = await fetch(`${base}website_content?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ content: craftsmanshipContent }),
  });
  console.log("craftsmanship updated", r.status);
} else {
  const r = await fetch(`${base}website_content`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      website_id: websiteId,
      section: "craftsmanship",
      content: craftsmanshipContent,
    }),
  });
  console.log("craftsmanship created", r.status);
}
