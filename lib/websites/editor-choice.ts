import {
  getBuilderWebsiteForCompany,
  getLegacyWebsiteRowForCompany,
} from "@/lib/website-builder/service";

export type WebsiteEditorSite = {
  id: string;
  name: string;
};

export type WebsiteEditorChoice = {
  /** Hosted site using the classic section-based CMS (`builder_mode: false`). */
  legacy: WebsiteEditorSite | null;
  /** Site using the visual website builder (`builder_mode: true`). */
  builder: WebsiteEditorSite | null;
};

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

/** Primary hosted site for classic editor links (legacy row, or builder row as fallback). */
export function primaryHostedWebsiteForClassicEditor(
  choice: WebsiteEditorChoice
): WebsiteEditorSite | null {
  return choice.legacy ?? choice.builder;
}
