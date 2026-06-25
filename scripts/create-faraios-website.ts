import { config } from "dotenv";

import { createWebsiteForCompanyWithServiceRole } from "../lib/services/websites";

config({ path: ".env.local" });

const FARAIOS_COMPANY_ID = "cfb302f2-b6d8-4f5a-980b-4eecda38cb3d";

async function main() {
  const result = await createWebsiteForCompanyWithServiceRole(FARAIOS_COMPANY_ID, {
    businessName: "FaraiOS Cleaning Services",
    industry: "cleaning",
    template: "service-business",
    location: "Cape Town & Surrounding Areas",
    services: "",
    contactInfo: "Phone: 0825915525\nEmail: shalocleaner@gmail.com",
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }

  console.log(`\nPreview: http://localhost:3000/preview/${result.websiteId}`);
  console.log(`Admin edit: http://localhost:3000/admin/websites/${result.websiteId}/edit`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
