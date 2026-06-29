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

const workProcessContent = {
  label: "Our work process",
  heading: "Step-by-Step Home Transformations",
  steps: [
    {
      title: "Every detail reflects our expertise",
      description:
        "Every detail reflects our expertise. From the initial planning to the final touches we focus on quality craftsmanship.",
    },
    {
      title: "We build homes with care",
      description:
        "We build homes with care. Every project is handled with attention, precision, and dedication to quality.",
    },
    {
      title: "Crafting spaces that inspire joy",
      description:
        "Crafting spaces that inspire joy. We design and build every area with creativity, care, and attention.",
    },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.workProcess&select=id`, {
    headers: h,
  })
).json();

if (rows[0]) {
  const r = await fetch(`${base}website_content?id=eq.${rows[0].id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ content: workProcessContent }),
  });
  console.log("workProcess updated", r.status);
} else {
  const r = await fetch(`${base}website_content`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      website_id: websiteId,
      section: "workProcess",
      content: workProcessContent,
    }),
  });
  console.log("workProcess created", r.status);
}
