/**
 * Pricing catalog — structured for a future `pricing_plans` (or similar) Supabase table:
 * id, name, setup_price, monthly_price, features (json), is_popular, slug, description
 */

export type PricingPlanRecord = {
  id: string;
  /** URL segment for `?plan=` (e.g. business → /get-started?plan=business) */
  slug: string;
  name: string;
  /** Legacy website setup tier amount — used for admin revenue; not shown on workspace cards */
  setup_price: number;
  monthly_price: number;
  /** Feature lines shown in the plan card */
  features: string[];
  /** Short audience labels for marketing cards */
  best_for: string[];
  /** Primary CTA label on pricing cards */
  cta_label: string;
  is_popular: boolean;
  description: string;
};

export const pricingPlans: PricingPlanRecord[] = [
  {
    id: "plan_starter",
    slug: "starter",
    name: "Starter",
    setup_price: 2000,
    monthly_price: 99,
    features: [
      "Business Workspace",
      "Customers CRM",
      "Services Management",
      "Bookings",
      "Calendar",
      "Basic Dashboard",
      "1 Team Member",
      "Email Support",
    ],
    best_for: [
      "Cleaning businesses",
      "Beauty professionals",
      "Freelancers",
      "Small service businesses",
    ],
    cta_label: "Start Starter Plan",
    is_popular: false,
    description: "Perfect for solo operators and small businesses.",
  },
  {
    id: "plan_business",
    slug: "business",
    name: "Business",
    setup_price: 3500,
    monthly_price: 199,
    features: [
      "Everything in Starter",
      "Quotes",
      "Invoices",
      "Payment Tracking",
      "Team Management",
      "Basic Analytics",
      "Up to 3 Team Members",
      "Priority Support",
    ],
    best_for: [
      "Growing service businesses",
      "Small teams",
      "Businesses handling multiple customers daily",
    ],
    cta_label: "Start Business Plan",
    is_popular: true,
    description: "For growing businesses that need sales and growth tools.",
  },
  {
    id: "plan_pro",
    slug: "pro",
    name: "Pro",
    setup_price: 5000,
    monthly_price: 399,
    features: [
      "Everything in Business",
      "Website Tools",
      "SEO Tools",
      "Marketing Tools",
      "Workflow Automations",
      "Recurring Bookings",
      "Advanced Analytics",
      "Up to 10 Team Members",
      "Priority Support",
    ],
    best_for: [
      "Multi-staff businesses",
      "Agencies",
      "Businesses scaling operations",
    ],
    cta_label: "Start Pro Plan",
    is_popular: false,
    description: "For established businesses that want automation and growth tools.",
  },
  {
    id: "plan_enterprise",
    slug: "enterprise",
    name: "Enterprise",
    setup_price: 0,
    monthly_price: 0,
    features: [
      "Everything in Pro",
      "Multi-Branch Support",
      "Advanced Permissions",
      "Custom Integrations",
      "Dedicated Account Manager",
      "Priority Support",
      "Custom SLA",
    ],
    best_for: [
      "Franchises",
      "Multi-location businesses",
      "Large organisations",
    ],
    cta_label: "Contact Sales",
    is_popular: false,
    description: "Custom pricing for organisations with advanced needs.",
  },
];

/** Slug passed to onboarding (`?plan=`) — single source of truth */
export type PricingPlanSlug = (typeof pricingPlans)[number]["slug"];

const LEGACY_PLAN_ALIASES: Record<string, PricingPlanSlug> = {
  premium: "pro",
};

export function normalizePlanSlug(
  raw: string | null | undefined
): PricingPlanSlug {
  const s = (raw ?? "").toLowerCase().trim();
  if (s in LEGACY_PLAN_ALIASES) {
    return LEGACY_PLAN_ALIASES[s]!;
  }
  const found = pricingPlans.find((p) => p.slug === s);
  return found ? found.slug : "starter";
}

/** Plans that can be purchased via Paystack checkout. */
export function isSelfServePlan(slug: PricingPlanSlug): boolean {
  return slug !== "enterprise";
}

export function planIdForSlug(slug: PricingPlanSlug): string {
  return pricingPlans.find((p) => p.slug === slug)?.id ?? "plan_starter";
}

export function planLabelForSlug(slug: PricingPlanSlug): string {
  return pricingPlans.find((p) => p.slug === slug)?.name ?? slug;
}

/** Max pages included per plan (`null` = unlimited). */
export function planPageLimit(slug: PricingPlanSlug): number | null {
  switch (slug) {
    case "starter":
      return 4;
    case "business":
      return 7;
    case "pro":
    case "enterprise":
      return null;
    default:
      return 4;
  }
}

export function planPageLimitLabel(slug: PricingPlanSlug): string {
  const limit = planPageLimit(slug);
  return limit === null ? "Unlimited pages" : `Up to ${limit} pages`;
}

export type WebsiteServiceRecord = {
  id: string;
  name: string;
  price: number;
  price_label?: string;
  features: string[];
};

export const websiteServices: WebsiteServiceRecord[] = [
  {
    id: "website_basic",
    name: "Basic Website",
    price: 2000,
    features: [
      "Professional Website",
      "Mobile Responsive",
      "Contact Forms",
      "Domain Connection",
    ],
  },
  {
    id: "website_business",
    name: "Business Website",
    price: 3500,
    features: [
      "Multi-Page Website",
      "Booking Integration",
      "Basic SEO Setup",
      "Analytics Setup",
    ],
  },
  {
    id: "website_custom",
    name: "Custom Website",
    price: 5000,
    price_label: "Starting from R5,000",
    features: [
      "Fully Custom Design",
      "Advanced Features",
      "Custom Integrations",
    ],
  },
];

export type HostingAddOnRecord = {
  id: string;
  name: string;
  monthly_price: number;
};

export const hostingAddOns: HostingAddOnRecord[] = [
  { id: "hosting_starter", name: "Starter Hosting", monthly_price: 49 },
  { id: "hosting_business", name: "Business Hosting", monthly_price: 99 },
  { id: "hosting_premium", name: "Premium Hosting", monthly_price: 199 },
];

export type GrowthServiceRecord = {
  id: string;
  name: string;
  price: number;
  price_label?: string;
  billing: "once" | "monthly";
};

export const growthServices: GrowthServiceRecord[] = [
  {
    id: "growth_seo_setup",
    name: "SEO Setup",
    price: 1500,
    billing: "once",
  },
  {
    id: "growth_monthly_seo",
    name: "Monthly SEO",
    price: 999,
    price_label: "Starting from R999/month",
    billing: "monthly",
  },
  {
    id: "growth_google_ads",
    name: "Google Ads Management",
    price: 1500,
    price_label: "Starting from R1,500/month",
    billing: "monthly",
  },
  {
    id: "growth_content",
    name: "Content Marketing",
    price: 999,
    price_label: "Starting from R999/month",
    billing: "monthly",
  },
];

export type TrustBadgeRecord = {
  id: string;
  label: string;
  sub: string;
  icon: "lock" | "badge" | "headphones" | "globe" | "card";
};

export const trustBadges: TrustBadgeRecord[] = [
  {
    id: "secure",
    label: "Secure Payment",
    sub: "SSL encrypted checkout",
    icon: "lock",
  },
  {
    id: "nohidden",
    label: "No Hidden Fees",
    sub: "Transparent pricing always",
    icon: "badge",
  },
  {
    id: "support",
    label: "Dedicated Support",
    sub: "Real humans, fast replies",
    icon: "headphones",
  },
  {
    id: "workspace",
    label: "Workspace First",
    sub: "Run your business from day one",
    icon: "globe",
  },
  {
    id: "flexible",
    label: "Pay for What You Need",
    sub: "Websites and hosting are optional",
    icon: "card",
  },
];

export type FaqItemRecord = {
  id: string;
  question: string;
  answer: string;
};

export const faqItems: FaqItemRecord[] = [
  {
    id: "faq-1",
    question: "Do I need a website?",
    answer:
      "No. You can use FaraiOS as your business workspace without purchasing a website.",
  },
  {
    id: "faq-2",
    question: "Can I connect my existing website?",
    answer:
      "Yes. FaraiOS can connect to an existing website and manage bookings, customers, leads, and payments.",
  },
  {
    id: "faq-3",
    question: "Can I upgrade later?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time.",
  },
  {
    id: "faq-4",
    question: "Do hosting and websites come included?",
    answer:
      "No. Websites and hosting are optional add-ons so you only pay for what you need.",
  },
  {
    id: "faq-5",
    question: "What is FaraiOS?",
    answer:
      "FaraiOS is a Business Operating System for service businesses. It helps you manage bookings, customers, quotes, invoices, payments, websites, SEO, marketing, and your team from one workspace.",
  },
];

/** ZAR display for marketing copy */
export function formatZar(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

export function formatServicePrice(
  price: number,
  billing: "once" | "monthly",
  priceLabel?: string
): string {
  if (priceLabel) return priceLabel;
  return billing === "once"
    ? `${formatZar(price)} once-off`
    : `${formatZar(price)}/month`;
}
