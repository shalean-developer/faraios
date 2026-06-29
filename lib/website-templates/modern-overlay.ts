/** Construction / Team Edlick style homepage layout (modern overlay hero). */
export function isModernOverlayTemplate(template?: string | null): boolean {
  const key = (template ?? "").trim().toLowerCase();
  return key === "construction" || key === "team-edlick";
}

const MODERN_OVERLAY_CONTENT_SECTIONS = new Set([
  "transformShowcase",
  "craftsmanship",
  "homeBlog",
  "testimonials",
  "workProcess",
  "featureBanner",
]);

export function hasModernOverlayWebsiteContent(
  contentRows?: { section: string }[] | null
): boolean {
  if (!contentRows?.length) return false;
  return contentRows.some((row) => MODERN_OVERLAY_CONTENT_SECTIONS.has(row.section));
}

export function isModernOverlayWebsite(
  template?: string | null,
  contentRows?: { section: string }[] | null
): boolean {
  return isModernOverlayTemplate(template) || hasModernOverlayWebsiteContent(contentRows);
}

export {
  defaultLogoWidthForShape,
  logoShapeUsesCustomWidth,
  LOGO_SHAPE_OPTIONS,
  resolveLogoDisplay,
  resolveLogoShape,
  resolveLogoSizePx,
  resolveLogoWidthPx,
  type LogoDisplay,
  type LogoShape,
} from "@/lib/website-templates/logo-display";
