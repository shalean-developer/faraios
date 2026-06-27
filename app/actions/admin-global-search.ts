"use server";

import { searchAdminGlobal } from "@/lib/services/admin-global-search";
import type { AdminGlobalSearchResponse } from "@/types/admin-global-search";

export async function searchAdminGlobalAction(
  query: string
): Promise<AdminGlobalSearchResponse> {
  return searchAdminGlobal(query);
}
