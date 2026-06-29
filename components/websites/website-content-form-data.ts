import {
  defaultLogoWidthForShape,
  resolveLogoShape,
  resolveLogoSizePx,
  resolveLogoWidthPx,
  type LogoShape,
} from "@/lib/website-templates/logo-display";
import { isModernOverlayWebsite } from "@/lib/website-templates/modern-overlay";
import { resolveWebsiteTemplateVariant } from "@/lib/website-templates/variants";
import type { WebsiteContent } from "@/types/database";

export type ServiceItem = {
  title: string;
  description: string;
  priceFrom: string;
  image: string;
  imageAlt: string;
};

export type TitleDescriptionItem = {
  title: string;
  description: string;
};

export type FaqFormItem = {
  question: string;
  answer: string;
};

export type ChipFormItem = {
  title: string;
  priceFrom: string;
};

export type StepFormItem = {
  title: string;
  description: string;
};

export type TransformSlideFormItem = {
  label: string;
  beforeImage: string;
  afterImage: string;
  thumbnailImage: string;
};

export type TestimonialFormItem = {
  quote: string;
  name: string;
  company: string;
  avatar: string;
};

export type BlogPostFormItem = {
  category: string;
  title: string;
  excerpt: string;
  image: string;
};

export type WebsiteContentFormData = {
  theme: {
    primaryColor: string;
    accentColor: string;
    faviconUrl: string;
  };
  topbar: {
    logo: string;
    logoSize: number;
    logoShape: LogoShape;
    logoWidth: number;
    hideBusinessNameInHeader: boolean;
    serviceArea: string;
    hours: string;
    phone: string;
    email: string;
    facebook: string;
    instagram: string;
    tagline: string;
  };
  hero: {
    businessName: string;
    headline: string;
    subtitle: string;
    location: string;
    badge: string;
    startingPrice: string;
    trustBullets: string;
    ctaLabel: string;
    ctaSecondaryLabel: string;
    quoteCtaLabel: string;
    rating: string;
    ratingCount: string;
    image: string;
    imageAlt: string;
    floatingStatValue: string;
    floatingStatLabel: string;
  };
  serviceChips: {
    items: ChipFormItem[];
  };
  trustBand: {
    items: TitleDescriptionItem[];
  };
  services: {
    heading: string;
    subtitle: string;
    items: ServiceItem[];
  };
  about: {
    heading: string;
    body: string;
    image: string;
    imageAlt: string;
    imageSecondary: string;
    imageTertiary: string;
    stat1Value: string;
    stat1Label: string;
    stat2Value: string;
    stat2Label: string;
  };
  whyChooseUs: {
    label: string;
    heading: string;
    body: string;
    ctaLabel: string;
    whatsapp: string;
    image: string;
    imageAlt: string;
    imageSecondary: string;
    imageSecondaryAlt: string;
    badgeText: string;
    benefits: TitleDescriptionItem[];
  };
  socialProof: {
    establishedYear: string;
    jobsCompleted: string;
    satisfactionRate: string;
    responseTime: string;
    reviewQuote: string;
    reviewAuthor: string;
    googleReviews: string;
  };
  howItWorks: {
    heading: string;
    steps: StepFormItem[];
  };
  workProcess: {
    label: string;
    heading: string;
    steps: StepFormItem[];
  };
  featureBanner: {
    image: string;
    imageAlt: string;
  };
  transformShowcase: {
    label: string;
    heading: string;
    body: string;
    features: string;
    slides: TransformSlideFormItem[];
  };
  testimonials: {
    label: string;
    heading: string;
    items: TestimonialFormItem[];
  };
  craftsmanship: {
    label: string;
    heading: string;
    body: string;
    features: string;
    phoneLabel: string;
    phone: string;
    image: string;
    imageSecondary: string;
    imageTertiary: string;
    imageAlt: string;
  };
  homeBlog: {
    label: string;
    heading: string;
    body: string;
    ctaLabel: string;
    callCtaPrefix: string;
    callCtaPhone: string;
    posts: BlogPostFormItem[];
  };
  faq: {
    heading: string;
    body: string;
    ctaLabel: string;
    items: FaqFormItem[];
  };
  serviceAreas: {
    heading: string;
    intro: string;
    popular: string;
    areas: string;
    ctaLabel: string;
  };
  finalCta: {
    heading: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  contact: {
    heading: string;
    phone: string;
    email: string;
    address: string;
    details: string;
  };
  footer: {
    description: string;
    newsletterHeading: string;
    newsletterBody: string;
    copyrightName: string;
    serviceLinks: string;
    companyLinks: string;
    resourceLinks: string;
    supportLinks: string;
  };
};

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toRecord(rows: WebsiteContent[]): Record<string, Record<string, unknown>> {
  return rows.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
    acc[row.section] = row.content ?? {};
    return acc;
  }, {});
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readImageField(source: Record<string, unknown>): string {
  const image = source.image;
  const imageUrl = source.imageUrl;
  if (typeof image === "string" && image) return image;
  if (typeof imageUrl === "string") return imageUrl;
  return "";
}

function toServiceItems(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw)) return [];
  const objectItems = raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      if (!title) return null;
      return {
        title,
        description: asString(record.description),
        priceFrom: asString(record.priceFrom, asString(record.price)),
        image: readImageField(record),
        imageAlt: asString(record.imageAlt, title),
      };
    })
    .filter((item): item is ServiceItem => item !== null);
  if (objectItems.length > 0) return objectItems;
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((title) => ({
      title,
      description: "",
      priceFrom: "",
      image: "",
      imageAlt: title,
    }));
}

function toTitleDescriptionItems(raw: unknown): TitleDescriptionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return { title: item, description: "" };
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      if (!title) return null;
      return { title, description: asString(record.description) };
    })
    .filter((item): item is TitleDescriptionItem => item !== null);
}

function toChipItems(raw: unknown): ChipFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      if (!title) return null;
      return { title, priceFrom: asString(record.priceFrom, "From R299") };
    })
    .filter((item): item is ChipFormItem => item !== null);
}

function toFaqItems(raw: unknown): FaqFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const question = asString(record.question);
      if (!question) return null;
      return { question, answer: asString(record.answer) };
    })
    .filter((item): item is FaqFormItem => item !== null);
}

function toStepItems(raw: unknown): StepFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return { title: item, description: "" };
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      if (!title) return null;
      return { title, description: asString(record.description) };
    })
    .filter((item): item is StepFormItem => item !== null);
}

function toTransformSlides(raw: unknown): TransformSlideFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || !item) return [];
    const record = item as Record<string, unknown>;
    const label = asString(record.label);
    const beforeImage = asString(record.beforeImage, asString(record.before));
    const afterImage = asString(record.afterImage, asString(record.after));
    if (!label) return [];
    return [
      {
        label,
        beforeImage,
        afterImage,
        thumbnailImage: asString(record.thumbnailImage, asString(record.thumbnail)),
      },
    ];
  });
}

function toTestimonialItems(raw: unknown): TestimonialFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { quote: item, name: "", company: "", avatar: "" };
      }
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const quote = asString(record.quote, asString(record.text, asString(record.review)));
      if (!quote) return null;
      return {
        quote,
        name: asString(record.name, asString(record.author)),
        company: asString(record.company, asString(record.role)),
        avatar: asString(record.avatar, asString(record.image)),
      };
    })
    .filter((item): item is TestimonialFormItem => item !== null);
}

function toBlogPostItems(raw: unknown): BlogPostFormItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || !item) return [];
    const record = item as Record<string, unknown>;
    const title = asString(record.title);
    if (!title) return [];
    return [
      {
        category: asString(record.category, "Insights"),
        title,
        excerpt: asString(record.excerpt, asString(record.description)),
        image: readImageField(record),
      },
    ];
  });
}

function linesToString(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join("\n");
  }
  return "";
}

function stringToLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildWebsiteContentFormData(rows: WebsiteContent[]): WebsiteContentFormData {
  const content = toRecord(rows);
  const theme = content.theme ?? {};
  const topbar = content.topbar ?? {};
  const hero = content.hero ?? {};
  const serviceChips = content.serviceChips ?? {};
  const trustBand = content.trustBand ?? {};
  const services = content.services ?? {};
  const about = content.about ?? {};
  const whyChooseUs = content.whyChooseUs ?? {};
  const socialProof = content.socialProof ?? {};
  const howItWorks = content.howItWorks ?? {};
  const workProcess = content.workProcess ?? {};
  const featureBanner = content.featureBanner ?? {};
  const transformShowcase = content.transformShowcase ?? {};
  const testimonials = content.testimonials ?? {};
  const craftsmanship = content.craftsmanship ?? {};
  const homeBlog = content.homeBlog ?? {};
  const faq = content.faq ?? {};
  const serviceAreas = content.serviceAreas ?? {};
  const cta = content.cta ?? {};
  const contact = content.contact ?? {};
  const footer = content.footer ?? {};

  const serviceItems = toServiceItems(services.items);
  const headline =
    asString(hero.headline) ||
    asString(hero.title) ||
    asString(hero.businessName);

  return {
    theme: {
      primaryColor: asString(theme.primaryColor, "#0f2744"),
      accentColor: asString(theme.accentColor, "#2563eb"),
      faviconUrl: asString(theme.faviconUrl, asString(theme.favicon)),
    },
    topbar: {
      logo: asString(topbar.logo, asString(topbar.logoUrl)),
      logoSize: resolveLogoSizePx(topbar.logoSize),
      logoShape: resolveLogoShape(topbar.logoShape),
      logoWidth: resolveLogoWidthPx(
        topbar.logoWidth,
        resolveLogoSizePx(topbar.logoSize),
        resolveLogoShape(topbar.logoShape),
        defaultLogoWidthForShape(
          resolveLogoShape(topbar.logoShape),
          resolveLogoSizePx(topbar.logoSize)
        )
      ),
      hideBusinessNameInHeader: asBoolean(topbar.hideBusinessNameInHeader),
      serviceArea: asString(topbar.serviceArea),
      hours: asString(topbar.hours, "Mon–Sat: 8:00 AM – 6:00 PM"),
      phone: asString(topbar.phone, asString(contact.phone)),
      email: asString(topbar.email, asString(contact.email)),
      facebook: asString(topbar.facebook),
      instagram: asString(topbar.instagram),
      tagline: asString(topbar.tagline),
    },
    hero: {
      businessName: asString(hero.businessName, headline),
      headline,
      subtitle: asString(hero.subtitle),
      location: asString(hero.location, asString(topbar.serviceArea)),
      badge: asString(hero.badge),
      startingPrice: asString(hero.startingPrice, "From R299"),
      trustBullets: linesToString(hero.trustBullets),
      ctaLabel: asString(hero.ctaLabel, "Book a Service"),
      ctaSecondaryLabel: asString(hero.ctaSecondaryLabel, "Get Free Quote"),
      quoteCtaLabel: asString(hero.quoteCtaLabel, "Get Free Quote"),
      rating: asString(hero.rating, "4.9"),
      ratingCount: asString(hero.ratingCount, "120+ Google reviews"),
      image: readImageField(hero),
      imageAlt: asString(hero.imageAlt),
      floatingStatValue: asString(hero.floatingStatValue, "100+"),
      floatingStatLabel: asString(hero.floatingStatLabel, "Happy customers"),
    },
    serviceChips: {
      items:
        toChipItems(serviceChips.items).length > 0
          ? toChipItems(serviceChips.items)
          : serviceItems.slice(0, 6).map((s) => ({
              title: s.title,
              priceFrom: s.priceFrom || "From R299",
            })),
    },
    trustBand: {
      items: toTitleDescriptionItems(trustBand.items),
    },
    services: {
      heading: asString(services.heading, "Our Services"),
      subtitle: asString(services.subtitle),
      items: serviceItems,
    },
    about: {
      heading: asString(about.heading, "About"),
      body: asString(about.body),
      image: readImageField(about),
      imageAlt: asString(about.imageAlt),
      imageSecondary: asString(about.imageSecondary, asString(about.image2)),
      imageTertiary: asString(about.imageTertiary, asString(about.image3)),
      stat1Value: asString(about.stat1Value, asString(socialProof.jobsCompleted, "250+")),
      stat1Label: asString(about.stat1Label, "Projects Completed"),
      stat2Value: asString(about.stat2Value, "10+"),
      stat2Label: asString(about.stat2Label, "Years of Experience"),
    },
    whyChooseUs: {
      label: asString(whyChooseUs.label, "Quality You Trust"),
      heading: asString(whyChooseUs.heading, "Trusted by Local Customers"),
      body: asString(whyChooseUs.body, asString(about.body)),
      ctaLabel: asString(whyChooseUs.ctaLabel, "Book a Service"),
      whatsapp: asString(whyChooseUs.whatsapp),
      image: readImageField(whyChooseUs),
      imageAlt: asString(whyChooseUs.imageAlt),
      imageSecondary: asString(whyChooseUs.imageSecondary),
      imageSecondaryAlt: asString(whyChooseUs.imageSecondaryAlt, "Our expert team"),
      badgeText: asString(whyChooseUs.badgeText, "Built with lasting quality"),
      benefits: toTitleDescriptionItems(whyChooseUs.benefits),
    },
    socialProof: {
      establishedYear: asString(socialProof.establishedYear, "2016"),
      jobsCompleted: asString(socialProof.jobsCompleted, "2,500+"),
      satisfactionRate: asString(socialProof.satisfactionRate, "98%"),
      responseTime: asString(socialProof.responseTime, "2hr"),
      reviewQuote: asString(socialProof.reviewQuote),
      reviewAuthor: asString(socialProof.reviewAuthor, "Verified Google Review"),
      googleReviews: asString(socialProof.googleReviews, "120+ verified Google reviews"),
    },
    howItWorks: {
      heading: asString(howItWorks.heading, "From Booking to Done"),
      steps: toStepItems(howItWorks.steps),
    },
    workProcess: {
      label: asString(workProcess.label, "Our work process"),
      heading: asString(workProcess.heading, asString(howItWorks.heading, "Step-by-Step Home Transformations")),
      steps: toStepItems(workProcess.steps).length
        ? toStepItems(workProcess.steps)
        : toStepItems(howItWorks.steps),
    },
    featureBanner: {
      image: readImageField(featureBanner),
      imageAlt: asString(featureBanner.imageAlt, "Feature banner"),
    },
    transformShowcase: {
      label: asString(transformShowcase.label, "Dreams Into Reality"),
      heading: asString(
        transformShowcase.heading,
        "Turning Ordinary Houses into Beautiful Cozy Homes"
      ),
      body: asString(
        transformShowcase.body,
        "After we deliver, enjoy a perfect home. Once our renovation work is complete, every corner of your space reflects quality, care, and attention to detail."
      ),
      features: linesToString(transformShowcase.features),
      slides: toTransformSlides(transformShowcase.slides),
    },
    testimonials: {
      label: asString(testimonials.label, "Clients Love Us"),
      heading: asString(testimonials.heading, "Trusted By Homeowners"),
      items: toTestimonialItems(testimonials.items),
    },
    craftsmanship: {
      label: asString(craftsmanship.label, "Homes Made Perfect"),
      heading: asString(craftsmanship.heading, "Craftsmanship That Stands the Test"),
      body: asString(
        craftsmanship.body,
        "Expert Craftsmanship Guaranteed. Our skilled team brings years of experience and meticulous attention to every renovation project."
      ),
      features: linesToString(craftsmanship.features),
      phoneLabel: asString(craftsmanship.phoneLabel, "Call us 24/7"),
      phone: asString(craftsmanship.phone, asString(topbar.phone, asString(contact.phone))),
      image: readImageField(craftsmanship),
      imageSecondary: asString(craftsmanship.imageSecondary),
      imageTertiary: asString(craftsmanship.imageTertiary),
      imageAlt: asString(craftsmanship.imageAlt, "Expert craftsmanship"),
    },
    homeBlog: {
      label: asString(homeBlog.label, "Expert Insights"),
      heading: asString(homeBlog.heading, "Smart Home Upgrade Blog"),
      body: asString(
        homeBlog.body,
        "Welcome to our Home Upgrade Blog, where we share practical tips, expert advice, and renovation inspiration."
      ),
      ctaLabel: asString(homeBlog.ctaLabel, "Explore Blog"),
      callCtaPrefix: asString(homeBlog.callCtaPrefix, "Need Help? Call Now :"),
      callCtaPhone: asString(homeBlog.callCtaPhone, asString(topbar.phone, asString(contact.phone))),
      posts: toBlogPostItems(homeBlog.posts),
    },
    faq: {
      heading: asString(faq.heading, "Frequently Asked Questions"),
      body: asString(faq.body),
      ctaLabel: asString(faq.ctaLabel, "Still have questions? Contact us"),
      items: toFaqItems(faq.items),
    },
    serviceAreas: {
      heading: asString(serviceAreas.heading),
      intro: asString(serviceAreas.intro),
      popular: linesToString(serviceAreas.popular),
      areas: linesToString(serviceAreas.areas),
      ctaLabel: asString(serviceAreas.ctaLabel, "Check availability in your area"),
    },
    finalCta: {
      heading: asString(cta.heading, "Ready to Book a Trusted Professional?"),
      body: asString(cta.body),
      primaryLabel: asString(cta.primaryLabel, "Book Now"),
      secondaryLabel: asString(cta.secondaryLabel, "Get Free Quote"),
    },
    contact: {
      heading: asString(contact.heading, "Contact"),
      phone: asString(contact.phone),
      email: asString(contact.email),
      address: asString(contact.address),
      details: asString(contact.details),
    },
    footer: {
      description: asString(footer.description),
      newsletterHeading: asString(footer.newsletterHeading, "Stay Updated"),
      newsletterBody: asString(
        footer.newsletterBody,
        "Hey there! Join our newsletter for renovation tips, project ideas, and exclusive offers."
      ),
      copyrightName: asString(footer.copyrightName),
      serviceLinks: linesToString(footer.serviceLinks),
      companyLinks: linesToString(footer.companyLinks),
      resourceLinks: linesToString(footer.resourceLinks),
      supportLinks: linesToString(footer.supportLinks),
    },
  };
}

export type WebsiteContentSavePayload = {
  theme: Record<string, unknown>;
  topbar: Record<string, unknown>;
  hero: Record<string, unknown>;
  serviceChips: Record<string, unknown>;
  trustBand: Record<string, unknown>;
  services: Record<string, unknown>;
  about: Record<string, unknown>;
  whyChooseUs: Record<string, unknown>;
  socialProof: Record<string, unknown>;
  howItWorks: Record<string, unknown>;
  workProcess: Record<string, unknown>;
  featureBanner: Record<string, unknown>;
  transformShowcase: Record<string, unknown>;
  testimonials: Record<string, unknown>;
  craftsmanship: Record<string, unknown>;
  homeBlog: Record<string, unknown>;
  faq: Record<string, unknown>;
  serviceAreas: Record<string, unknown>;
  cta: Record<string, unknown>;
  contact: Record<string, unknown>;
  footer: Record<string, unknown>;
};

export function websiteContentFormDataToPayload(
  form: WebsiteContentFormData,
  extended: boolean,
  modernOverlay = false
): Record<string, Record<string, unknown>> {
  const trustBullets = stringToLines(form.hero.trustBullets);

  const full: WebsiteContentSavePayload = {
    theme: {
      primaryColor: form.theme.primaryColor.trim(),
      accentColor: form.theme.accentColor.trim(),
      faviconUrl: form.theme.faviconUrl.trim(),
    },
    topbar: {
      logo: form.topbar.logo.trim(),
      logoSize: resolveLogoSizePx(form.topbar.logoSize),
      logoShape: form.topbar.logoShape,
      logoWidth: resolveLogoWidthPx(
        form.topbar.logoWidth,
        resolveLogoSizePx(form.topbar.logoSize),
        form.topbar.logoShape
      ),
      hideBusinessNameInHeader: form.topbar.hideBusinessNameInHeader,
      serviceArea: form.topbar.serviceArea.trim(),
      hours: form.topbar.hours.trim(),
      phone: form.topbar.phone.trim(),
      email: form.topbar.email.trim(),
      facebook: form.topbar.facebook.trim(),
      instagram: form.topbar.instagram.trim(),
      tagline: form.topbar.tagline.trim(),
    },
    hero: {
      businessName: form.hero.businessName.trim(),
      headline: form.hero.headline.trim(),
      title: form.hero.headline.trim(),
      subtitle: form.hero.subtitle.trim(),
      location: form.hero.location.trim(),
      badge: form.hero.badge.trim(),
      startingPrice: form.hero.startingPrice.trim(),
      trustBullets,
      ctaLabel: form.hero.ctaLabel.trim(),
      ctaHref: "/contact",
      ctaSecondaryLabel: form.hero.ctaSecondaryLabel.trim(),
      ctaSecondaryHref: "/contact",
      quoteCtaLabel: form.hero.quoteCtaLabel.trim(),
      quoteCtaHref: "/contact",
      rating: form.hero.rating.trim(),
      ratingCount: form.hero.ratingCount.trim(),
      image: form.hero.image.trim(),
      imageAlt: form.hero.imageAlt.trim(),
      floatingStatValue: form.hero.floatingStatValue.trim(),
      floatingStatLabel: form.hero.floatingStatLabel.trim(),
    },
    serviceChips: {
      items: form.serviceChips.items
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          priceFrom: item.priceFrom.trim() || "From R299",
        })),
    },
    trustBand: {
      items: form.trustBand.items
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        })),
    },
    services: {
      heading: form.services.heading.trim(),
      subtitle: form.services.subtitle.trim(),
      items: form.services.items
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          priceFrom: item.priceFrom.trim(),
          image: item.image.trim(),
          imageAlt: item.imageAlt.trim() || item.title.trim(),
        })),
    },
    about: {
      heading: form.about.heading.trim(),
      body: form.about.body.trim(),
      image: form.about.image.trim(),
      imageAlt: form.about.imageAlt.trim(),
      imageSecondary: form.about.imageSecondary.trim(),
      imageTertiary: form.about.imageTertiary.trim(),
      stat1Value: form.about.stat1Value.trim(),
      stat1Label: form.about.stat1Label.trim(),
      stat2Value: form.about.stat2Value.trim(),
      stat2Label: form.about.stat2Label.trim(),
    },
    whyChooseUs: {
      label: form.whyChooseUs.label.trim(),
      heading: form.whyChooseUs.heading.trim(),
      body: form.whyChooseUs.body.trim(),
      ctaLabel: form.whyChooseUs.ctaLabel.trim(),
      ctaHref: "/contact",
      whatsapp: form.whyChooseUs.whatsapp.trim(),
      image: form.whyChooseUs.image.trim(),
      imageAlt: form.whyChooseUs.imageAlt.trim(),
      imageSecondary: form.whyChooseUs.imageSecondary.trim(),
      imageSecondaryAlt: form.whyChooseUs.imageSecondaryAlt.trim(),
      badgeText: form.whyChooseUs.badgeText.trim(),
      benefits: form.whyChooseUs.benefits
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        })),
    },
    socialProof: {
      establishedYear: form.socialProof.establishedYear.trim(),
      jobsCompleted: form.socialProof.jobsCompleted.trim(),
      satisfactionRate: form.socialProof.satisfactionRate.trim(),
      responseTime: form.socialProof.responseTime.trim(),
      reviewQuote: form.socialProof.reviewQuote.trim(),
      reviewAuthor: form.socialProof.reviewAuthor.trim(),
      googleReviews: form.socialProof.googleReviews.trim(),
    },
    howItWorks: {
      heading: form.howItWorks.heading.trim(),
      steps: form.howItWorks.steps
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        })),
    },
    workProcess: {
      label: form.workProcess.label.trim(),
      heading: form.workProcess.heading.trim(),
      steps: form.workProcess.steps
        .filter((item) => item.title.trim())
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
        })),
    },
    featureBanner: {
      image: form.featureBanner.image.trim(),
      imageAlt: form.featureBanner.imageAlt.trim(),
    },
    transformShowcase: {
      label: form.transformShowcase.label.trim(),
      heading: form.transformShowcase.heading.trim(),
      body: form.transformShowcase.body.trim(),
      features: stringToLines(form.transformShowcase.features),
      slides: form.transformShowcase.slides
        .filter((slide) => slide.label.trim())
        .map((slide) => ({
          label: slide.label.trim(),
          beforeImage: slide.beforeImage.trim(),
          afterImage: slide.afterImage.trim(),
          thumbnailImage: slide.thumbnailImage.trim(),
        })),
    },
    testimonials: {
      label: form.testimonials.label.trim(),
      heading: form.testimonials.heading.trim(),
      items: form.testimonials.items
        .filter((item) => item.quote.trim())
        .map((item) => ({
          quote: item.quote.trim(),
          name: item.name.trim(),
          company: item.company.trim(),
          avatar: item.avatar.trim(),
        })),
    },
    craftsmanship: {
      label: form.craftsmanship.label.trim(),
      heading: form.craftsmanship.heading.trim(),
      body: form.craftsmanship.body.trim(),
      features: stringToLines(form.craftsmanship.features),
      phoneLabel: form.craftsmanship.phoneLabel.trim(),
      phone: form.craftsmanship.phone.trim(),
      image: form.craftsmanship.image.trim(),
      imageSecondary: form.craftsmanship.imageSecondary.trim(),
      imageTertiary: form.craftsmanship.imageTertiary.trim(),
      imageAlt: form.craftsmanship.imageAlt.trim(),
    },
    homeBlog: {
      label: form.homeBlog.label.trim(),
      heading: form.homeBlog.heading.trim(),
      body: form.homeBlog.body.trim(),
      ctaLabel: form.homeBlog.ctaLabel.trim(),
      ctaHref: "/blog",
      callCtaPrefix: form.homeBlog.callCtaPrefix.trim(),
      callCtaPhone: form.homeBlog.callCtaPhone.trim(),
      posts: form.homeBlog.posts
        .filter((post) => post.title.trim())
        .map((post) => ({
          category: post.category.trim() || "Insights",
          title: post.title.trim(),
          excerpt: post.excerpt.trim(),
          image: post.image.trim(),
        })),
    },
    faq: {
      heading: form.faq.heading.trim(),
      body: form.faq.body.trim(),
      ctaLabel: form.faq.ctaLabel.trim(),
      items: form.faq.items
        .filter((item) => item.question.trim())
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        })),
    },
    serviceAreas: {
      heading: form.serviceAreas.heading.trim(),
      intro: form.serviceAreas.intro.trim(),
      popular: stringToLines(form.serviceAreas.popular),
      areas: stringToLines(form.serviceAreas.areas),
      ctaLabel: form.serviceAreas.ctaLabel.trim(),
    },
    cta: {
      heading: form.finalCta.heading.trim(),
      body: form.finalCta.body.trim(),
      primaryLabel: form.finalCta.primaryLabel.trim(),
      primaryHref: "/contact",
      secondaryLabel: form.finalCta.secondaryLabel.trim(),
      secondaryHref: "/contact",
    },
    contact: {
      heading: form.contact.heading.trim(),
      phone: form.contact.phone.trim(),
      email: form.contact.email.trim(),
      address: form.contact.address.trim(),
      details: form.contact.details.trim(),
    },
    footer: {
      description: form.footer.description.trim(),
      newsletterHeading: form.footer.newsletterHeading.trim(),
      newsletterBody: form.footer.newsletterBody.trim(),
      copyrightName: form.footer.copyrightName.trim(),
      serviceLinks: stringToLines(form.footer.serviceLinks),
      companyLinks: stringToLines(form.footer.companyLinks),
      resourceLinks: stringToLines(form.footer.resourceLinks),
      supportLinks: stringToLines(form.footer.supportLinks),
    },
  };

  if (modernOverlay) {
    return full as unknown as Record<string, Record<string, unknown>>;
  }

  if (extended) {
    const { workProcess, featureBanner, transformShowcase, testimonials, craftsmanship, homeBlog, ...classic } =
      full;
    void workProcess;
    void featureBanner;
    void transformShowcase;
    void testimonials;
    void craftsmanship;
    void homeBlog;
    return classic as unknown as Record<string, Record<string, unknown>>;
  }

  return {
    hero: {
      title: full.hero.title,
      subtitle: full.hero.subtitle,
      ctaLabel: full.hero.ctaLabel,
      image: full.hero.image,
      imageAlt: full.hero.imageAlt,
    },
    services: {
      heading: full.services.heading,
      items: (full.services.items as unknown[]).map((item) => {
        const record = item as Record<string, unknown>;
        return {
          title: record.title,
          description: record.description,
          image: record.image,
          imageAlt: record.imageAlt,
        };
      }),
    },
    about: full.about,
    contact: full.contact,
  };
}

export function isServiceBusinessTemplate(
  template?: string | null,
  industry?: string | null
): boolean {
  const fromTemplate = resolveWebsiteTemplateVariant(template);
  const fromIndustry = resolveWebsiteTemplateVariant(industry);
  const variant =
    template?.trim() && fromTemplate !== "service-business" ? fromTemplate : fromIndustry;

  return (
    variant === "service-business" ||
    variant === "cleaning" ||
    variant === "beauty" ||
    variant === "technology" ||
    variant === "tourism"
  );
}

export { isModernOverlayTemplate, isModernOverlayWebsite, hasModernOverlayWebsiteContent } from "@/lib/website-templates/modern-overlay";

export function isLuxuryBeautyWebsite(
  template?: string | null,
  industry?: string | null
): boolean {
  const fromTemplate = resolveWebsiteTemplateVariant(template);
  const fromIndustry = resolveWebsiteTemplateVariant(industry);
  const variant =
    template?.trim() && fromTemplate !== "service-business" ? fromTemplate : fromIndustry;
  return variant === "beauty";
}
