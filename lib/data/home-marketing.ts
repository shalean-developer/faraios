import type { PricingPlanSlug } from "@/lib/data/pricing";

export const HERO_BADGE = "Business OS for local service teams";

export const HERO_HEADLINE = "The best booking experience for home service businesses";

export const HERO_SUBHEADLINE =
  "FaraiOS helps you take bookings online, manage your team in the field, and get paid — all from one connected workspace built for South African service businesses.";

export const HERO_TRUST_LINE = "Free setup. Cancel anytime. No hidden fees.";

/** @deprecated Use HERO_HEADLINE — kept for other pages still on the old hero copy */
export const HERO_HEADLINE_PREFIX = "The Business Operating System for";
/** @deprecated Use HERO_HEADLINE */
export const HERO_HEADLINE_EMPHASIS = "Service Businesses";

/** @deprecated */
export const HERO_BULLETS = [
  "Booking, CRM, payments, and marketing in one place",
  "Connect an existing website or add one later",
  "Built for cleaning, electrical, tourism, tech, trades, and more",
] as const;

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
  "FaraiOS Cleaning Services",
  "ProFix Electrical",
  "MakTech",
  "Afrika Tour",
] as const;

export const SOCIAL_PROOF_TAGLINE =
  "Designed to power service businesses across cleaning, trades, technology, tourism, and more.";

export const SOCIAL_PROOF_HEADLINE = "Trusted by service businesses across South Africa";

export const SOCIAL_PROOF_LOGOS = [
  "FaraiOS Cleaning Services",
  "ProFix Electrical",
  "MakTech",
  "Afrika Tour",
  "Greenview Ltd",
  "Atlas HVAC",
] as const;

export type EverythingFeature = {
  title: string;
  description: string;
};

export const EVERYTHING_FEATURES: EverythingFeature[] = [
  {
    title: "Online booking",
    description: "Let customers book 24/7 from your website or a shareable link.",
  },
  {
    title: "Team scheduling",
    description: "Assign jobs, manage calendars, and keep your crew on the same page.",
  },
  {
    title: "Quotes & invoices",
    description: "Send professional quotes and collect payments without switching tools.",
  },
  {
    title: "Customer CRM",
    description: "Track every client, job history, and follow-up in one place.",
  },
  {
    title: "Website & SEO",
    description: "Connect your site or launch one — with hosting and SEO built in.",
  },
  {
    title: "Reports & insights",
    description: "See revenue, bookings, and business health at a glance.",
  },
];

export type FeatureGridItem = {
  title: string;
  description: string;
  accent: "green" | "blue" | "cream" | "slate";
};

export const FEATURE_GRID_ITEMS: FeatureGridItem[] = [
  {
    title: "Smart booking forms",
    description:
      "Customisable forms that capture the right details for every service type — synced straight to your dashboard.",
    accent: "green",
  },
  {
    title: "Calendar & dispatch",
    description:
      "See every job on one calendar. Drag, assign, and notify your team in seconds.",
    accent: "blue",
  },
  {
    title: "Payments & invoicing",
    description:
      "Send invoices, track payments, and reconcile revenue without leaving FaraiOS.",
    accent: "cream",
  },
  {
    title: "Growth tools",
    description:
      "SEO, reviews, campaigns, and marketing — built in when you're ready to scale.",
    accent: "slate",
  },
];

export type MobileFeatureSection = {
  title: string;
  description: string;
  bullets: readonly string[];
  reversed?: boolean;
};

export const MOBILE_FEATURE_SECTIONS: MobileFeatureSection[] = [
  {
    title: "Schedule and dispatch with ease",
    description:
      "Assign jobs to the right team member, see availability at a glance, and keep everyone aligned — from the office or on the go.",
    bullets: ["Drag-and-drop calendar", "Staff availability", "Job notifications"],
  },
  {
    title: "Online booking that works on all devices",
    description:
      "Your customers can book from any phone, tablet, or desktop. FaraiOS booking pages look great and load fast everywhere.",
    bullets: ["Mobile-first booking pages", "Shareable booking links", "Embed on your website"],
    reversed: true,
  },
  {
    title: "Keep your team connected in the field",
    description:
      "Give your crew the information they need — job details, customer notes, and updates — without endless phone calls.",
    bullets: ["Job details on mobile", "Customer history", "Real-time status updates"],
  },
];

export const TESTIMONIAL = {
  quote:
    "FaraiOS replaced three different tools we were juggling. Bookings, invoicing, and our team calendar are finally in one place — and our customers love the online booking.",
  name: "Thabo M.",
  role: "Owner, FaraiOS Cleaning Services",
  initials: "TM",
} as const;

export const PAYMENTS_FEATURES = [
  "Send quotes and invoices in minutes",
  "Track payments and outstanding balances",
  "Revenue reports and business health scores",
  "Connect your existing payment flow",
] as const;

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
    "Business Workspace",
    "Customers CRM & Bookings",
    "Calendar & Services",
    "1 Team Member",
  ],
  business: [
    "Everything in Starter",
    "Leads, Quotes & Invoices",
    "SEO & Marketing Tools",
    "Up to 5 Team Members",
  ],
  premium: [
    "Everything in Business",
    "Workflow Automations",
    "AI Insights & Advanced Reports",
    "Unlimited Team Members",
  ],
};

export const DASHBOARD_PREVIEW_SIDEBAR = [
  "Overview",
  "Operations",
  "Revenue",
  "Growth",
  "Team",
  "Intelligence",
] as const;

export type DashboardPreviewCard = {
  label: string;
  value: string;
  trend: string;
  trendTone: "up" | "neutral" | "alert";
  icon:
    | "bookings"
    | "revenue"
    | "leads"
    | "quotes"
    | "customers"
    | "health";
  sparkline: readonly number[];
};

export const DASHBOARD_PREVIEW_CARDS: DashboardPreviewCard[] = [
  {
    label: "Today's bookings",
    value: "12",
    trend: "+3 from yesterday",
    trendTone: "up",
    icon: "bookings",
    sparkline: [4, 6, 5, 8, 7, 9, 12],
  },
  {
    label: "Revenue this month",
    value: "R24,500",
    trend: "+18% vs last month",
    trendTone: "up",
    icon: "revenue",
    sparkline: [12, 14, 13, 16, 18, 20, 24],
  },
  {
    label: "New leads",
    value: "8",
    trend: "4 qualified",
    trendTone: "neutral",
    icon: "leads",
    sparkline: [2, 3, 5, 4, 6, 7, 8],
  },
  {
    label: "Pending quotes",
    value: "3",
    trend: "R12,400 pipeline",
    trendTone: "neutral",
    icon: "quotes",
    sparkline: [1, 2, 2, 3, 2, 3, 3],
  },
  {
    label: "Customers",
    value: "156",
    trend: "12 new this month",
    trendTone: "up",
    icon: "customers",
    sparkline: [120, 128, 132, 138, 142, 149, 156],
  },
  {
    label: "Business health",
    value: "87%",
    trend: "Strong performance",
    trendTone: "up",
    icon: "health",
    sparkline: [72, 74, 78, 80, 83, 85, 87],
  },
];

export const DASHBOARD_PREVIEW_ACTIVITY = [
  { text: "New booking from Sarah M.", time: "2m ago" },
  { text: "Invoice #1042 paid — R1,800", time: "18m ago" },
  { text: "Lead qualified: Office cleaning", time: "1h ago" },
  { text: "Quote sent to Greenview Ltd", time: "2h ago" },
] as const;

export const DASHBOARD_PREVIEW_INSIGHT = {
  title: "Follow up on 3 open quotes",
  body: "Quotes followed up within 48 hours close 68% more often in businesses like yours.",
} as const;

/** Footer industry shortcuts → dedicated industry pages */
export const FOOTER_INDUSTRY_LINKS = [
  { label: "Cleaning", slug: "cleaning" },
  { label: "Beauty & Spa", slug: "beauty-spa" },
  { label: "Technology", slug: "technology" },
  { label: "Tourism", slug: "tourism" },
] as const;
