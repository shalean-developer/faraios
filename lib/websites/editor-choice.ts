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

/** Primary hosted site for classic editor links (legacy row, or builder row as fallback). */
export function primaryHostedWebsiteForClassicEditor(
  choice: WebsiteEditorChoice
): WebsiteEditorSite | null {
  return choice.legacy ?? choice.builder;
}
