import { config } from "dotenv";

import { removeHostingOrderByDomain } from "../lib/services/hosting-admin";

config({ path: ".env.local" });

async function main() {
  const result = await removeHostingOrderByDomain("farai.com");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
