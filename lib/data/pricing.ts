/**
 * Pricing catalog — structured for a future `pricing_plans` (or similar) Supabase table:
 * id, name, setup_price, monthly_price, features (json), is_popular, slug, description
 */

export type PricingPlanRecord = {
  id: string;
  /** URL segment for `?plan=` (e.g. business → /get-started?plan=business) */
  slug: string;
  name: string;
  setup_price: number;
  monthly_price: number;
  /** Feature lines shown in the plan card */
  features: string[];
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
      "Custom Design",
      "Up to 4 Pages",
      "Mobile Responsive",
      "Basic SEO",
      "1 Month Support",
    ],
    is_popular: false,
    description:
      "Perfect for small businesses launching their first professional website.",
  },
  {
    id: "plan_business",
    slug: "business",
    name: "Business",
    setup_price: 3500,
    monthly_price: 199,
    features: [
      "Custom Design",
      "Up to 7 Pages",
      "Mobile Responsive",
      "Advanced SEO",
      "Blog / CMS",
      "3 Months Support",
      "Google Analytics",
    ],
    is_popular: true,
    description:
      "The sweet spot for growing businesses that need more power and reach.",
  },
  {
    id: "plan_premium",
    slug: "premium",
    name: "Premium",
    setup_price: 5000,
    monthly_price: 499,
    features: [
      "Custom Design",
      "Unlimited Pages",
      "Mobile Responsive",
      "Full SEO Suite",
      "Blog / CMS",
      "E-commerce Ready",
      "6 Months Support",
      "Priority Support",
      "Google Analytics + Ads Setup",
    ],
    is_popular: false,
    description:
      "Everything you need for a full-scale digital presence with zero compromises.",
  },
];

/** Slug passed to onboarding (`?plan=`) — single source of truth */
export type PricingPlanSlug = (typeof pricingPlans)[number]["slug"];

export function normalizePlanSlug(
  raw: string | null | undefined
): PricingPlanSlug {
  const s = (raw ?? "").toLowerCase().trim();
  const found = pricingPlans.find((p) => p.slug === s);
  return found ? found.slug : "starter";
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
    case "premium":
      return null;
    default:
      return 4;
  }
}

export function planPageLimitLabel(slug: PricingPlanSlug): string {
  const limit = planPageLimit(slug);
  return limit === null ? "Unlimited pages" : `Up to ${limit} pages`;
}

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
    id: "delivery",
    label: "Fast Delivery",
    sub: "Live within 14 days",
    icon: "globe",
  },
  {
    id: "refund",
    label: "Satisfaction Guarantee",
    sub: "We revise until you love it",
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
    question: "What is FaraiOS?",
    answer:
      "FaraiOS is a business operating system for service businesses. It brings bookings, customers, payments, websites, SEO, marketing, team management, and reporting into one connected workspace — so you run operations, revenue, and growth from a single platform.",
  },
  {
    id: "faq-2",
    question: "Is FaraiOS a website builder?",
    answer:
      "Not exactly. FaraiOS is a full business operating system. Your website is one part of it — you can connect an existing site, have one built for you, or host through FaraiOS. The workspace behind it handles bookings, customers, payments, and everything else.",
  },
  {
    id: "faq-3",
    question: "Can I connect my existing website?",
    answer:
      "Yes. You can connect your current website and add booking forms, lead tracking, and integrations that sync with your FaraiOS workspace. You do not need to rebuild your site to start using FaraiOS.",
  },
  {
    id: "faq-4",
    question: "Can FaraiOS manage bookings and payments?",
    answer:
      "Yes. FaraiOS includes bookings, calendar, quotes, invoices, and payment tracking in the Operations and Revenue modules. Manage the full customer journey from first enquiry to paid invoice in one place.",
  },
  {
    id: "faq-5",
    question: "Which industries does FaraiOS support?",
    answer:
      "FaraiOS is built for local service businesses including cleaning, beauty and spa, technology services, tourism, construction, electrical, fitness, gardening, security, and consulting. Industry-specific defaults help you get started faster.",
  },
  {
    id: "faq-6",
    question: "Can I upgrade later?",
    answer:
      "Absolutely. You can upgrade from Starter to Business or Business to Premium at any time. We will only charge you the difference in setup costs and adjust your monthly billing accordingly.",
  },
  {
    id: "faq-7",
    question: "Do I own my customer data?",
    answer:
      "Yes. Your customer data, bookings, and business records belong to you. FaraiOS stores and manages your data securely in your workspace, and you retain full ownership and access at all times.",
  },
];

/** ZAR display for marketing copy */
export function formatZar(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}
