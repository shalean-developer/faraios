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

const img1 =
  "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=900&q=80";
const img2 =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80";
const img3 =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80";

const bodyText =
  "We're a team of experienced professionals who care deeply about the homes we work on and the people who live in them. From planning to final delivery, we focus on quality craftsmanship.";

const aboutContent = {
  heading: "The Professionals Behind Renovations",
  body: bodyText,
  image: img2,
  imageAlt: "Team Edlick professionals at work",
  imageSecondary: img1,
  imageTertiary: img3,
  stat1Value: "250+",
  stat1Label: "Projects Completed",
  stat2Value: "10+",
  stat2Label: "Years of Experience",
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&select=id,section,content`, {
    headers: h,
  })
).json();

for (const row of rows) {
  let content = row.content;
  if (row.section === "about") content = { ...content, ...aboutContent };
  if (row.section === "whyChooseUs") content = { ...content, body: bodyText, image: img2 };
  if (row.section === "socialProof") content = { ...content, jobsCompleted: "250+" };
  const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ content }),
  });
  console.log(row.section, r.status);
}
