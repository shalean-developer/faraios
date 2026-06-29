import "server-only";

import {
  getBuilderWebsiteForCompany,
  getLegacyWebsiteRowForCompany,
} from "@/lib/website-builder/service";

import type { WebsiteEditorChoice } from "@/lib/websites/editor-choice";

export async function getWebsiteEditorChoice(
  companyId: string
): Promise<WebsiteEditorChoice> {
  const [builder, legacyRow] = await Promise.all([
    getBuilderWebsiteForCompany(companyId),
    getLegacyWebsiteRowForCompany(companyId),
  ]);

  return {
    builder: builder
      ? { id: builder.id, name: builder.title?.trim() || "Website" }
      : null,
    legacy: legacyRow?.id
      ? {
          id: legacyRow.id as string,
          name:
            (typeof legacyRow.name === "string" && legacyRow.name.trim()) ||
            (typeof legacyRow.title === "string" && legacyRow.title.trim()) ||
            "Website",
        }
      : null,
  };
}
