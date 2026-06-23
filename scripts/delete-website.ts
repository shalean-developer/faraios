import { config } from "dotenv";

import { deleteWebsiteById } from "../lib/services/websites";

config({ path: ".env.local" });

const websiteId = process.argv[2] ?? "1b748835-d613-4805-9910-7f822d3f12e2";

async function main() {
  const result = await deleteWebsiteById(websiteId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
