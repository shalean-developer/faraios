import { catalogEntry } from "@/lib/website-builder/section-catalog";
import type { LandingPageContent } from "@/types/website-builder";
import type {
  HeroSectionProps,
  WebsitePageContentV2,
  WebsiteSection,
  WebsiteSectionType,
} from "@/types/website-builder-sections";

function sectionId(): string {
  return `sec_${Math.random().toString(36).slice(2, 11)}`;
}

export function defaultSectionProps(type: WebsiteSectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        headline: "Your headline here",
        subheadline: "Tell visitors what you do and why they should choose you.",
        alignment: "center",
        height: "default",
        overlayColor: "#000000",
        overlayOpacity: 0.35,
        animation: "none",
        primaryCta: { label: "Book Now", href: "{{booking_url}}", style: "primary" },
        secondaryCta: { label: "Contact Us", href: "#contact", style: "outline" },
        trustBadges: [],
        statistics: [],
        floatingBookingButton: false,
        whatsAppButton: { enabled: false },
      } satisfies HeroSectionProps;
    case "about":
      return { heading: "About us", body: "Share your story." };
    case "services":
      return { heading: "Our services", items: [] };
    case "why-choose-us":
      return { heading: "Why choose us", items: [] };
    case "contact":
      return { heading: "Contact us", phone: "{{phone}}", email: "{{email}}", location: "{{city}}" };
    case "booking-cta":
      return { heading: "Ready to book?", subheading: "Schedule your appointment online.", buttonLabel: "Book Now" };
    case "faq":
      return { heading: "FAQ", items: [] };
    case "testimonials":
      return { heading: "What customers say", items: [] };
    case "cta-banner":
      return { heading: "Get started today", body: "", buttonLabel: "Book Now", buttonHref: "{{booking_url}}" };
    case "gallery":
      return { heading: "Gallery", images: [] };
    case "team":
      return { heading: "Our team", items: [] };
    case "pricing":
      return { heading: "Pricing", items: [] };
    case "map":
      return { heading: "Find us", embedUrl: "", address: "{{city}}" };
    case "statistics":
      return { heading: "By the numbers", items: [] };
    case "logos":
      return { heading: "Trusted by", items: [] };
    case "process":
      return { heading: "How it works", items: [] };
    case "newsletter":
      return { heading: "Stay in touch", description: "", buttonLabel: "Subscribe", placeholder: "you@email.com" };
    case "blog-posts":
      return { heading: "Latest posts", limit: 3 };
    case "booking-form":
      return { heading: "Book online", subheading: "Choose a time that works for you." };
    case "footer":
      return { businessName: "{{business_name}}", tagline: "" };
    case "custom-html":
      return { html: "<!-- Custom HTML -->" };
    case "custom-component":
      return { componentKey: "", note: "Custom React component placeholder" };
    default:
      return { heading: catalogEntry(type).label };
  }
}

export function createSection(type: WebsiteSectionType): WebsiteSection {
  return {
    id: sectionId(),
    type,
    label: catalogEntry(type).label,
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: defaultSectionProps(type),
  };
}

export function sectionsFromLanding(landing: LandingPageContent): WebsiteSection[] {
  const sections: WebsiteSection[] = [];

  sections.push({
    id: sectionId(),
    type: "hero",
    label: "Hero",
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: {
      headline: landing.hero.headline,
      subheadline: landing.hero.subheadline,
      alignment: "center",
      height: "default",
      heroImageUrl: landing.hero.imageUrl ?? null,
      overlayColor: "#000000",
      overlayOpacity: 0.35,
      animation: "none",
      primaryCta: {
        label: landing.hero.ctaLabel || "Book Now",
        href: "{{booking_url}}",
        style: "primary",
      },
      trustBadges: [],
      statistics: [],
      floatingBookingButton: false,
      whatsAppButton: { enabled: false },
    },
  });

  sections.push({
    id: sectionId(),
    type: "about",
    label: "About",
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: { heading: landing.about.heading, body: landing.about.body },
  });

  if (landing.services.items.length > 0) {
    sections.push({
      id: sectionId(),
      type: "services",
      label: "Services",
      visible: true,
      mobileVisible: true,
      desktopVisible: true,
      props: { heading: landing.services.heading, items: landing.services.items },
    });
  }

  if (landing.whyChooseUs.items.length > 0) {
    sections.push({
      id: sectionId(),
      type: "why-choose-us",
      label: "Why Choose Us",
      visible: true,
      mobileVisible: true,
      desktopVisible: true,
      props: { heading: landing.whyChooseUs.heading, items: landing.whyChooseUs.items },
    });
  }

  sections.push({
    id: sectionId(),
    type: "contact",
    label: "Contact",
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: {
      heading: landing.contact.heading,
      phone: landing.contact.phone,
      email: landing.contact.email,
      location: landing.contact.location,
      hours: landing.contact.hours,
    },
  });

  sections.push({
    id: sectionId(),
    type: "booking-cta",
    label: "Booking CTA",
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: {
      heading: "Ready to book?",
      subheading: "Schedule online in minutes.",
      buttonLabel: landing.hero.ctaLabel || "Book Now",
    },
  });

  return sections;
}

export function syncLandingFromSections(
  sections: WebsiteSection[],
  existing: LandingPageContent
): LandingPageContent {
  const next = structuredClone(existing);
  const hero = sections.find((s) => s.type === "hero");
  const about = sections.find((s) => s.type === "about");
  const services = sections.find((s) => s.type === "services");
  const why = sections.find((s) => s.type === "why-choose-us");
  const contact = sections.find((s) => s.type === "contact");

  if (hero) {
    const p = hero.props as HeroSectionProps;
    next.hero.headline = p.headline;
    next.hero.subheadline = p.subheadline;
    next.hero.ctaLabel = p.primaryCta?.label ?? next.hero.ctaLabel;
    next.hero.imageUrl = p.heroImageUrl ?? next.hero.imageUrl;
  }
  if (about) {
    const p = about.props as { heading?: string; body?: string };
    if (p.heading) next.about.heading = p.heading;
    if (p.body) next.about.body = p.body;
  }
  if (services) {
    const p = services.props as { heading?: string; items?: LandingPageContent["services"]["items"] };
    if (p.heading) next.services.heading = p.heading;
    if (p.items) next.services.items = p.items;
  }
  if (why) {
    const p = why.props as { heading?: string; items?: string[] };
    if (p.heading) next.whyChooseUs.heading = p.heading;
    if (p.items) next.whyChooseUs.items = p.items;
  }
  if (contact) {
    const p = contact.props as {
      heading?: string;
      phone?: string | null;
      email?: string | null;
      location?: string | null;
      hours?: string | null;
    };
    if (p.heading) next.contact.heading = p.heading;
    if (p.phone !== undefined) next.contact.phone = p.phone;
    if (p.email !== undefined) next.contact.email = p.email;
    if (p.location !== undefined) next.contact.location = p.location;
    if (p.hours !== undefined) next.contact.hours = p.hours;
  }

  const footer = sections.find((s) => s.type === "footer");
  if (footer) {
    const p = footer.props as { businessName?: string; tagline?: string | null };
    if (p.businessName) next.footer.businessName = p.businessName;
    if (p.tagline !== undefined) next.footer.tagline = p.tagline;
  }

  return next;
}

export function getPageSections(
  content: WebsitePageContentV2 | LandingPageContent | null
): WebsiteSection[] {
  if (!content) return [];
  const v2 = content as WebsitePageContentV2;
  if (v2.schemaVersion === 2 && Array.isArray(v2.sections) && v2.sections.length > 0) {
    return v2.sections;
  }
  return sectionsFromLanding(content as LandingPageContent);
}

export function buildPageContentPayload(
  sections: WebsiteSection[],
  landing: LandingPageContent
): WebsitePageContentV2 {
  const synced = syncLandingFromSections(sections, landing);
  return {
    ...synced,
    schemaVersion: 2,
    sections,
  };
}
