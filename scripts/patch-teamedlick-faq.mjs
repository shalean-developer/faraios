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

const faqContent = {
  label: "FAQ",
  heading: "What to Know Before You Start",
  body: "Quick answers about timelines, disruption, and what to expect before your renovation begins.",
  items: [
    {
      question: "How long does a home renovation take?",
      answer:
        "A home renovation timeline depends on the size and complexity of the project. Small updates may take 2–4 weeks, while larger or full-home renovations can take 6–12 weeks or more. After reviewing your project details, we provide a clear schedule before work begins.",
    },
    {
      question: "Is the renovation process disruptive?",
      answer:
        "We work to minimize disruption by planning each phase carefully, protecting your space, and keeping you informed throughout the project. Our team maintains a clean worksite and coordinates access so daily life is affected as little as possible.",
    },
    {
      question: "Do you provide a fixed project timeline?",
      answer:
        "Yes. Once we assess your project, we provide a detailed timeline with milestones and completion dates. If anything changes, we communicate updates promptly so you always know what to expect.",
    },
    {
      question: "Are materials included in the renovation cost?",
      answer:
        "Material costs are included in our quotes whenever possible. We specify what is covered upfront and recommend quality materials that fit your budget and design goals.",
    },
    {
      question: "Can I stay in my home during renovation?",
      answer:
        "For many projects, yes — especially kitchen, bathroom, or partial-home renovations. For major full-home projects, we discuss the best approach during planning to keep your family safe and comfortable.",
    },
  ],
};

const rows = await (
  await fetch(`${base}website_content?website_id=eq.${websiteId}&section=eq.faq&select=id,content`, {
    headers: h,
  })
).json();

const row = rows[0];
if (!row) {
  console.error("faq section not found");
  process.exit(1);
}

const r = await fetch(`${base}website_content?id=eq.${row.id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ content: { ...row.content, ...faqContent } }),
});
console.log("faq", r.status);
