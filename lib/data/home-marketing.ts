import type { PricingPlanSlug } from "@/lib/data/pricing";

export const HERO_BADGE = "Business OS for local service teams";

export const HERO_HEADLINE_PREFIX = "The Business Operating System for";
export const HERO_HEADLINE_EMPHASIS = "Service Businesses";

export const HERO_SUBHEADLINE =
  "Manage bookings, customers, payments, websites, SEO, marketing, and your team from one connected workspace.";

export const HERO_BULLETS = [
  "Booking, CRM, payments, and marketing in one place",
  "Connect an existing website or add one later",
  "Built for cleaning, beauty, tourism, tech, trades, and more",
] as const;

export const HERO_TRUST_LINE = "Free setup. Cancel anytime. No hidden fees.";

export type SocialProofStat = {
  value: string;
  label: string;
};

export const SOCIAL_PROOF_STATS: SocialProofStat[] = [
  { value: "4+", label: "industries supported" },
  { value: "12+", label: "business modules" },
  { value: "1", label: "connected workspace" },
  { value: "ZA", label: "Built for South African service businesses" },
];

export const CLIENT_EXAMPLES = [
  "Shalean Cleaning Services",
  "Luxury M Spa",
  "MakTech",
  "Afrika Tour",
] as const;

export const SOCIAL_PROOF_TAGLINE =
  "Designed to power service businesses across cleaning, beauty, technology, tourism, and more.";

export type HowItWorksStep = {
  step: string;
  title: string;
  desc: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: "1",
    title: "Create your workspace",
    desc: "Sign up and set up your business profile in minutes — no complex setup required.",
  },
  {
    step: "2",
    title: "Add your services, team, and business details",
    desc: "Configure services, staff roles, and operational settings tailored to your industry.",
  },
  {
    step: "3",
    title: "Receive bookings, leads, quotes, and payments",
    desc: "Manage day-to-day operations from one dashboard — bookings, customers, and revenue.",
  },
  {
    step: "4",
    title: "Grow with SEO, marketing, reports, and automation",
    desc: "Scale with built-in growth tools, analytics, and automations when you're ready.",
  },
];

export const EVERYTHING_INCLUDED = [
  "Bookings",
  "Calendar",
  "Customers",
  "Leads",
  "Services",
  "Quotes",
  "Invoices",
  "Payments",
  "Website",
  "Hosting",
  "Domains",
  "SEO",
  "Marketing",
  "Reviews",
  "Campaigns",
  "Team",
  "Tasks",
  "Automations",
  "Reports",
  "AI Insights",
] as const;

export type DashboardModule = {
  title: string;
  items: string;
  description: string;
};

export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    title: "Operations",
    items: "Bookings, calendar, customers, services",
    description: "Run day-to-day service delivery from one place.",
  },
  {
    title: "Revenue",
    items: "Quotes, invoices, payments, revenue tracking",
    description: "Quote, invoice, and get paid without switching tools.",
  },
  {
    title: "Website",
    items: "Websites, domains, hosting, API keys",
    description: "Connect, build, or host your business website.",
  },
  {
    title: "Growth",
    items: "SEO, marketing, reviews, campaigns, content",
    description: "Attract customers and build your reputation online.",
  },
  {
    title: "Team",
    items: "Staff, roles, tasks, automations",
    description: "Coordinate your team and automate repetitive work.",
  },
  {
    title: "Intelligence",
    items: "Reports, AI insights, business health",
    description: "Understand performance and make smarter decisions.",
  },
];

export type IndustryCardIcon =
  | "sparkles"
  | "heart"
  | "cpu"
  | "plane"
  | "paintbrush"
  | "zap"
  | "dumbbell"
  | "trees"
  | "shield"
  | "briefcase";

export type IndustryCard = {
  slug: string;
  name: string;
  description: string;
  icon: IndustryCardIcon;
};

export const INDUSTRY_CARDS: IndustryCard[] = [
  {
    slug: "cleaning",
    name: "Cleaning Services",
    description: "Schedule jobs, manage teams, and track recurring clients.",
    icon: "sparkles",
  },
  {
    slug: "beauty-spa",
    name: "Beauty & Spa",
    description: "Book appointments, manage services, and grow your clientele.",
    icon: "heart",
  },
  {
    slug: "technology",
    name: "Technology Services",
    description: "Handle support tickets, projects, and client billing.",
    icon: "cpu",
  },
  {
    slug: "tourism",
    name: "Tourism & Travel",
    description: "Manage bookings, itineraries, and customer communications.",
    icon: "plane",
  },
  {
    slug: "construction",
    name: "Construction & Painting",
    description: "Quote projects, schedule crews, and track job progress.",
    icon: "paintbrush",
  },
  {
    slug: "electrical",
    name: "Electrical Services",
    description: "Dispatch technicians, manage quotes, and invoice on completion.",
    icon: "zap",
  },
  {
    slug: "fitness",
    name: "Fitness & Gyms",
    description: "Manage memberships, classes, and trainer schedules.",
    icon: "dumbbell",
  },
  {
    slug: "gardening",
    name: "Gardening & Landscaping",
    description: "Plan seasonal work, route teams, and bill recurring clients.",
    icon: "trees",
  },
  {
    slug: "security",
    name: "Security Services",
    description: "Coordinate guards, shifts, and client site management.",
    icon: "shield",
  },
  {
    slug: "consulting",
    name: "Consulting",
    description: "Track engagements, proposals, and client relationships.",
    icon: "briefcase",
  },
];

export type WebsiteHostingCard = {
  title: string;
  description: string;
  href?: string;
};

export const WEBSITE_HOSTING_TITLE =
  "Already have a website? Connect it. Need one? We can build it.";

export const WEBSITE_HOSTING_DESCRIPTION =
  "FaraiOS works behind your website. You can connect an existing website, use a custom website built for your business, or host a website through FaraiOS.";

export const WEBSITE_HOSTING_CARDS: WebsiteHostingCard[] = [
  {
    title: "Connect existing website",
    description: "Link your current site and add booking forms, tracking, and integrations.",
  },
  {
    title: "Add booking forms and tracking",
    description: "Embed forms and capture leads directly into your workspace.",
  },
  {
    title: "Host your business website",
    description: "Launch a professional site hosted and managed through FaraiOS.",
    href: "/hosting",
  },
  {
    title: "Manage domains and SEO",
    description: "Configure domains, SEO settings, and search visibility from one place.",
  },
];

export const HOME_PRICING_HIGHLIGHTS: Record<PricingPlanSlug, string[]> = {
  starter: [
    "Full workspace platform",
    "Custom website design included",
    "Monthly support included",
    "No hidden fees",
  ],
  business: [
    "Full workspace platform",
    "Custom website design included",
    "3 months support included",
    "No hidden fees",
  ],
  premium: [
    "Full workspace platform",
    "Custom website design included",
    "Priority support included",
    "No hidden fees",
  ],
};

export const DASHBOARD_PREVIEW_SIDEBAR = [
  "Overview",
  "Operations",
  "Revenue",
  "Website",
  "Growth",
  "Team",
  "Intelligence",
] as const;

export const DASHBOARD_PREVIEW_CARDS = [
  { label: "Today's bookings", value: "12", trend: "+3 from yesterday" },
  { label: "New leads", value: "8", trend: "4 qualified" },
  { label: "Revenue this month", value: "R24,500", trend: "+18% vs last month" },
  { label: "Customers", value: "156", trend: "12 new this month" },
  { label: "Pending invoices", value: "5", trend: "R8,200 outstanding" },
  { label: "Website status", value: "Live", trend: "All systems operational" },
] as const;

/** Footer industry shortcuts → dedicated industry pages */
export const FOOTER_INDUSTRY_LINKS = [
  { label: "Cleaning", slug: "cleaning" },
  { label: "Beauty & Spa", slug: "beauty-spa" },
  { label: "Technology", slug: "technology" },
  { label: "Tourism", slug: "tourism" },
] as const;
