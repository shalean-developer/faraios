import { config } from "dotenv";

import { clearFailedPlatformEmailLogs } from "../lib/platform/email-log";

config({ path: ".env.local" });

async function main() {
  const result = await clearFailedPlatformEmailLogs();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
