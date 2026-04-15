import { APP_FEATURES } from "@/lib/constants/features";
import type { Feature } from "@/types/database";

/** Features are app-defined constants (your schema has no `features` table). */
export async function listFeatures(): Promise<Feature[]> {
  return [...APP_FEATURES];
}
