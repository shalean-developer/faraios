import type { ParsedSiteContent } from "@/templates/service-business/content";
import {
  getWebsiteVariantTheme,
  resolveWebsiteTemplateVariant,
  type WebsiteTemplateVariant,
} from "@/lib/website-templates/variants";

export type CompanyBranding = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
};

export function applyCompanyBrandingToSite<T extends ParsedSiteContent>(
  site: T,
  branding?: CompanyBranding | null
): T {
  if (!branding) return site;

  const logoUrl = branding.logoUrl?.trim();
  const primaryColor = branding.primaryColor?.trim();
  const accentColor = branding.accentColor?.trim();

  if (!logoUrl && !primaryColor && !accentColor) return site;

  return {
    ...site,
    theme: {
      primary: primaryColor || site.theme.primary,
      accent: accentColor || site.theme.accent,
    },
    topbar: {
      ...site.topbar,
      logo: logoUrl || site.topbar.logo,
    },
  };
}

export function applyWebsiteVariantToSite(
  site: ParsedSiteContent,
  variantInput?: string | null
): ParsedSiteContent & { variant: WebsiteTemplateVariant; variantTheme: ReturnType<typeof getWebsiteVariantTheme> } {
  const variant = resolveWebsiteTemplateVariant(variantInput);
  const variantTheme = getWebsiteVariantTheme(variant);

  const usesDefaultPrimary =
    site.theme.primary === "#002147" || site.theme.primary === "#1e293b";
  const usesDefaultAccent =
    site.theme.accent === "#2563eb" || site.theme.accent === "#6366f1";

  return {
    ...site,
    variant,
    variantTheme,
    theme: {
      primary: usesDefaultPrimary ? variantTheme.primary : site.theme.primary,
      accent: usesDefaultAccent ? variantTheme.accent : site.theme.accent,
    },
    topbar: {
      ...site.topbar,
      tagline:
        site.topbar.tagline === "CLEAN SPACES. BETTER LIVES." ||
        site.topbar.tagline === "TRUSTED LOCAL SERVICE."
          ? variantTheme.tagline
          : site.topbar.tagline,
    },
    hero: {
      ...site.hero,
      badge:
        site.hero.badge.startsWith("Serving") || !site.hero.badge
          ? variantTheme.badgeLabel
          : site.hero.badge,
    },
    trustBand:
      site.trustBand.length >= 4 &&
      site.trustBand[0]?.title === "Background-checked professionals"
        ? variantTheme.trustBand
        : site.trustBand,
  };
}
