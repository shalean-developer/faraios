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

const testimonialsContent = {
  label: "Clients Love Us",
  heading: "Trusted By Homeowners",
  items: [
    {
      quote:
        "They transformed our outdated kitchen into a modern masterpiece. The team was professional, punctual, and truly cared about every detail.",
      name: "Anya Petrova",
      company: "GlobalTech",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      quote:
        "From start to finish, the renovation process was seamless. Our home feels brand new, and we couldn't be happier.",
      name: "Kenji Tanaka",
      company: "InnovCorp",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      quote:
        "Their attention to detail and commitment to quality really set them apart. Highly recommended for any home renovation.",
      name: "Isabelle Dubois",
      company: "Zenith Dynamics",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      quote:
        "Our living room makeover was done perfectly. Every step of the process was handled with professionalism and care.",
      name: "Ricardo Silva",
      company: "Apex Solutions",
      avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    },
    {
      quote:
        "We appreciated their transparency and dedication throughout the renovation. The outcome is beyond what we hoped for.",
      name: "Mei Chen",
      company: "Stellar Innovations",
      avatar: "https://randomuser.me/api/portraits/women/26.jpg",
    },
    {
      quote:
        "Exceptional craftsmanship and attention to detail. Our home looks amazing and feels more functional than ever.",
      name: "Ethan Blackwood",
      company: "Nova Enterprises",
      avatar: "https://randomuser.me/api/portraits/men/46.jpg",
    },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.testimonials&select=id,content`, {
    headers: h,
  })
).json();

const row = rows[0];
if (!row) {
  console.error("testimonials section not found");
  process.exit(1);
}

const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ content: { ...row.content, ...testimonialsContent } }),
});
console.log("testimonials", r.status);
