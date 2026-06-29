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

const transformShowcaseContent = {
  label: "Dreams Into Reality",
  heading: "Turning Ordinary Houses into Beautiful Cozy Homes",
  body: "After we deliver, enjoy a perfect home. Once our renovation work is complete, every corner of your space reflects quality, care, and attention to detail.",
  features: ["Green Home Upgrade", "Smart Home Renovation"],
  slides: [
    {
      label: "Home Planning",
      beforeImage:
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
      afterImage:
        "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
      thumbnailImage:
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=200&q=80",
    },
    {
      label: "Dream Home",
      beforeImage:
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80",
      afterImage:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
      thumbnailImage:
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80",
    },
    {
      label: "Home Vision",
      beforeImage:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
      afterImage:
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
      thumbnailImage:
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=200&q=80",
    },
    {
      label: "Space Design",
      beforeImage:
        "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=900&q=80",
      afterImage:
        "https://images.unsplash.com/photo-1600573472592-401b389b0cc3?auto=format&fit=crop&w=900&q=80",
      thumbnailImage:
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=200&q=80",
    },
  ],
};

const rows = await (
  await fetch(
    `${base}website_content?website_id=eq.${websiteId}&section=eq.transformShowcase&select=id`,
    { headers: h }
  )
).json();

if (rows[0]) {
  const r = await fetch(`${base}website_content?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ content: transformShowcaseContent }),
  });
  console.log("transformShowcase updated", r.status);
} else {
  const r = await fetch(`${base}website_content`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      website_id: websiteId,
      section: "transformShowcase",
      content: transformShowcaseContent,
    }),
  });
  console.log("transformShowcase created", r.status);
}
