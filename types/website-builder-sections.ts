import type { LandingPageContent } from "@/types/website-builder";

/** Section types available in the page builder catalog. */
export type WebsiteSectionType =
  | "hero"
  | "about"
  | "services"
  | "pricing"
  | "gallery"
  | "team"
  | "testimonials"
  | "faq"
  | "contact"
  | "booking-form"
  | "booking-cta"
  | "map"
  | "statistics"
  | "logos"
  | "process"
  | "cta-banner"
  | "blog-posts"
  | "newsletter"
  | "custom-html"
  | "custom-component"
  | "why-choose-us"
  | "footer";

export type FooterSectionProps = {
  businessName: string;
  tagline?: string | null;
};

export type SectionVisibility = {
  visible: boolean;
  mobileVisible: boolean;
  desktopVisible: boolean;
};

export type HeroCta = {
  label: string;
  href: string;
  style?: "primary" | "secondary" | "outline";
};

export type HeroSectionProps = {
  headline: string;
  subheadline: string;
  alignment?: "left" | "center" | "right";
  height?: "compact" | "default" | "tall" | "fullscreen";
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayColor?: string;
  overlayOpacity?: number;
  heroImageUrl?: string | null;
  animation?: "none" | "fade" | "slide-up";
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  trustBadges?: string[];
  reviewsBadge?: { rating: number; count: number; label?: string } | null;
  statistics?: { label: string; value: string }[];
  floatingBookingButton?: boolean;
  whatsAppButton?: { enabled: boolean; phone?: string; message?: string };
};

export type GenericSectionProps = Record<string, unknown>;

export type WebsiteSection = {
  id: string;
  type: WebsiteSectionType;
  label?: string;
  visible: boolean;
  mobileVisible: boolean;
  desktopVisible: boolean;
  props: HeroSectionProps | GenericSectionProps;
};

export type WebsiteThemeSettings = {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  buttonStyle?: "solid" | "outline" | "soft";
  borderRadius?: "none" | "sm" | "md" | "lg" | "full";
  shadowStyle?: "none" | "sm" | "md" | "lg";
  containerWidth?: "narrow" | "default" | "wide" | "full";
  sectionSpacing?: "compact" | "default" | "relaxed";
  cardStyle?: "flat" | "bordered" | "elevated";
  logoUrl?: string | null;
  faviconUrl?: string | null;
  bookingButtonLabel?: string;
};

export type WebsitePageContentV2 = LandingPageContent & {
  schemaVersion?: 1 | 2;
  sections?: WebsiteSection[];
};

export type BuilderViewport = "desktop" | "tablet" | "mobile";
