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

const homeBlogContent = {
  label: "Expert Insights",
  heading: "Smart Home Upgrade Blog",
  body: "Welcome to our Home Upgrade Blog, where we share practical tips, expert advice, and renovation inspiration.",
  ctaLabel: "Explore Blog",
  ctaHref: "/blog",
  callCtaPrefix: "Need Help? Call Now :",
  posts: [
    {
      category: "Maintenance",
      title: "Renovation Insights: Tools to Transform Your House",
      excerpt: "Discover the latest tips, tools, and techniques.",
      image:
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    },
    {
      category: "Furniture",
      title: "Modern Kitchen Ideas for Everyday Living",
      excerpt: "Explore layouts, finishes, and smart upgrades for your home.",
      image:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.homeBlog&select=id`, {
    headers: h,
  })
).json();

if (rows[0]) {
  const r = await fetch(`${base}website_content?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ content: homeBlogContent }),
  });
  console.log("homeBlog updated", r.status);
} else {
  const r = await fetch(`${base}website_content`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      website_id: websiteId,
      section: "homeBlog",
      content: homeBlogContent,
    }),
  });
  console.log("homeBlog created", r.status);
}
