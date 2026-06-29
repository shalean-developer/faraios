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
export type TransformSlideItem = {
  label: string;
  beforeImage: string;
  afterImage: string;
  thumbnailImage?: string;
};
export type TestimonialCard = {
  quote: string;
  name: string;
  company: string;
  avatar?: string;
};
export type BlogPostCard = {
  category: string;
  title: string;
  excerpt: string;
  image?: string;
  href?: string;
};

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

function mapTransformSlides(raw: unknown): TransformSlideItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const label = asString(record.label);
      const beforeImage = asString(record.beforeImage, asString(record.before));
      const afterImage = asString(record.afterImage, asString(record.after));
      if (!label || !beforeImage || !afterImage) return null;
      const thumbnailImage = asString(record.thumbnailImage, asString(record.thumbnail));
      return {
        label,
        beforeImage,
        afterImage,
        thumbnailImage: thumbnailImage || undefined,
      };
    })
    .filter((item): item is TransformSlideItem => item !== null);
}

function mapStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mapTestimonialCards(raw: unknown): TestimonialCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { quote: item, name: "", company: "" };
      }
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const quote = asString(record.quote, asString(record.text, asString(record.review)));
      const name = asString(record.name, asString(record.author));
      if (!quote) return null;
      return {
        quote,
        name,
        company: asString(record.company, asString(record.role)),
        avatar: asString(record.avatar, asString(record.image)) || undefined,
      };
    })
    .filter((item): item is TestimonialCard => item !== null && item.quote.length > 0);
}

function mapBlogPosts(raw: unknown): BlogPostCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      if (!title) return null;
      return {
        category: asString(record.category, "Insights"),
        title,
        excerpt: asString(record.excerpt, asString(record.description)),
        image: asString(record.image, asString(record.imageUrl)) || undefined,
        href: asString(record.href) || undefined,
      };
    })
    .filter((item): item is BlogPostCard => item !== null);
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
    socialTwitter: string;
    socialYoutube: string;
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
    ctaHref: string;
    whatsapp: string;
    image: string;
    imageAlt: string;
    imageSecondary: string;
    imageSecondaryAlt: string;
    badgeText: string;
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
  workProcess: { label: string; heading: string; steps: StepItem[] };
  featureBanner: { image: string; imageAlt: string };
  transformShowcase: {
    label: string;
    heading: string;
    body: string;
    features: string[];
    slides: TransformSlideItem[];
  };
  clientTestimonials: {
    label: string;
    heading: string;
    items: TestimonialCard[];
  };
  craftsmanship: {
    label: string;
    heading: string;
    body: string;
    features: string[];
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
    ctaHref: string;
    callCtaPrefix: string;
    callCtaPhone: string;
    posts: BlogPostCard[];
  };
  faq: { label: string; heading: string; body: string; ctaLabel: string; items: FaqItem[] };
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
    newsletterHeading: string;
    newsletterBody: string;
    copyrightName: string;
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
  const workProcess = section(content, "workProcess");
  const featureBanner = section(content, "featureBanner");
  const transformShowcase = section(content, "transformShowcase");
  const craftsmanship = section(content, "craftsmanship");
  const homeBlog = section(content, "homeBlog");
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
      socialTwitter: asString(topbar.twitter),
      socialYoutube: asString(topbar.youtube),
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
    about: {
      heading: asString(about.heading, "The Professionals Behind Renovations"),
      body: asString(about.body, ""),
      image: aboutImage,
      imageAlt: asString(about.imageAlt, businessName),
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
      ctaHref: asString(whyChooseUs.ctaHref, "/contact"),
      whatsapp: asString(whyChooseUs.whatsapp, contactPhone.replace(/\s+/g, "")),
      image: asString(whyChooseUs.image, aboutImage),
      imageAlt: asString(whyChooseUs.imageAlt, businessName),
      imageSecondary: asString(
        whyChooseUs.imageSecondary,
        asString(about.imageSecondary, asString(about.image))
      ),
      imageSecondaryAlt: asString(whyChooseUs.imageSecondaryAlt, "Our expert team"),
      badgeText: asString(whyChooseUs.badgeText, "Built with lasting quality"),
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
    workProcess: {
      label: asString(workProcess.label, "Our work process"),
      heading: asString(
        workProcess.heading,
        asString(howItWorks.heading, "Step-by-Step Home Transformations")
      ),
      steps: mapSteps(workProcess.steps).length
        ? mapSteps(workProcess.steps)
        : mapSteps(howItWorks.steps).length >= 3
          ? mapSteps(howItWorks.steps).slice(0, 3)
          : [
              {
                title: "Every detail reflects our expertise",
                description:
                  "Every detail reflects our expertise. From the initial planning to the final touches we focus on quality craftsmanship.",
              },
              {
                title: "We build homes with care",
                description:
                  "We build homes with care. Every project is handled with attention, precision, and dedication to quality.",
              },
              {
                title: "Crafting spaces that inspire joy",
                description:
                  "Crafting spaces that inspire joy. We design and build every area with creativity, care, and attention.",
              },
            ],
    },
    featureBanner: {
      image: asString(
        featureBanner.image,
        asString(featureBanner.imageUrl, "/images/team-edlick/painting-banner.png")
      ),
      imageAlt: asString(
        featureBanner.imageAlt,
        "Professional painting and home renovation services"
      ),
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
      features: mapStringList(transformShowcase.features).length
        ? mapStringList(transformShowcase.features)
        : ["Green Home Upgrade", "Smart Home Renovation"],
      slides: mapTransformSlides(transformShowcase.slides),
    },
    clientTestimonials: {
      label: asString(testimonials.label, "Clients Love Us"),
      heading: asString(testimonials.heading, "Trusted By Homeowners"),
      items: mapTestimonialCards(testimonials.items),
    },
    craftsmanship: {
      label: asString(craftsmanship.label, "Homes Made Perfect"),
      heading: asString(craftsmanship.heading, "Craftsmanship That Stands the Test"),
      body: asString(
        craftsmanship.body,
        "Expert Craftsmanship Guaranteed. Our skilled team brings years of experience and meticulous attention to every renovation project."
      ),
      features: mapStringList(craftsmanship.features).length
        ? mapStringList(craftsmanship.features)
        : [
            "Modern designs that enhance daily living",
            "Durable materials ensure long-lasting quality.",
          ],
      phoneLabel: asString(craftsmanship.phoneLabel, "Call us 24/7"),
      phone: asString(craftsmanship.phone, asString(topbar.phone, contactPhone)),
      image: asString(craftsmanship.image, asString(about.imageSecondary, aboutImage)),
      imageSecondary: asString(craftsmanship.imageSecondary, asString(about.imageTertiary)),
      imageTertiary: asString(craftsmanship.imageTertiary, asString(about.image, aboutImage)),
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
      ctaHref: asString(homeBlog.ctaHref, "/blog"),
      callCtaPrefix: asString(homeBlog.callCtaPrefix, "Need Help? Call Now :"),
      callCtaPhone: asString(homeBlog.callCtaPhone, asString(topbar.phone, contactPhone)),
      posts: mapBlogPosts(homeBlog.posts),
    },
    faq: {
      label: asString(faq.label, "FAQ"),
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
      newsletterHeading: asString(footer.newsletterHeading, "Stay Updated"),
      newsletterBody: asString(
        footer.newsletterBody,
        "Hey there! Join our newsletter for renovation tips, project ideas, and exclusive offers."
      ),
      copyrightName: asString(footer.copyrightName, businessName),
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
