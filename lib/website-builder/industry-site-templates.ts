import { industryImagePreset } from "@/lib/data/industry-stock-images";
import { loadIndustryModule } from "@/lib/industry-modules/loader";
import {
  V8_INDUSTRY_TEMPLATE_KEYS,
  type V8IndustryTemplateKey,
} from "@/lib/industry-modules/registry";
import { getWebsiteVariantTheme, resolveWebsiteTemplateVariant } from "@/lib/website-templates/variants";
import {
  buildPageContentPayload,
  sectionsFromLanding,
  createSection,
} from "@/lib/website-builder/page-sections";
import type { CompanyWithIndustry } from "@/types/database";
import type { BuilderWebsite, LandingPageContent } from "@/types/website-builder";
import type { HeroSectionProps, WebsitePageContentV2, WebsiteSection } from "@/types/website-builder-sections";

export type WebsiteBuilderIndustryTemplate = {
  industryKey: V8IndustryTemplateKey;
  name: string;
  description: string;
  icon: string;
  primaryColor: string;
  accentColor: string;
  tagline: string;
  previewImage: string;
  previewImageAlt: string;
  whyChooseUs: string[];
  testimonials: string[];
  aboutBody: string;
  processSteps: { title: string; description: string }[];
};

type IndustryCopy = {
  whyChooseUs: string[];
  testimonials: string[];
  aboutBody: string;
  processSteps: { title: string; description: string }[];
  primaryColor?: string;
  accentColor?: string;
  tagline?: string;
};

const INDUSTRY_COPY: Record<V8IndustryTemplateKey, IndustryCopy> = {
  cleaning: {
    tagline: "CLEAN SPACES. BETTER LIVES.",
    whyChooseUs: [
      "Vetted, background-checked cleaners",
      "Eco-friendly products safe for families and pets",
      "Satisfaction guaranteed on every visit",
      "Flexible scheduling with easy online booking",
    ],
    testimonials: [
      "Excellent service and very professional team. My home has never been this clean!",
      "Great communication from first contact to completion. Highly recommend.",
    ],
    aboutBody:
      "We are a locally owned cleaning company serving homes and businesses across {{location}}. Our team arrives on time, brings professional supplies, and leaves your space spotless.",
    processSteps: [
      { title: "Book online", description: "Choose your service and preferred time slot." },
      { title: "We confirm", description: "We confirm details and your arrival window." },
      { title: "Professional clean", description: "Our vetted team completes the job to your standards." },
      { title: "You review", description: "Share feedback — your satisfaction is our priority." },
    ],
  },
  beauty: {
    tagline: "RELAX. REJUVENATE. RENEW.",
    whyChooseUs: [
      "Licensed beauty and spa therapists",
      "Premium products and hygienic treatment rooms",
      "Calm, welcoming atmosphere",
      "Easy online appointment booking",
    ],
    testimonials: [
      "Absolutely luxurious experience — left feeling completely refreshed.",
      "Professional staff and beautiful atmosphere. My new favourite spa.",
    ],
    aboutBody:
      "We create a relaxing escape with professional beauty and spa services tailored to your skin, body, and schedule — proudly serving clients across {{location}}.",
    processSteps: [
      { title: "Book your treatment", description: "Choose a service and time that suits you." },
      { title: "Arrive & unwind", description: "Settle in with our welcoming team." },
      { title: "Expert treatment", description: "Enjoy skilled care with premium products." },
      { title: "Leave refreshed", description: "Walk out feeling renewed and confident." },
    ],
  },
  repairs: {
    primaryColor: "#92400e",
    accentColor: "#d97706",
    tagline: "FIXED RIGHT. FIRST TIME.",
    whyChooseUs: [
      "Skilled repair technicians for home and office",
      "Upfront quotes before work begins",
      "Same-day emergency call-outs available",
      "Quality parts and workmanship guaranteed",
    ],
    testimonials: [
      "Quick response and quality workmanship. Fixed the issue on the first visit.",
      "Honest pricing and a professional team. Will use again.",
    ],
    aboutBody:
      "Our repair technicians handle appliance, furniture, and general maintenance jobs across {{location}} with reliable scheduling and clear communication.",
    processSteps: [
      { title: "Describe the issue", description: "Tell us what needs repair when you book." },
      { title: "We diagnose", description: "Our technician assesses and quotes upfront." },
      { title: "Repair completed", description: "We fix the problem with quality parts." },
      { title: "Job signed off", description: "You confirm the repair meets your expectations." },
    ],
  },
  plumbing: {
    primaryColor: "#1e40af",
    accentColor: "#3b82f6",
    tagline: "FAST PLUMBING. FAIR PRICING.",
    whyChooseUs: [
      "Licensed plumbers for repairs and installations",
      "Emergency same-day response available",
      "Transparent pricing before work starts",
      "Reliable workmanship on every job",
    ],
    testimonials: [
      "Quick response and quality workmanship. Fixed the leak on the first visit.",
      "Honest pricing and a professional team. Will use again.",
    ],
    aboutBody:
      "Our licensed plumbers handle everything from emergency leaks to full fixture installations across {{location}} — prepared, professional, and upfront about costs.",
    processSteps: [
      { title: "Book a plumber", description: "Schedule online or request an emergency call-out." },
      { title: "On-site diagnosis", description: "We identify the issue and confirm pricing." },
      { title: "Repair or install", description: "Licensed work completed to code." },
      { title: "Test & guarantee", description: "We verify everything works before we leave." },
    ],
  },
  electrical: {
    primaryColor: "#854d0e",
    accentColor: "#ca8a04",
    tagline: "SAFE POWER. CERTIFIED WORK.",
    whyChooseUs: [
      "Licensed electricians for homes and businesses",
      "Compliance certificates and safety inspections",
      "Emergency electrical fault response",
      "Clear quotes before any work begins",
    ],
    testimonials: [
      "Professional electrician — fixed our DB board quickly and safely.",
      "COC issued same day. Very thorough and fairly priced.",
    ],
    aboutBody:
      "Our certified electricians provide safe installations, repairs, and compliance inspections across {{location}} with fast response times and transparent pricing.",
    processSteps: [
      { title: "Book online", description: "Describe your electrical issue or service needed." },
      { title: "Site assessment", description: "We inspect and provide a clear quote." },
      { title: "Certified work", description: "Licensed electricians complete the job safely." },
      { title: "Compliance sign-off", description: "Certificates issued where required." },
    ],
  },
  freelancers: {
    primaryColor: "#3730a3",
    accentColor: "#6366f1",
    tagline: "YOUR VISION. DELIVERED.",
    whyChooseUs: [
      "Experienced freelance professionals",
      "Clear project scopes and timelines",
      "Flexible packages for every budget",
      "Direct communication from start to finish",
    ],
    testimonials: [
      "Delivered exactly what we needed — on time and on budget.",
      "Great communication and creative results. Highly recommend.",
    ],
    aboutBody:
      "We help clients across {{location}} with professional freelance services — from strategy and design to development and content — with clear deliverables and reliable timelines.",
    processSteps: [
      { title: "Share your brief", description: "Tell us about your project goals and timeline." },
      { title: "Proposal & quote", description: "We scope the work and agree on deliverables." },
      { title: "Project delivery", description: "Regular updates as we complete your project." },
      { title: "Review & handover", description: "Final delivery with any agreed revisions." },
    ],
  },
  consulting: {
    primaryColor: "#1e3a5f",
    accentColor: "#475569",
    tagline: "EXPERT ADVICE. REAL RESULTS.",
    whyChooseUs: [
      "Experienced consultants across key business areas",
      "Tailored strategies for your goals",
      "Actionable recommendations you can implement",
      "Flexible engagement models",
    ],
    testimonials: [
      "Clear, practical advice that made an immediate difference to our business.",
      "Professional engagement from discovery through to delivery.",
    ],
    aboutBody:
      "We partner with businesses across {{location}} to solve challenges, improve operations, and accelerate growth with expert advisory services tailored to your industry.",
    processSteps: [
      { title: "Discovery call", description: "We learn about your goals and challenges." },
      { title: "Assessment", description: "We analyse your situation and opportunities." },
      { title: "Recommendations", description: "You receive a clear action plan." },
      { title: "Implementation support", description: "We help you execute and measure results." },
    ],
  },
  agencies: {
    primaryColor: "#581c87",
    accentColor: "#a855f7",
    tagline: "GROW YOUR BRAND.",
    whyChooseUs: [
      "Full-service creative and digital agency",
      "Data-driven campaigns that deliver ROI",
      "Dedicated account management",
      "Flexible retainers and project packages",
    ],
    testimonials: [
      "Our best marketing investment — leads increased within the first month.",
      "Creative team that truly understands our brand and audience.",
    ],
    aboutBody:
      "We are a full-service agency helping brands across {{location}} grow through strategy, creative, and digital marketing with measurable results.",
    processSteps: [
      { title: "Strategy session", description: "We align on goals, audience, and KPIs." },
      { title: "Campaign plan", description: "A tailored roadmap with clear deliverables." },
      { title: "Creative execution", description: "Our team launches and manages your campaigns." },
      { title: "Report & optimise", description: "Regular performance reviews and improvements." },
    ],
  },
  construction: {
    primaryColor: "#7c2d12",
    accentColor: "#ea580c",
    tagline: "BUILT TO LAST.",
    whyChooseUs: [
      "Experienced builders and project managers",
      "Clear timelines and milestone updates",
      "Quality materials and skilled trades",
      "Free site inspections and detailed quotes",
    ],
    testimonials: [
      "Professional team — our renovation was completed on time and to a high standard.",
      "Clear communication throughout the project. Would hire again.",
    ],
    aboutBody:
      "We deliver quality construction, renovation, and finishing projects across {{location}} with experienced teams, transparent quotes, and professional project management.",
    processSteps: [
      { title: "Site inspection", description: "We visit your property and scope the project." },
      { title: "Detailed quote", description: "You receive a clear breakdown of costs and timeline." },
      { title: "Build phase", description: "Our team executes with regular progress updates." },
      { title: "Handover", description: "Final walkthrough and project sign-off." },
    ],
  },
};

function themeColorsForIndustry(key: V8IndustryTemplateKey): { primary: string; accent: string; tagline: string } {
  const copy = INDUSTRY_COPY[key];
  if (copy.primaryColor && copy.accentColor) {
    return {
      primary: copy.primaryColor,
      accent: copy.accentColor,
      tagline: copy.tagline ?? "TRUSTED LOCAL SERVICE.",
    };
  }
  const variant = getWebsiteVariantTheme(resolveWebsiteTemplateVariant(key));
  return {
    primary: variant.primary,
    accent: variant.accent,
    tagline: copy.tagline ?? variant.tagline,
  };
}

export function getWebsiteBuilderIndustryTemplate(
  industryKey: string
): WebsiteBuilderIndustryTemplate {
  const key = V8_INDUSTRY_TEMPLATE_KEYS.includes(industryKey as V8IndustryTemplateKey)
    ? (industryKey as V8IndustryTemplateKey)
    : "cleaning";
  const module = loadIndustryModule(key);
  const copy = INDUSTRY_COPY[key];
  const colors = themeColorsForIndustry(key);
  const images = industryImagePreset(key);

  return {
    industryKey: key,
    name: module.name,
    description: module.description,
    icon: module.icon,
    primaryColor: colors.primary,
    accentColor: colors.accent,
    tagline: colors.tagline,
    previewImage: images.heroImage,
    previewImageAlt: images.heroImageAlt,
    whyChooseUs: copy.whyChooseUs,
    testimonials: copy.testimonials,
    aboutBody: copy.aboutBody,
    processSteps: copy.processSteps,
  };
}

export function listWebsiteBuilderIndustryTemplates(): WebsiteBuilderIndustryTemplate[] {
  return V8_INDUSTRY_TEMPLATE_KEYS.map((key) => getWebsiteBuilderIndustryTemplate(key));
}

function formatLocation(company: CompanyWithIndustry): string {
  return company.contact_location ?? company.service_areas ?? "your local area";
}

function interpolateLocation(text: string, location: string): string {
  return text.replace(/\{\{location\}\}/g, location);
}

type ServiceInput = { name: string; description: string | null; base_price_cents: number };

export function buildLandingFromIndustryTemplate(
  company: CompanyWithIndustry,
  industryKey: string,
  companyServices: ServiceInput[] = []
): LandingPageContent {
  const template = getWebsiteBuilderIndustryTemplate(industryKey);
  const module = loadIndustryModule(industryKey);
  const location = formatLocation(company);
  const serviceHeading = module.terminology.service
    ? `Our ${module.terminology.service}`
    : "Our Services";

  const serviceItems =
    companyServices.length > 0
      ? companyServices.slice(0, 6).map((s) => ({
          title: s.name,
          description: s.description ?? "",
          priceFrom:
            s.base_price_cents > 0
              ? `From R${Math.round(s.base_price_cents / 100)}`
              : undefined,
        }))
      : module.services.templates.slice(0, 6).map((s) => ({
          title: s.name,
          description: s.description,
          priceFrom: s.price && s.price !== "0" ? `From R${s.price}` : undefined,
        }));

  return {
    hero: {
      headline: company.name,
      subheadline: module.growth.heroSubtitle,
      ctaLabel: "Book Now",
      imageUrl: company.brand_logo_url ?? null,
    },
    about: {
      heading: `About ${company.name}`,
      body:
        company.business_description?.trim() ||
        interpolateLocation(template.aboutBody, location),
    },
    services: {
      heading: serviceHeading,
      items: serviceItems,
    },
    whyChooseUs: {
      heading: "Why choose us",
      items: template.whyChooseUs,
    },
    contact: {
      heading: "Get in touch",
      phone: company.contact_phone ?? null,
      email: company.primary_contact_email ?? null,
      location: company.contact_location ?? null,
      hours: null,
    },
    footer: {
      businessName: company.name,
      tagline: module.growth.serviceLabel,
    },
  };
}

function insertSectionAfter(
  sections: WebsiteSection[],
  afterType: WebsiteSection["type"],
  section: WebsiteSection
): WebsiteSection[] {
  const index = sections.findIndex((s) => s.type === afterType);
  if (index === -1) return [...sections, section];
  return [...sections.slice(0, index + 1), section, ...sections.slice(index + 1)];
}

export function buildIndustryTemplatePageContent(
  company: CompanyWithIndustry,
  industryKey: string,
  companyServices: ServiceInput[] = []
): WebsitePageContentV2 {
  const template = getWebsiteBuilderIndustryTemplate(industryKey);
  const landing = buildLandingFromIndustryTemplate(company, industryKey, companyServices);

  let sections = sectionsFromLanding(landing);

  if (template.testimonials.length > 0) {
    const testimonials = createSection("testimonials");
    testimonials.props = {
      heading: "What customers say",
      items: template.testimonials.map((quote) => ({ quote, author: "Verified customer" })),
    };
    sections = insertSectionAfter(sections, "why-choose-us", testimonials);
  }

  if (template.processSteps.length > 0) {
    const process = createSection("process");
    process.props = {
      heading: "How it works",
      items: template.processSteps,
    };
    sections = insertSectionAfter(sections, "services", process);
  }

  const faq = createSection("faq");
  faq.props = {
    heading: "Frequently asked questions",
    items: [
      {
        question: "How do I book?",
        answer:
          "Click Book Now, choose your service and preferred time, and we'll confirm your appointment.",
      },
      {
        question: "What are your prices?",
        answer:
          "Pricing depends on the service and scope. Starting prices are shown on each service card.",
      },
      {
        question: "Do you serve my area?",
        answer: `We proudly serve ${formatLocation(company)} and surrounding areas.`,
      },
    ],
  };
  sections = insertSectionAfter(sections, "contact", faq);

  const content = buildPageContentPayload(sections, landing);
  return applyStockImagesToPageContent(content, industryKey);
}

function applyStockImagesToPageContent(
  content: WebsitePageContentV2,
  industryKey: string
): WebsitePageContentV2 {
  const images = industryImagePreset(industryKey);
  const next = structuredClone(content);

  next.hero = {
    ...next.hero,
    imageUrl: images.heroImage,
  };

  const sections = (next.sections ?? []).map((section) => {
    if (section.type === "hero") {
      const props = section.props as HeroSectionProps;
      return {
        ...section,
        props: {
          ...props,
          backgroundImageUrl: images.heroImage,
          heroImageUrl: images.heroImage,
          overlayOpacity: 0.45,
        },
      };
    }

    if (section.type === "about") {
      const props = section.props as Record<string, unknown>;
      return {
        ...section,
        props: {
          ...props,
          imageUrl: images.aboutImage,
          imageAlt: images.aboutImageAlt,
        },
      };
    }

    if (section.type === "services") {
      const props = section.props as {
        heading?: string;
        items?: { title: string; description: string; priceFrom?: string; imageUrl?: string }[];
      };
      return {
        ...section,
        props: {
          ...props,
          items: (props.items ?? []).map((item, index) => ({
            ...item,
            imageUrl: images.serviceImages[index % images.serviceImages.length],
          })),
        },
      };
    }

    return section;
  });

  const hasGallery = sections.some((s) => s.type === "gallery");
  if (!hasGallery && images.serviceImages.length > 0) {
    const gallery = createSection("gallery");
    gallery.props = {
      heading: "Our work",
      images: images.serviceImages,
    };
    const servicesIndex = sections.findIndex((s) => s.type === "services");
    if (servicesIndex >= 0) {
      sections.splice(servicesIndex + 1, 0, gallery);
    } else {
      sections.push(gallery);
    }
  }

  next.sections = sections;
  return next;
}

export function buildTemplatePreviewWebsite(
  company: CompanyWithIndustry,
  industryKey: string
): BuilderWebsite {
  const template = getWebsiteBuilderIndustryTemplate(industryKey);
  const theme = themeSettingsForIndustryTemplate(industryKey);
  const now = new Date().toISOString();

  return {
    id: "preview",
    company_id: company.id,
    slug: company.slug,
    title: company.name,
    description: company.business_description ?? null,
    status: "draft",
    builder_mode: true,
    theme_settings: {
      ...theme,
      logoUrl: company.brand_logo_url ?? null,
    },
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    og_title: null,
    og_description: null,
    og_image_url: template.previewImage,
    booking_button_label: "Book Now",
    booking_enabled: true,
    published_at: null,
    created_at: now,
    updated_at: now,
  };
}

export function buildTemplatePreviewPageContent(
  company: CompanyWithIndustry,
  industryKey: string,
  companyServices: ServiceInput[] = []
): WebsitePageContentV2 {
  return buildIndustryTemplatePageContent(company, industryKey, companyServices);
}

export function themeSettingsForIndustryTemplate(industryKey: string): Record<string, unknown> {
  const template = getWebsiteBuilderIndustryTemplate(industryKey);
  return {
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    secondaryColor: "#64748b",
    bookingButtonLabel: "Book Now",
  };
}
