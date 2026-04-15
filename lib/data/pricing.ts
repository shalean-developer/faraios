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
    question: "What is the setup fee for?",
    answer:
      "The setup fee covers the full design, development, and deployment of your website. This is a one-time cost that includes all the custom work done to bring your site to life — from wireframes to the final launch.",
  },
  {
    id: "faq-2",
    question: "What does the monthly fee include?",
    answer:
      "Your monthly fee covers website hosting, security updates, performance monitoring, and ongoing support for any minor edits or queries. It keeps your site fast, secure, and up-to-date every month.",
  },
  {
    id: "faq-3",
    question: "Can I upgrade my plan later?",
    answer:
      "Absolutely. You can upgrade from Starter to Business or Business to Premium at any time. We will only charge you the difference in setup costs and adjust your monthly billing accordingly.",
  },
  {
    id: "faq-4",
    question: "How long does it take to build my website?",
    answer:
      "Most websites are completed and live within 10–14 business days from the moment we receive your content and branding assets. Premium projects with e-commerce may take up to 21 days.",
  },
  {
    id: "faq-5",
    question: "Do I own my website?",
    answer:
      "Yes — 100%. Once your project is delivered, you have full ownership of your website, its code, and all associated assets. We simply handle the ongoing maintenance if you choose to keep your plan active.",
  },
];

/** ZAR display for marketing copy */
export function formatZar(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}
