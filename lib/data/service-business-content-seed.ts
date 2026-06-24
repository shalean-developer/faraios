import { resolveWebsiteTemplateVariant } from "@/lib/website-templates/variants";
import type { CreateWebsiteInput, WebsiteSectionSeed } from "@/lib/services/websites";

const PRICE_TIERS = ["From R299", "From R399", "From R449", "From R349", "From R499", "From R549"];

type IndustrySeed = {
  serviceLabel: string;
  location: string;
  heroSubtitle: string;
  aboutBody: string;
  testimonialItems: string[];
  defaultServices: { title: string; description: string }[];
  serviceAreas: string[];
};

const INDUSTRY_SEEDS: Record<string, IndustrySeed> = {
  cleaning: {
    serviceLabel: "Cleaning",
    location: "Cape Town & Surrounding Areas",
    heroSubtitle:
      "Trusted Cape Town cleaners with easy online booking, vetted professionals, and a satisfaction guarantee on every visit.",
    aboutBody:
      "We are a locally owned cleaning company serving homes and businesses across Cape Town and the surrounding areas. Our team arrives on time, brings professional supplies, and leaves your space spotless.",
    testimonialItems: [
      "Excellent service and very professional team. My home has never been this clean!",
      "Great communication from first contact to completion. Highly recommend.",
    ],
    defaultServices: [
      { title: "Home Cleaning", description: "Regular and deep cleans for houses and apartments." },
      { title: "Office Cleaning", description: "Reliable commercial cleaning for workspaces." },
      { title: "Move-in / Move-out", description: "Thorough cleans for tenants and property managers." },
      { title: "Carpet Cleaning", description: "Steam and stain treatment for carpets and rugs." },
      { title: "Window Cleaning", description: "Interior and exterior window washing." },
      { title: "Post-construction", description: "Dust and debris removal after renovations." },
    ],
    serviceAreas: [
      "Sea Point",
      "Camps Bay",
      "Claremont",
      "Bellville",
      "Durbanville",
      "Constantia",
      "Fish Hoek",
      "Somerset West",
    ],
  },
  plumbing: {
    serviceLabel: "Expert Plumbing",
    location: "Greater Metro Area",
    heroSubtitle:
      "Fast-response plumbers for repairs, installations, and maintenance — with upfront pricing and reliable workmanship.",
    aboutBody:
      "Our licensed plumbers handle everything from emergency leaks to full fixture installations. We show up prepared, explain the work clearly, and stand behind every job.",
    testimonialItems: [
      "Quick response and quality workmanship. Fixed the leak on the first visit.",
      "Honest pricing and a professional team. Will use again.",
    ],
    defaultServices: [
      { title: "Leak Repair", description: "Fast diagnosis and repair for pipes and fittings." },
      { title: "Drain Clearing", description: "Blocked drains cleared with professional equipment." },
      { title: "Geyser Services", description: "Installation, repair, and replacement." },
      { title: "Bathroom Plumbing", description: "Toilets, basins, showers, and pipe work." },
      { title: "Kitchen Plumbing", description: "Sinks, dishwashers, and appliance connections." },
      { title: "Emergency Call-out", description: "Same-day response for urgent plumbing issues." },
    ],
    serviceAreas: ["Sandton", "Midrand", "Centurion", "Fourways", "Randburg", "Roodepoort", "Alberton", "Benoni"],
  },
  gym: {
    serviceLabel: "Personal Training",
    location: "Your City",
    heroSubtitle:
      "Structured coaching programs focused on measurable progress, supportive trainers, and flexible scheduling.",
    aboutBody:
      "Our coaches help members build sustainable habits and hit their fitness goals with personalised programs and consistent accountability.",
    testimonialItems: [
      "Supportive coaching and great energy in every session.",
      "I saw real progress in the first month.",
    ],
    defaultServices: [
      { title: "Personal Training", description: "One-on-one sessions tailored to your goals." },
      { title: "Group Classes", description: "High-energy classes for all fitness levels." },
      { title: "Nutrition Guidance", description: "Practical meal planning and habit coaching." },
      { title: "Strength Programs", description: "Structured lifting plans with progression tracking." },
      { title: "Weight Loss Coaching", description: "Sustainable fat-loss programs with support." },
      { title: "Corporate Wellness", description: "Team fitness packages for local businesses." },
    ],
    serviceAreas: ["CBD", "Northern Suburbs", "Southern Suburbs", "East", "West"],
  },
  beauty: {
    serviceLabel: "Beauty & Spa",
    location: "Cape Town & Surrounding Areas",
    heroSubtitle:
      "Luxury treatments, skilled therapists, and a calm spa experience — book facials, massage, and wellness services online.",
    aboutBody:
      "We create a relaxing escape with professional beauty and spa services tailored to your skin, body, and schedule.",
    testimonialItems: [
      "Absolutely luxurious experience — left feeling completely refreshed.",
      "Professional staff and beautiful atmosphere. My new favourite spa.",
    ],
    defaultServices: [
      { title: "Swedish Massage", description: "Full-body relaxation massage." },
      { title: "Deep Tissue Massage", description: "Targeted relief for tension and sore muscles." },
      { title: "Classic Facial", description: "Deep cleanse, exfoliation, and hydration." },
      { title: "Manicure & Pedicure", description: "Nail care with premium products." },
      { title: "Couples Spa Package", description: "Side-by-side treatments for two." },
      { title: "Bridal Beauty", description: "Pre-event hair, makeup, and skin prep." },
    ],
    serviceAreas: ["Sea Point", "Camps Bay", "Claremont", "Constantia", "Stellenbosch", "Somerset West"],
  },
  technology: {
    serviceLabel: "IT Support",
    location: "Greater Metro Area",
    heroSubtitle:
      "Fast IT support for homes and businesses — remote troubleshooting, on-site repairs, and network setup with clear pricing.",
    aboutBody:
      "Our certified technicians solve device, network, and software problems quickly so you can get back to work.",
    testimonialItems: [
      "Fixed our office network the same day. Highly professional team.",
      "Clear communication and fair pricing. Will use again for all IT issues.",
    ],
    defaultServices: [
      { title: "Remote IT Support", description: "Fast remote troubleshooting for software issues." },
      { title: "On-site Repair", description: "Hardware diagnostics and repair at your location." },
      { title: "Network Setup", description: "Wi-Fi, routers, and office network configuration." },
      { title: "Data Recovery", description: "Recover files from failed drives and devices." },
      { title: "Cybersecurity Check", description: "Security audit and hardening for small teams." },
      { title: "Managed IT Plans", description: "Monthly support for growing businesses." },
    ],
    serviceAreas: ["Sandton", "Midrand", "Centurion", "Fourways", "Randburg", "Roodepoort"],
  },
  tourism: {
    serviceLabel: "Tours & Travel",
    location: "South Africa",
    heroSubtitle:
      "Curated day tours, safari experiences, and custom itineraries — book unforgettable local adventures online.",
    aboutBody:
      "We connect travellers with authentic local experiences led by knowledgeable guides who know the region inside out.",
    testimonialItems: [
      "An unforgettable safari — the guide was incredible and very knowledgeable.",
      "Well organised tour with stunning views. Booking online was effortless.",
    ],
    defaultServices: [
      { title: "City Day Tour", description: "Half-day guided tour of top landmarks." },
      { title: "Safari Experience", description: "Game drives with experienced rangers." },
      { title: "Wine Route Tour", description: "Scenic vineyard visits and tastings." },
      { title: "Adventure Package", description: "Hiking, kayaking, and outdoor activities." },
      { title: "Custom Itinerary", description: "Tailored multi-day travel planning." },
      { title: "Airport Transfers", description: "Reliable pickup and drop-off service." },
    ],
    serviceAreas: ["Cape Town", "Johannesburg", "Durban", "Garden Route", "Kruger", "Stellenbosch"],
  },
};

const DEFAULT_SEED: IndustrySeed = {
  serviceLabel: "Professional Services",
  location: "Your Local Area",
  heroSubtitle:
    "Trusted local professionals with easy online booking, clear pricing, and satisfaction guaranteed.",
  aboutBody:
    "We focus on quality delivery, customer-first support, and consistent outcomes for every client we serve.",
  testimonialItems: [
    "Professional team and smooth experience from start to finish.",
    "Great results and excellent support. Would recommend to neighbours.",
  ],
  defaultServices: [
    { title: "On-site Service", description: "Professional service at your home or business." },
    { title: "Consultation", description: "Expert advice and a clear plan before we start." },
    { title: "Maintenance", description: "Ongoing support to keep things running smoothly." },
    { title: "Emergency Call-out", description: "Fast response when you need help urgently." },
    { title: "Commercial Service", description: "Reliable service for offices and workplaces." },
    { title: "Residential Service", description: "Trusted service for homes and families." },
  ],
  serviceAreas: ["CBD", "Northern Suburbs", "Southern Suburbs", "East", "West", "Midrand"],
};

function parseContactInfo(raw: string): { phone: string; email: string; details: string } {
  const details = raw.trim();
  const emailMatch = details.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const phoneMatch = details.match(/(\+?\d[\d\s()-]{8,}\d)/);
  return {
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0]?.trim() ?? "",
    details,
  };
}

function locationTrustBadge(location: string, serviceLabel: string): string {
  const primary = location.split("&")[0].trim();
  return `${primary.toUpperCase()}'S TRUSTED ${serviceLabel.toUpperCase()}`;
}

export function buildServiceBusinessContentSeed(input: CreateWebsiteInput): WebsiteSectionSeed[] {
  const industry = resolveWebsiteTemplateVariant(input.industry);
  const seed = INDUSTRY_SEEDS[industry] ?? DEFAULT_SEED;
  const businessName = input.businessName.trim();
  const contactParsed = parseContactInfo(input.contactInfo);

  const customServices = input.services
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const serviceItems =
    customServices.length > 0
      ? customServices.map((title, index) => ({
          title,
          description: "",
          priceFrom: PRICE_TIERS[index % PRICE_TIERS.length],
          image: "",
          imageAlt: title,
        }))
      : seed.defaultServices.map((service, index) => ({
          ...service,
          priceFrom: PRICE_TIERS[index % PRICE_TIERS.length],
          image: "",
          imageAlt: service.title,
        }));

  const location = input.location?.trim() || seed.location;
  const startingPrice = PRICE_TIERS[0];

  return [
    {
      section: "theme",
      content: {
        primaryColor: "#002147",
        accentColor: "#0056D2",
      },
    },
    {
      section: "topbar",
      content: {
        serviceArea: location,
        hours: "Mon–Sat: 8:00 AM – 6:00 PM",
        phone: contactParsed.phone,
        email: contactParsed.email,
        tagline: "CLEAN SPACES. BETTER LIVES.",
      },
    },
    {
      section: "hero",
      content: {
        businessName,
        location,
        badge: locationTrustBadge(location, seed.serviceLabel),
        headline: `Professional ${seed.serviceLabel} in ${location}`,
        subtitle: seed.heroSubtitle,
        startingPrice,
        trustBullets: [
          "Verified, background-checked professionals",
          "Easy online booking in under 2 minutes",
          "Satisfaction guaranteed on every job",
        ],
        ctaLabel: "Book a Service",
        ctaHref: "/contact",
        ctaSecondaryLabel: "Get Free Quote",
        ctaSecondaryHref: "/contact",
        quoteCtaLabel: "Get Free Quote",
        quoteCtaHref: "/contact",
        rating: "4.9",
        ratingCount: "120+ Google reviews",
        image: "",
        imageAlt: `${businessName} hero`,
        floatingStatValue: "100+",
        floatingStatLabel: "Happy customers",
      },
    },
    {
      section: "serviceChips",
      content: {
        items: serviceItems.slice(0, 6).map((s) => ({
          title: s.title,
          priceFrom: s.priceFrom,
        })),
      },
    },
    {
      section: "trustBand",
      content: {
        items: [
          { title: "Background-checked professionals", description: "Vetted team you can trust at your door." },
          { title: "Eco-friendly products", description: "Safe for families, pets, and workspaces." },
          { title: "Satisfaction guarantee", description: "We make it right if you're not happy." },
          { title: "Flexible & reliable", description: "Book times that fit your schedule." },
        ],
      },
    },
    {
      section: "services",
      content: {
        heading: "Our Services",
        subtitle: "Professional services with transparent pricing and fast online booking.",
        items: serviceItems,
      },
    },
    {
      section: "about",
      content: {
        heading: "About Us",
        body: seed.aboutBody,
        image: "",
        imageAlt: `${businessName} team`,
      },
    },
    {
      section: "whyChooseUs",
      content: {
        heading: "Trusted by Local Customers",
        body: seed.aboutBody,
        ctaLabel: "Book a Service",
        ctaHref: "/contact",
        whatsapp: contactParsed.phone.replace(/\D/g, ""),
        image: "",
        imageAlt: `${businessName} team`,
        benefits: [
          { title: "Local team", description: "We know your area and respond fast." },
          { title: "Upfront pricing", description: "Clear quotes before we start." },
          { title: "Quality guaranteed", description: "Professional results every visit." },
          { title: "Easy booking", description: "Book online in under two minutes." },
        ],
      },
    },
    {
      section: "socialProof",
      content: {
        establishedYear: "2022",
        jobsCompleted: "2,500+",
        satisfactionRate: "98%",
        responseTime: "2hr",
        reviewQuote: seed.testimonialItems[0],
        reviewAuthor: "Verified Google Review",
        googleReviews: "120+ verified Google reviews",
      },
    },
    {
      section: "howItWorks",
      content: {
        heading: "From Booking to Done",
        steps: [
          { title: "Book online", description: "Choose your service and preferred time slot." },
          { title: "We confirm", description: "We confirm details and your arrival window." },
          { title: "Service delivered", description: "Our team completes the job professionally." },
          { title: "You review", description: "Share feedback — your opinion matters to us." },
        ],
      },
    },
    {
      section: "faq",
      content: {
        heading: "Frequently Asked Questions",
        body: "Quick answers about booking, pricing, supplies, and availability.",
        ctaLabel: "Still have questions? Contact us",
        items: [
          {
            question: "How do I book a service?",
            answer:
              "Click Book Now, choose your service and time, and we'll confirm your appointment by phone or email.",
          },
          {
            question: "What are your prices?",
            answer:
              "Pricing depends on the service and property size. Starting prices are shown on each service card.",
          },
          {
            question: "Do you bring supplies and equipment?",
            answer:
              "Yes — our team arrives with professional equipment and products unless you request otherwise.",
          },
          {
            question: "Can I reschedule my booking?",
            answer:
              "Absolutely. Contact us at least 24 hours before your appointment to reschedule at no extra charge.",
          },
          {
            question: "Is same-day service available?",
            answer:
              "Same-day slots are limited. Book early or call us — we'll do our best to fit you in.",
          },
        ],
      },
    },
    {
      section: "serviceAreas",
      content: {
        heading: `Services Across ${location}`,
        intro: `We proudly serve ${location} and surrounding suburbs with reliable, professional service you can book online.`,
        popular: location.toLowerCase().includes("cape town")
          ? ["Cape Town CBD", "Northern Suburbs", "Southern Suburbs"]
          : ["CBD", "Northern Suburbs", "Southern Suburbs"],
        areas: seed.serviceAreas,
        ctaLabel: "Check availability in your area",
      },
    },
    {
      section: "cta",
      content: {
        heading: "Ready to Book a Trusted Professional?",
        body: "Get reliable service with easy online booking and a team that stands behind every job.",
        primaryLabel: "Book Now",
        primaryHref: "/contact",
        secondaryLabel: "Get Free Quote",
        secondaryHref: "/contact",
        guaranteeText: "Satisfaction guaranteed on every job.",
      },
    },
    {
      section: "testimonials",
      content: {
        heading: "Testimonials",
        items: seed.testimonialItems,
      },
    },
    {
      section: "contact",
      content: {
        heading: "Contact Us",
        phone: contactParsed.phone,
        email: contactParsed.email,
        address: location,
        details: contactParsed.details,
      },
    },
    {
      section: "footer",
      content: {
        description: `Professional ${seed.serviceLabel.toLowerCase()} in ${location}. Book online for fast, reliable results.`,
        serviceLinks: serviceItems.slice(0, 5).map((s) => s.title),
        companyLinks: ["About", "Reviews", "Service Areas", "Contact"],
        resourceLinks: ["How It Works", "Pricing", "FAQ"],
        supportLinks: ["Contact", "Privacy Policy", "Terms of Service"],
      },
    },
  ];
}
