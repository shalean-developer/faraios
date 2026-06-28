import { config } from "dotenv";

import { renameWebsiteTenantSubdomain } from "../lib/services/vercel-tenant-domain";

config({ path: ".env.local" });

const websiteId = process.argv[2] ?? "ca30f95e-0910-4aa3-b0f7-9d9981dfed11";
const newSubdomain = process.argv[3] ?? "rejuvenation-mobile-massage";

async function main() {
  const result = await renameWebsiteTenantSubdomain(websiteId, newSubdomain);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
