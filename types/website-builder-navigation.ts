export type WebsiteNavLinkType =
  | "home"
  | "anchor"
  | "page"
  | "url"
  | "booking"
  | "contact";

export type WebsiteNavItem = {
  id: string;
  label: string;
  linkType: WebsiteNavLinkType;
  /** Custom URL when linkType is url, or anchor id when linkType is anchor */
  href?: string;
  /** Service page slug when linkType is page */
  pageSlug?: string;
  openInNewTab?: boolean;
  children?: WebsiteNavItem[];
  visible: boolean;
  mobileVisible: boolean;
  desktopVisible: boolean;
};

export type WebsiteNavCta = {
  label: string;
  href: string;
  style?: "primary" | "outline";
};

export type WebsiteFooterColumn = {
  id: string;
  title: string;
  items: WebsiteNavItem[];
};

export type WebsiteHeaderVariant = "light" | "dark" | "overlay";

export type WebsiteSocialLinks = {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
  youtube?: string;
};

export type WebsiteNavigationSettings = {
  header: {
    enabled: boolean;
    sticky: boolean;
    showLogo: boolean;
    showBusinessName: boolean;
    showTagline: boolean;
    tagline?: string | null;
    showBookingButton: boolean;
    showSecondaryCta: boolean;
    secondaryCta?: WebsiteNavCta | null;
    variant?: WebsiteHeaderVariant;
    items: WebsiteNavItem[];
  };
  mobile: {
    inheritHeaderItems: boolean;
    showBookingButton: boolean;
    showSecondaryCta: boolean;
    items: WebsiteNavItem[];
  };
  footer: {
    enabled: boolean;
    layout: "simple" | "columns";
    businessName?: string;
    tagline?: string | null;
    showPoweredBy: boolean;
    columns: WebsiteFooterColumn[];
    socialLinks?: WebsiteSocialLinks;
  };
  topbar: {
    enabled: boolean;
    phone?: string | null;
    email?: string | null;
    hours?: string | null;
    location?: string | null;
    socialLinks?: WebsiteSocialLinks;
  };
};
