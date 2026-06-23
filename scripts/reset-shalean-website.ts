import { config } from "dotenv";

import { resetWebsiteContentFromSeed } from "../lib/services/websites";

config({ path: ".env.local" });

const SHALEAN_WEBSITE_ID = "1b748835-d613-4805-9910-7f822d3f12e2";

async function main() {
  const result = await resetWebsiteContentFromSeed(SHALEAN_WEBSITE_ID, {
    businessName: "Shalean Cleaning Services",
    industry: "cleaning",
    template: "service-business",
    location: "Cape Town & Surrounding Areas",
    contactInfo: "Phone: 0825915525\nEmail: shalocleaner@gmail.com",
    services: "",
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }

  console.log(`\nPreview: http://localhost:3000/preview/${SHALEAN_WEBSITE_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
