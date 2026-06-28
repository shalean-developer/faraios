import type { WebsiteContent } from "@/types/database";

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export type ServiceCard = {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  priceFrom?: string;
};

export type FaqItem = { question: string; answer: string };
export type StepItem = { title: string; description: string };
export type BenefitItem = { title: string; description: string };
export type ChipItem = { title: string; priceFrom: string };

function parseContactDetails(raw: string): { phone: string; email: string } {
  const details = raw.trim();
  const emailMatch = details.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const phoneMatch = details.match(/(\+?\d[\d\s()-]{8,}\d)/);
  return {
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0]?.trim() ?? "",
  };
}

function mapServiceItems(raw: unknown): ServiceCard[] {
  if (!Array.isArray(raw)) return [];
  const items: ServiceCard[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      items.push({ title: item, description: "" });
      continue;
    }
    if (typeof item !== "object" || !item) continue;
    const record = item as Record<string, unknown>;
    const title = asString(record.title);
    if (!title) continue;
    const image = asString(record.image, asString(record.imageUrl));
    items.push({
      title,
      description: asString(record.description),
      image: image || undefined,
      imageAlt: asString(record.imageAlt, title),
      priceFrom: asString(record.priceFrom, asString(record.price)),
    });
  }
  return items;
}

function mapFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const question = asString(record.question);
      const answer = asString(record.answer);
      if (!question) return null;
      return { question, answer };
    })
    .filter((item): item is FaqItem => item !== null);
}

function mapSteps(raw: unknown): StepItem[] {
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
    .filter((item): item is StepItem => item !== null);
}

function mapBenefits(raw: unknown): BenefitItem[] {
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
    .filter((item): item is BenefitItem => item !== null);
}

function mapChips(raw: unknown, services: ServiceCard[]): ChipItem[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((item) => {
        if (typeof item !== "object" || !item) return null;
        const record = item as Record<string, unknown>;
        const title = asString(record.title);
        if (!title) return null;
        return { title, priceFrom: asString(record.priceFrom, "From R299") };
      })
      .filter((item): item is ChipItem => item !== null);
  }
  return services.slice(0, 6).map((s) => ({
    title: s.title,
    priceFrom: s.priceFrom || "From R299",
  }));
}

export type ParsedSiteContent = {
  businessName: string;
  theme: { primary: string; accent: string };
  topbar: {
    serviceArea: string;
    hours: string;
    phone: string;
    email: string;
    tagline: string;
    logo: string;
    hideBusinessNameInHeader: boolean;
    socialFacebook: string;
    socialInstagram: string;
    socialWhatsapp: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    location: string;
    startingPrice: string;
    trustBullets: string[];
    ctaLabel: string;
    ctaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    quoteCtaLabel: string;
    quoteCtaHref: string;
    rating: string;
    ratingCount: string;
    image: string;
    imageAlt: string;
    floatingStatValue: string;
    floatingStatLabel: string;
  };
  serviceChips: ChipItem[];
  trustBand: BenefitItem[];
  services: {
    heading: string;
    subtitle: string;
    items: ServiceCard[];
  };
  whyChooseUs: {
    heading: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    whatsapp: string;
    image: string;
    imageAlt: string;
    benefits: BenefitItem[];
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
  howItWorks: { heading: string; steps: StepItem[] };
  faq: { heading: string; body: string; ctaLabel: string; items: FaqItem[] };
  serviceAreas: {
    heading: string;
    intro: string;
    popular: string[];
    areas: string[];
    ctaLabel: string;
  };
  finalCta: {
    heading: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    guaranteeText: string;
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
    serviceLinks: string[];
    companyLinks: string[];
    resourceLinks: string[];
    supportLinks: string[];
  };
};

function section(content: WebsiteContent[], name: string): Record<string, unknown> {
  return content.find((c) => c.section === name)?.content ?? {};
}

export function parseSiteContent(content: WebsiteContent[]): ParsedSiteContent {
  const theme = section(content, "theme");
  const topbar = section(content, "topbar");
  const hero = section(content, "hero");
  const serviceChipsSection = section(content, "serviceChips");
  const trustBandSection = section(content, "trustBand");
  const servicesSection = section(content, "services");
  const about = section(content, "about");
  const whyChooseUs = section(content, "whyChooseUs");
  const socialProof = section(content, "socialProof");
  const howItWorks = section(content, "howItWorks");
  const faq = section(content, "faq");
  const serviceAreas = section(content, "serviceAreas");
  const cta = section(content, "cta");
  const contact = section(content, "contact");
  const footer = section(content, "footer");
  const testimonials = section(content, "testimonials");

  const businessName = asString(hero.businessName, asString(hero.title, "Your Business"));
  const location = asString(hero.location, asString(topbar.serviceArea, "Your area"));
  const serviceItems = mapServiceItems(servicesSection.items);
  const heroImage = asString(hero.image, asString(hero.imageUrl));
  const aboutImage = asString(about.image, asString(about.imageUrl, heroImage));

  const contactPhone = asString(
    contact.phone,
    parseContactDetails(asString(contact.details)).phone
  );
  const contactEmail = asString(
    contact.email,
    parseContactDetails(asString(contact.details)).email
  );
  const testimonialItems = Array.isArray(testimonials.items)
    ? testimonials.items.filter((i): i is string => typeof i === "string")
    : [];

  return {
    businessName,
    theme: {
      primary: asString(theme.primaryColor, "#002147"),
      accent: asString(theme.accentColor, "#2563eb"),
    },
    topbar: {
      serviceArea: asString(topbar.serviceArea, location),
      hours: asString(topbar.hours, "Mon–Sat: 8:00 AM – 6:00 PM"),
      phone: asString(topbar.phone, contactPhone),
      email: asString(topbar.email, contactEmail),
      tagline: asString(topbar.tagline, "CLEAN SPACES. BETTER LIVES."),
      logo: asString(topbar.logo, asString(topbar.logoUrl)),
      hideBusinessNameInHeader: asBoolean(topbar.hideBusinessNameInHeader),
      socialFacebook: asString(topbar.facebook),
      socialInstagram: asString(topbar.instagram),
      socialWhatsapp: asString(topbar.whatsapp),
    },
    hero: {
      badge: asString(hero.badge, `Serving ${location}`),
      title: asString(
        hero.headline,
        asString(hero.title, `${businessName} in ${location}`)
      ),
      subtitle: asString(
        hero.subtitle,
        "Trusted local professionals with easy online booking and satisfaction guaranteed."
      ),
      location,
      startingPrice: asString(hero.startingPrice, "From R299"),
      trustBullets: asStringArray(hero.trustBullets).length
        ? asStringArray(hero.trustBullets)
        : [
            "Verified, background-checked professionals",
            "Easy online booking",
            "Satisfaction guaranteed",
          ],
      ctaLabel: asString(hero.ctaLabel, "Book a Service"),
      ctaHref: asString(hero.ctaHref, "/contact"),
      secondaryCtaLabel: asString(hero.ctaSecondaryLabel, "Get Free Quote"),
      secondaryCtaHref: asString(hero.ctaSecondaryHref, "/contact"),
      quoteCtaLabel: asString(hero.quoteCtaLabel, "Get Free Quote"),
      quoteCtaHref: asString(hero.quoteCtaHref, "/contact"),
      rating: asString(hero.rating, "4.9"),
      ratingCount: asString(hero.ratingCount, "120+ Google reviews"),
      image: heroImage,
      imageAlt: asString(hero.imageAlt, businessName),
      floatingStatValue: asString(hero.floatingStatValue, "100+"),
      floatingStatLabel: asString(hero.floatingStatLabel, "Happy customers"),
    },
    serviceChips: mapChips(serviceChipsSection.items, serviceItems),
    trustBand: mapBenefits(trustBandSection.items).length
      ? mapBenefits(trustBandSection.items)
      : [
          { title: "Background-checked professionals", description: "Vetted team you can trust at your door." },
          { title: "Eco-friendly products", description: "Safe for families, pets, and workspaces." },
          { title: "Satisfaction guarantee", description: "We make it right if you're not happy." },
          { title: "Flexible & reliable", description: "Book times that fit your schedule." },
        ],
    services: {
      heading: asString(servicesSection.heading, "Our Services"),
      subtitle: asString(
        servicesSection.subtitle,
        "Professional services with transparent pricing and fast booking."
      ),
      items: serviceItems,
    },
    whyChooseUs: {
      heading: asString(whyChooseUs.heading, "Trusted by Local Customers"),
      body: asString(whyChooseUs.body, asString(about.body)),
      ctaLabel: asString(whyChooseUs.ctaLabel, "Book a Service"),
      ctaHref: asString(whyChooseUs.ctaHref, "/contact"),
      whatsapp: asString(whyChooseUs.whatsapp, contactPhone.replace(/\s+/g, "")),
      image: asString(whyChooseUs.image, aboutImage),
      imageAlt: asString(whyChooseUs.imageAlt, businessName),
      benefits: mapBenefits(whyChooseUs.benefits).length
        ? mapBenefits(whyChooseUs.benefits)
        : [
            { title: "Local team", description: "We know your area and respond fast." },
            { title: "Upfront pricing", description: "Clear quotes before we start." },
            { title: "Quality guaranteed", description: "Professional results every visit." },
            { title: "Easy booking", description: "Book online in under two minutes." },
          ],
    },
    socialProof: {
      establishedYear: asString(socialProof.establishedYear, "2016"),
      jobsCompleted: asString(socialProof.jobsCompleted, "2,500+"),
      satisfactionRate: asString(socialProof.satisfactionRate, "98%"),
      responseTime: asString(socialProof.responseTime, "2hr"),
      reviewQuote: asString(
        socialProof.reviewQuote,
        testimonialItems[0] ?? "Excellent service and very professional team."
      ),
      reviewAuthor: asString(socialProof.reviewAuthor, "Verified Google Review"),
      googleReviews: asString(socialProof.googleReviews, asString(hero.ratingCount, "120+ reviews")),
    },
    howItWorks: {
      heading: asString(howItWorks.heading, "From Booking to Done"),
      steps: mapSteps(howItWorks.steps).length
        ? mapSteps(howItWorks.steps)
        : [
            { title: "Book online", description: "Choose your service and preferred time." },
            { title: "We confirm", description: "We confirm details and arrival window." },
            { title: "Service delivered", description: "Our team completes the job professionally." },
            { title: "You review", description: "Tell us how we did — your feedback matters." },
          ],
    },
    faq: {
      heading: asString(faq.heading, "Frequently Asked Questions"),
      body: asString(faq.body, "Quick answers about booking, pricing, and availability."),
      ctaLabel: asString(faq.ctaLabel, "Still have questions? Contact us"),
      items: mapFaqItems(faq.items).length
        ? mapFaqItems(faq.items)
        : [
            {
              question: "How do I book a service?",
              answer: "Use the Book Now button, choose your service, and we'll confirm your appointment.",
            },
            {
              question: "What are your prices?",
              answer: "Pricing depends on the service and property size. You'll see starting prices on each service card.",
            },
            {
              question: "Do you bring supplies?",
              answer: "Yes — our team arrives with professional equipment and products unless you request otherwise.",
            },
            {
              question: "Can I reschedule?",
              answer: "Absolutely. Contact us at least 24 hours before your appointment to reschedule at no extra charge.",
            },
            {
              question: "Is same-day service available?",
              answer: "Same-day slots are limited. Book early or call us — we'll do our best to fit you in.",
            },
          ],
    },
    serviceAreas: {
      heading: asString(serviceAreas.heading, `Services Across ${location}`),
      intro: asString(
        serviceAreas.intro,
        `We proudly serve ${location} and surrounding suburbs with reliable, professional service.`
      ),
      popular: asStringArray(serviceAreas.popular).length
        ? asStringArray(serviceAreas.popular)
        : ["CBD", "Northern Suburbs", "Southern Suburbs"],
      areas: asStringArray(serviceAreas.areas).length
        ? asStringArray(serviceAreas.areas)
        : ["Sandton", "Rosebank", "Midrand", "Centurion", "Fourways", "Randburg"],
      ctaLabel: asString(serviceAreas.ctaLabel, "Check availability in your area"),
    },
    finalCta: {
      heading: asString(cta.heading, "Ready to Book a Trusted Professional?"),
      body: asString(cta.body, "Get reliable service with easy online booking."),
      primaryLabel: asString(cta.primaryLabel, asString(hero.ctaLabel, "Book Now")),
      primaryHref: asString(cta.primaryHref, "/contact"),
      secondaryLabel: asString(cta.secondaryLabel, "Get Free Quote"),
      secondaryHref: asString(cta.secondaryHref, "/contact"),
      guaranteeText: asString(
        cta.guaranteeText,
        "Satisfaction guaranteed on every job."
      ),
    },
    contact: {
      heading: asString(contact.heading, "Contact"),
      phone: contactPhone,
      email: contactEmail,
      address: asString(contact.address),
      details: asString(contact.details),
    },
    footer: {
      description: asString(
        footer.description,
        `Professional local service in ${location}. Book online for fast, reliable results.`
      ),
      serviceLinks: asStringArray(footer.serviceLinks).length
        ? asStringArray(footer.serviceLinks)
        : serviceItems.slice(0, 5).map((s) => s.title),
      companyLinks: asStringArray(footer.companyLinks).length
        ? asStringArray(footer.companyLinks)
        : ["About", "Reviews", "Service Areas", "Contact"],
      resourceLinks: asStringArray(footer.resourceLinks).length
        ? asStringArray(footer.resourceLinks)
        : ["How It Works", "Pricing", "FAQ"],
      supportLinks: asStringArray(footer.supportLinks).length
        ? asStringArray(footer.supportLinks)
        : ["FAQ", "Privacy Policy", "Terms of Service"],
    },
  };
}
