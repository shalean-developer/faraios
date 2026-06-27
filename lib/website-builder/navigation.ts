import { publicBookPath } from "@/lib/paths/company";
import type {
  BuilderWebsite,
  LandingPageContent,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type {
  WebsiteNavItem,
  WebsiteNavLinkType,
  WebsiteNavigationSettings,
} from "@/types/website-builder-navigation";

export const NAVIGATION_SETTINGS_KEY = "navigationSettings";

export function createNavItem(
  partial: Partial<WebsiteNavItem> & Pick<WebsiteNavItem, "label" | "linkType">
): WebsiteNavItem {
  return {
    id: partial.id ?? crypto.randomUUID(),
    label: partial.label,
    linkType: partial.linkType,
    href: partial.href,
    pageSlug: partial.pageSlug,
    openInNewTab: partial.openInNewTab ?? false,
    children: partial.children,
    visible: partial.visible ?? true,
    mobileVisible: partial.mobileVisible ?? true,
    desktopVisible: partial.desktopVisible ?? true,
  };
}

export function defaultNavigationItems(
  companySlug: string,
  servicePages: WebsiteServicePageRecord[]
): WebsiteNavItem[] {
  const items: WebsiteNavItem[] = [
    createNavItem({ label: "Home", linkType: "home" }),
    createNavItem({ label: "About", linkType: "anchor", href: "about" }),
    createNavItem({ label: "Services", linkType: "anchor", href: "services" }),
    createNavItem({ label: "Contact", linkType: "contact" }),
  ];

  const publishedServices = servicePages.filter((p) => p.status === "published");
  if (publishedServices.length > 0) {
    const servicesItem = items.find((item) => item.linkType === "anchor" && item.href === "services");
    if (servicesItem) {
      servicesItem.children = publishedServices.map((page) =>
        createNavItem({
          label: page.title,
          linkType: "page",
          pageSlug: page.slug,
        })
      );
    }
  }

  return items;
}

export function defaultNavigationSettings(input: {
  companySlug: string;
  companyName: string;
  landing?: LandingPageContent | null;
  servicePages?: WebsiteServicePageRecord[];
}): WebsiteNavigationSettings {
  const { companySlug, companyName, landing, servicePages = [] } = input;
  const headerItems = defaultNavigationItems(companySlug, servicePages);

  return {
    header: {
      enabled: true,
      sticky: true,
      showLogo: true,
      showBusinessName: true,
      showTagline: false,
      tagline: landing?.footer.tagline ?? null,
      showBookingButton: true,
      showSecondaryCta: false,
      secondaryCta: null,
      items: headerItems,
    },
    mobile: {
      inheritHeaderItems: true,
      showBookingButton: true,
      showSecondaryCta: false,
      items: [],
    },
    footer: {
      enabled: true,
      layout: "simple",
      businessName: landing?.footer.businessName ?? companyName,
      tagline: landing?.footer.tagline ?? null,
      showPoweredBy: true,
      columns: [
        {
          id: crypto.randomUUID(),
          title: "Quick links",
          items: headerItems.map((item) => ({ ...item, children: undefined })),
        },
      ],
      socialLinks: {},
    },
    topbar: {
      enabled: false,
      phone: landing?.contact.phone ?? null,
      email: landing?.contact.email ?? null,
      hours: landing?.contact.hours ?? null,
      location: landing?.contact.location ?? null,
    },
  };
}

function isNavItem(value: unknown): value is WebsiteNavItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.label === "string" && typeof item.linkType === "string";
}

function parseNavItems(raw: unknown): WebsiteNavItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.filter(isNavItem);
  return items.length > 0 ? items : null;
}

export function parseNavigationSettings(raw: unknown): WebsiteNavigationSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const header = data.header as Record<string, unknown> | undefined;
  const mobile = data.mobile as Record<string, unknown> | undefined;
  const footer = data.footer as Record<string, unknown> | undefined;
  const topbar = data.topbar as Record<string, unknown> | undefined;

  const headerItems = parseNavItems(header?.items);
  if (!headerItems) return null;

  return {
    header: {
      enabled: header?.enabled !== false,
      sticky: header?.sticky !== false,
      showLogo: header?.showLogo !== false,
      showBusinessName: header?.showBusinessName !== false,
      showTagline: Boolean(header?.showTagline),
      tagline: typeof header?.tagline === "string" ? header.tagline : null,
      showBookingButton: header?.showBookingButton !== false,
      showSecondaryCta: Boolean(header?.showSecondaryCta),
      secondaryCta:
        header?.secondaryCta && typeof header.secondaryCta === "object"
          ? (header.secondaryCta as WebsiteNavigationSettings["header"]["secondaryCta"])
          : null,
      items: headerItems,
    },
    mobile: {
      inheritHeaderItems: mobile?.inheritHeaderItems !== false,
      showBookingButton: mobile?.showBookingButton !== false,
      showSecondaryCta: Boolean(mobile?.showSecondaryCta),
      items: parseNavItems(mobile?.items) ?? [],
    },
    footer: {
      enabled: footer?.enabled !== false,
      layout: footer?.layout === "columns" ? "columns" : "simple",
      businessName: typeof footer?.businessName === "string" ? footer.businessName : undefined,
      tagline: typeof footer?.tagline === "string" ? footer.tagline : null,
      showPoweredBy: footer?.showPoweredBy !== false,
      columns: Array.isArray(footer?.columns)
        ? (footer.columns as WebsiteNavigationSettings["footer"]["columns"])
        : [],
      socialLinks:
        footer?.socialLinks && typeof footer.socialLinks === "object"
          ? (footer.socialLinks as WebsiteNavigationSettings["footer"]["socialLinks"])
          : {},
    },
    topbar: {
      enabled: Boolean(topbar?.enabled),
      phone: typeof topbar?.phone === "string" ? topbar.phone : null,
      email: typeof topbar?.email === "string" ? topbar.email : null,
      hours: typeof topbar?.hours === "string" ? topbar.hours : null,
      location: typeof topbar?.location === "string" ? topbar.location : null,
    },
  };
}

export function getNavigationSettings(input: {
  website: BuilderWebsite;
  landing?: LandingPageContent | null;
  servicePages?: WebsiteServicePageRecord[];
  companySlug: string;
  companyName: string;
}): WebsiteNavigationSettings {
  const stored = parseNavigationSettings(input.website.theme_settings[NAVIGATION_SETTINGS_KEY]);
  if (stored) return stored;

  return defaultNavigationSettings({
    companySlug: input.companySlug,
    companyName: input.companyName,
    landing: input.landing,
    servicePages: input.servicePages,
  });
}

export type NavResolveContext = {
  companySlug: string;
  companyId: string;
};

export function resolveNavItemHref(item: WebsiteNavItem, ctx: NavResolveContext): string {
  switch (item.linkType as WebsiteNavLinkType) {
    case "home":
      return `/site/${ctx.companySlug}`;
    case "anchor":
      return `#${(item.href ?? "top").replace(/^#/, "")}`;
    case "page":
      return item.pageSlug
        ? `/site/${ctx.companySlug}/services/${item.pageSlug}`
        : `/site/${ctx.companySlug}`;
    case "url":
      return item.href ?? "#";
    case "booking":
      return publicBookPath(ctx.companyId);
    case "contact":
      return "#contact";
    default:
      return "#";
  }
}

export function visibleNavItems(
  items: WebsiteNavItem[],
  viewport: "desktop" | "mobile"
): WebsiteNavItem[] {
  return items
    .filter((item) => {
      if (!item.visible) return false;
      if (viewport === "mobile" && !item.mobileVisible) return false;
      if (viewport === "desktop" && !item.desktopVisible) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children ? visibleNavItems(item.children, viewport) : undefined,
    }));
}

export function mobileNavItems(settings: WebsiteNavigationSettings): WebsiteNavItem[] {
  if (settings.mobile.inheritHeaderItems) {
    return settings.header.items;
  }
  return settings.mobile.items.length > 0 ? settings.mobile.items : settings.header.items;
}

export function sectionAnchorId(sectionType: string): string | undefined {
  const anchors: Record<string, string> = {
    hero: "top",
    about: "about",
    services: "services",
    contact: "contact",
    "why-choose-us": "why-choose-us",
    pricing: "pricing",
    faq: "faq",
    testimonials: "testimonials",
  };
  return anchors[sectionType];
}
