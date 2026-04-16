import { slugifyBusinessName } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import type { Website, WebsiteContent } from "@/types/database";

export type CreateWebsiteInput = {
  businessName: string;
  industry: string;
  services: string;
  contactInfo: string;
  template: string;
  customDomain?: string;
};

export type WebsiteSeoInput = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
};

export type WebsiteSectionSeed = {
  section: string;
  content: Record<string, unknown>;
};

type IndustryContentPreset = {
  heroSubtitle: string;
  aboutBody: string;
  testimonialItems: string[];
  defaultServices: string[];
};

const INDUSTRY_PRESETS: Record<string, IndustryContentPreset> = {
  cleaning: {
    heroSubtitle: "Reliable service with clear communication and consistent quality.",
    aboutBody:
      "Our team focuses on dependable service, flexible scheduling, and results that match your expectations.",
    testimonialItems: [
      "Excellent service and very professional team.",
      "Great communication from first contact to completion.",
    ],
    defaultServices: ["Residential service", "Commercial service", "One-time service"],
  },
  plumbing: {
    heroSubtitle: "Fast response for repairs, installations, and maintenance.",
    aboutBody:
      "We deliver practical solutions, transparent pricing, and workmanship designed to last.",
    testimonialItems: [
      "Quick response and quality workmanship.",
      "Solved the issue on the first visit.",
    ],
    defaultServices: ["Leak repair", "Drain clearing", "Fixture installation"],
  },
  gym: {
    heroSubtitle: "Structured programs focused on measurable progress.",
    aboutBody:
      "Our coaches help members build sustainable habits and hit their fitness goals confidently.",
    testimonialItems: [
      "Supportive coaching and great energy.",
      "I saw real progress in the first month.",
    ],
    defaultServices: ["Personal training", "Group classes", "Nutrition guidance"],
  },
};

function cleanDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function buildSubdomainSeed(name: string): string {
  return slugifyBusinessName(name).slice(0, 48);
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildDefaultWebsiteContent(
  input: CreateWebsiteInput
): WebsiteSectionSeed[] {
  const normalizedIndustry = input.industry.trim().toLowerCase();
  const preset = INDUSTRY_PRESETS[normalizedIndustry] ?? {
    heroSubtitle: "Trusted professional services tailored to your needs.",
    aboutBody:
      "We focus on quality delivery, customer-first support, and consistent outcomes.",
    testimonialItems: [
      "Professional team and smooth experience.",
      "Great results and excellent support.",
    ],
    defaultServices: ["Consultation", "On-site service", "Ongoing support"],
  };

  const services = input.services
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const finalServices = services.length > 0 ? services : preset.defaultServices;

  return [
    {
      section: "hero",
      content: {
        title: input.businessName.trim(),
        subtitle: preset.heroSubtitle,
        ctaLabel: "Book a service",
      },
    },
    {
      section: "services",
      content: {
        heading: "Services",
        items: finalServices,
      },
    },
    {
      section: "about",
      content: {
        heading: "About",
        body: preset.aboutBody,
      },
    },
    {
      section: "testimonials",
      content: {
        heading: "Testimonials",
        items: preset.testimonialItems,
      },
    },
    {
      section: "contact",
      content: {
        heading: "Contact",
        details: input.contactInfo.trim(),
      },
    },
  ];
}

export async function createWebsiteDraftForCurrentUser(
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) {
    return { ok: false, error: "No company membership found for this user." };
  }

  return createWebsiteDraftForCompanyId(membership.company_id, input);
}

export async function createWebsiteDraftForCompanyId(
  companyId: string,
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  const domain = cleanDomain(input.customDomain ?? "");
  const subdomain = buildSubdomainSeed(input.businessName);
  const businessName = input.businessName.trim();
  const industry = input.industry.trim().toLowerCase() || "general";
  const industryLabel = titleCase(industry);
  const seoTitle = `${businessName} | ${industryLabel} Services`;
  const seoDescription = `${businessName} provides trusted ${industry} services with fast response and professional support.`;
  const seoKeywords = `${businessName}, ${industry}, ${industry} services, local ${industry}`;

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .insert({
      client_id: companyId,
      name: businessName,
      industry,
      template: input.template.trim() || "service-business",
      domain,
      subdomain,
      status: "draft",
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
    })
    .select("*")
    .single();

  if (websiteError || !website?.id) {
    return { ok: false, error: websiteError?.message ?? "Failed to create website." };
  }

  const sections = buildDefaultWebsiteContent(input).map((item) => ({
    website_id: website.id,
    section: item.section,
    content: item.content,
  }));

  const { error: contentError } = await supabase
    .from("website_content")
    .insert(sections);

  if (contentError) {
    return { ok: false, error: contentError.message };
  }

  return { ok: true, websiteId: website.id };
}

export async function getWebsiteForCompany(
  companyId: string
): Promise<Website | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteForCompany", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function getWebsiteByDomain(
  domain: string
): Promise<Website | null> {
  const cleaned = cleanDomain(domain);
  if (!cleaned) return null;

  const subdomainCandidate = cleaned.split(".")[0] ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .or(`domain.eq.${cleaned},subdomain.eq.${subdomainCandidate}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteByDomain", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function getWebsiteById(websiteId: string): Promise<Website | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteById", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function updateWebsiteSeo(
  websiteId: string,
  input: WebsiteSeoInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("websites")
    .update({
      seo_title: input.seoTitle.trim() || null,
      seo_description: input.seoDescription.trim() || null,
      seo_keywords: input.seoKeywords.trim() || null,
    })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function getMainAppDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return "";
  try {
    return new URL(appUrl).host.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isMainHost(host: string): boolean {
  const normalized = host.toLowerCase();
  const appHost = getMainAppDomain();
  return (
    !normalized ||
    normalized.startsWith("localhost") ||
    normalized.startsWith("127.0.0.1") ||
    normalized.endsWith(".vercel.app") ||
    Boolean(appHost && normalized === appHost)
  );
}

export async function getWebsiteContentByWebsiteId(
  websiteId: string
): Promise<WebsiteContent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", websiteId);

  if (error) {
    console.error("[websites] getWebsiteContentByWebsiteId", error.message);
    return [];
  }

  return (data as WebsiteContent[]) ?? [];
}
