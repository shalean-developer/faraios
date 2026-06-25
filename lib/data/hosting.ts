/**
 * Hosting plans catalog — structured for a future `hosting_plans` Supabase table.
 */

export type HostingPlanRecord = {
  id: string;
  slug: string;
  name: string;
  monthly_price: number;
  sites_limit: number;
  bandwidth_limit_gb: number;
  storage_gb: number;
  features: string[];
  is_popular: boolean;
  description: string;
};

export const hostingPlans: HostingPlanRecord[] = [
  {
    id: "hosting_shared_basic",
    slug: "shared-basic",
    name: "Shared Basic",
    monthly_price: 49,
    sites_limit: 1,
    bandwidth_limit_gb: 5,
    storage_gb: 5,
    features: [
      "1 hosted site",
      "5 GB bandwidth / month",
      "5 GB SSD storage",
      "Free SSL certificate",
      "FaraiOS subdomain",
      "Daily backups",
    ],
    is_popular: false,
    description:
      "Affordable hosting for a single site — perfect for getting online fast.",
  },
  {
    id: "hosting_shared_pro",
    slug: "shared-pro",
    name: "Shared Pro",
    monthly_price: 99,
    sites_limit: 3,
    bandwidth_limit_gb: 20,
    storage_gb: 20,
    features: [
      "Up to 3 hosted sites",
      "20 GB bandwidth / month",
      "20 GB SSD storage",
      "Custom domain support",
      "Free SSL certificate",
      "Daily backups",
      "Email forwarding",
    ],
    is_popular: true,
    description:
      "The best value for growing businesses that need multiple sites and a custom domain.",
  },
  {
    id: "hosting_business",
    slug: "business-hosting",
    name: "Business Hosting",
    monthly_price: 199,
    sites_limit: 10,
    bandwidth_limit_gb: 50,
    storage_gb: 50,
    features: [
      "Up to 10 hosted sites",
      "50 GB bandwidth / month",
      "50 GB SSD storage",
      "Custom domains + wildcard SSL",
      "Priority support",
      "Staging environments",
      "Advanced analytics",
    ],
    is_popular: false,
    description:
      "Powerful hosting for agencies and businesses running multiple client sites.",
  },
  {
    id: "hosting_enterprise",
    slug: "enterprise-hosting",
    name: "Enterprise",
    monthly_price: 499,
    sites_limit: 999,
    bandwidth_limit_gb: 200,
    storage_gb: 200,
    features: [
      "Unlimited hosted sites",
      "200 GB bandwidth / month",
      "200 GB SSD storage",
      "Dedicated resources",
      "99.9% uptime SLA",
      "24/7 priority support",
      "Custom integrations",
      "White-label options",
    ],
    is_popular: false,
    description:
      "Enterprise-grade infrastructure with dedicated resources and SLA guarantees.",
  },
];

export type HostingPlanSlug = (typeof hostingPlans)[number]["slug"];

export function normalizeHostingPlanSlug(
  raw: string | null | undefined
): HostingPlanSlug {
  const s = (raw ?? "").toLowerCase().trim();
  const found = hostingPlans.find((p) => p.slug === s);
  return found ? found.slug : "shared-basic";
}

export function hostingPlanLabelForSlug(slug: HostingPlanSlug): string {
  return hostingPlans.find((p) => p.slug === slug)?.name ?? slug;
}

export function getHostingPlan(slug: string): HostingPlanRecord {
  return (
    hostingPlans.find((p) => p.slug === normalizeHostingPlanSlug(slug)) ??
    hostingPlans[0]
  );
}

export type HostingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const hostingFaqItems: HostingFaqItem[] = [
  {
    id: "hosting-faq-1",
    question: "What is included with FaraiOS hosting?",
    answer:
      "Every hosting plan includes secure cloud infrastructure on Vercel, free SSL certificates, daily backups, and a FaraiOS subdomain. Higher tiers add custom domains, more bandwidth, and priority support.",
  },
  {
    id: "hosting-faq-2",
    question: "Can I use my own domain?",
    answer:
      "Yes. Shared Pro and above support custom domains. After purchase, connect your domain in the hosting dashboard and point your DNS to FaraiOS — we handle SSL automatically.",
  },
  {
    id: "hosting-faq-3",
    question: "How does billing work?",
    answer:
      "Hosting is billed monthly via Paystack in South African Rand (ZAR). Your subscription renews every 30 days. You can upgrade your plan at any time from your dashboard.",
  },
  {
    id: "hosting-faq-4",
    question: "Can I host sites built outside FaraiOS?",
    answer:
      "Hosting plans are optimized for FaraiOS-built websites. You can also host static sites and connect existing domains through the hosting dashboard.",
  },
  {
    id: "hosting-faq-5",
    question: "What happens if I cancel?",
    answer:
      "Your sites remain accessible until the end of your billing period. After that, sites are suspended but your data is retained for 30 days so you can reactivate or export.",
  },
];

export function formatZar(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}
