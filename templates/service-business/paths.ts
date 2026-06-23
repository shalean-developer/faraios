export type TemplatePage = "home" | "services" | "about" | "reviews" | "contact";

export type TemplatePaths = {
  home: string;
  services: string;
  about: string;
  reviews: string;
  contact: string;
};

export function buildTemplatePaths(previewWebsiteId?: string | null): TemplatePaths {
  const prefix = previewWebsiteId ? `/preview/${previewWebsiteId}` : "";
  return {
    home: prefix || "/",
    services: `${prefix}/services`,
    about: `${prefix}/about`,
    reviews: `${prefix}/reviews`,
    contact: `${prefix}/contact`,
  };
}

/** Map legacy hash links from stored content to real routes. */
export function resolveTemplateHref(
  href: string | undefined,
  paths: TemplatePaths,
  fallback: keyof TemplatePaths = "contact"
): string {
  const value = (href ?? "").trim();
  if (!value || value === "#") return paths[fallback];

  const hashMap: Record<string, keyof TemplatePaths> = {
    "#services": "services",
    "#why-us": "about",
    "#about": "about",
    "#reviews": "reviews",
    "#contact": "contact",
    "#": "home",
  };

  if (hashMap[value]) return paths[hashMap[value]];

  if (value.startsWith("#")) return paths[fallback];

  return value;
}
