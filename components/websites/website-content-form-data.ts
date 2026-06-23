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

export type WebsiteContentFormData = {
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  topbar: {
    serviceArea: string;
    hours: string;
    phone: string;
    email: string;
    facebook: string;
    instagram: string;
  };
  hero: {
    businessName: string;
    headline: string;
    subtitle: string;
    location: string;
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
  };
  whyChooseUs: {
    heading: string;
    body: string;
    ctaLabel: string;
    whatsapp: string;
    image: string;
    imageAlt: string;
    benefits: TitleDescriptionItem[];
  };
  socialProof: {
    establishedYear: string;
    jobsCompleted: string;
    reviewQuote: string;
    reviewAuthor: string;
    googleReviews: string;
  };
  howItWorks: {
    heading: string;
    steps: StepFormItem[];
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
    serviceLinks: string;
    companyLinks: string;
    supportLinks: string;
  };
};

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
    },
    topbar: {
      serviceArea: asString(topbar.serviceArea),
      hours: asString(topbar.hours, "Mon–Sat: 8:00 AM – 6:00 PM"),
      phone: asString(topbar.phone, asString(contact.phone)),
      email: asString(topbar.email, asString(contact.email)),
      facebook: asString(topbar.facebook),
      instagram: asString(topbar.instagram),
    },
    hero: {
      businessName: asString(hero.businessName, headline),
      headline,
      subtitle: asString(hero.subtitle),
      location: asString(hero.location, asString(topbar.serviceArea)),
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
    },
    whyChooseUs: {
      heading: asString(whyChooseUs.heading, "Trusted by Local Customers"),
      body: asString(whyChooseUs.body, asString(about.body)),
      ctaLabel: asString(whyChooseUs.ctaLabel, "Book a Service"),
      whatsapp: asString(whyChooseUs.whatsapp),
      image: readImageField(whyChooseUs) || readImageField(about),
      imageAlt: asString(whyChooseUs.imageAlt),
      benefits: toTitleDescriptionItems(whyChooseUs.benefits),
    },
    socialProof: {
      establishedYear: asString(socialProof.establishedYear, "2016"),
      jobsCompleted: asString(socialProof.jobsCompleted, "2,500+"),
      reviewQuote: asString(socialProof.reviewQuote),
      reviewAuthor: asString(socialProof.reviewAuthor, "Verified Google Review"),
      googleReviews: asString(socialProof.googleReviews, "120+ verified Google reviews"),
    },
    howItWorks: {
      heading: asString(howItWorks.heading, "From Booking to Done"),
      steps: toStepItems(howItWorks.steps),
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
      serviceLinks: linesToString(footer.serviceLinks),
      companyLinks: linesToString(footer.companyLinks),
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
  faq: Record<string, unknown>;
  serviceAreas: Record<string, unknown>;
  cta: Record<string, unknown>;
  contact: Record<string, unknown>;
  footer: Record<string, unknown>;
};

export function websiteContentFormDataToPayload(
  form: WebsiteContentFormData,
  extended: boolean
): Record<string, Record<string, unknown>> {
  const trustBullets = stringToLines(form.hero.trustBullets);

  const full: WebsiteContentSavePayload = {
    theme: {
      primaryColor: form.theme.primaryColor.trim(),
      accentColor: form.theme.accentColor.trim(),
    },
    topbar: {
      serviceArea: form.topbar.serviceArea.trim(),
      hours: form.topbar.hours.trim(),
      phone: form.topbar.phone.trim(),
      email: form.topbar.email.trim(),
      facebook: form.topbar.facebook.trim(),
      instagram: form.topbar.instagram.trim(),
    },
    hero: {
      businessName: form.hero.businessName.trim(),
      headline: form.hero.headline.trim(),
      title: form.hero.headline.trim(),
      subtitle: form.hero.subtitle.trim(),
      location: form.hero.location.trim(),
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
    },
    whyChooseUs: {
      heading: form.whyChooseUs.heading.trim(),
      body: form.whyChooseUs.body.trim(),
      ctaLabel: form.whyChooseUs.ctaLabel.trim(),
      ctaHref: "/contact",
      whatsapp: form.whyChooseUs.whatsapp.trim(),
      image: form.whyChooseUs.image.trim(),
      imageAlt: form.whyChooseUs.imageAlt.trim(),
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
      serviceLinks: stringToLines(form.footer.serviceLinks),
      companyLinks: stringToLines(form.footer.companyLinks),
      supportLinks: stringToLines(form.footer.supportLinks),
    },
  };

  if (extended) return full as unknown as Record<string, Record<string, unknown>>;

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

export function isServiceBusinessTemplate(template?: string | null): boolean {
  const key = (template ?? "").trim().toLowerCase();
  return key === "service-business" || key === "cleaning";
}
