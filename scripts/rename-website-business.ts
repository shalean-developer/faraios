import { config } from "dotenv";

import { renameWebsiteBusinessName } from "../lib/services/websites";

config({ path: ".env.local" });

const websiteId = process.argv[2] ?? "ca30f95e-0910-4aa3-b0f7-9d9981dfed11";
const fromName = process.argv[3] ?? "Luxury Mobile Spa";
const toName = process.argv[4] ?? "Rejuvenation Mobile Massage";

async function main() {
  const result = await renameWebsiteBusinessName(websiteId, fromName, toName);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
