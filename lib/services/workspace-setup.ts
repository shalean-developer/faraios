import {
  companyAutomationsPath,
  companyBookingFormPath,
  companyBookingsPath,
  companyCampaignsPath,
  companyCustomersPath,
  companyPaymentSettingsPath,
  companyReviewsPath,
  companySeoPath,
  companyServicesPath,
  companySettingsPath,
  companyTeamPath,
  companyWebsiteDomainsPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { getIndustryNavLabels } from "@/lib/industry-templates/industryTemplates";
import type { CompanyWithIndustry } from "@/types/database";

export type WorkspaceSetupChecklistItem = {
  key: string;
  step: number;
  title: string;
  description: string;
  actionLabel: string;
  done: boolean;
  href: string;
};

export type WorkspaceGrowthItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon:
    | "globe"
    | "link"
    | "chart"
    | "star"
    | "users"
    | "megaphone"
    | "zap";
};

export type WorkspaceSetupChecklist = {
  items: WorkspaceSetupChecklistItem[];
  growthItems: WorkspaceGrowthItem[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
};

type SetupCounts = {
  services: number;
  publishedForms: number;
  customers: number;
  bookings: number;
  paymentsConfigured: boolean;
};

async function loadSetupCounts(companyId: string): Promise<SetupCounts> {
  if (!isSupabaseConfigured()) {
    return {
      services: 0,
      publishedForms: 0,
      customers: 0,
      bookings: 0,
      paymentsConfigured: false,
    };
  }

  const supabase = await createClient();
  const [services, forms, customers, bookings, paymentSettings] =
    await Promise.all([
      supabase
        .from("company_services")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("active", true),
      supabase
        .from("booking_forms")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "published"),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
      supabase
        .from("company_payment_settings")
        .select("paystack_enabled, eft_account_number")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  const paymentsConfigured = Boolean(
    paymentSettings.data &&
      (paymentSettings.data.paystack_enabled ||
        paymentSettings.data.eft_account_number?.trim())
  );

  return {
    services: services.count ?? 0,
    publishedForms: forms.count ?? 0,
    customers: customers.count ?? 0,
    bookings: bookings.count ?? 0,
    paymentsConfigured,
  };
}

function isBusinessProfileComplete(company: CompanyWithIndustry): boolean {
  const hasContact = Boolean(
    company.primary_contact_email?.trim() && company.contact_phone?.trim()
  );
  const hasLogo = Boolean(company.brand_logo_url?.trim());
  const hasHours = Boolean(
    company.booking_hours &&
      typeof company.booking_hours === "object" &&
      Object.keys(company.booking_hours).length > 0
  );

  return hasContact && hasLogo && hasHours;
}

export async function getWorkspaceSetupChecklist(
  company: CompanyWithIndustry
): Promise<WorkspaceSetupChecklist> {
  const slug = company.slug;
  const counts = await loadSetupCounts(company.id);
  const industrySlug = company.industries?.slug ?? company.industry_template_key ?? null;
  const navLabels = getIndustryNavLabels(industrySlug);
  const industryModule = loadIndustryModule(industrySlug);
  const industryChecklist = industryModule.setupChecklist ?? [];

  const items: WorkspaceSetupChecklistItem[] = [
    {
      key: "services",
      step: 1,
      title: industryChecklist[0] ?? `Create your ${navLabels.services.toLowerCase()}`,
      description: "Add the services you offer and set pricing.",
      actionLabel: `Manage ${navLabels.services}`,
      done: counts.services > 0,
      href: companyServicesPath(slug),
    },
    {
      key: "profile",
      step: 2,
      title: "Complete Business Profile",
      description:
        "Add your business details, logo, contact info and operating hours.",
      actionLabel: "Edit Profile",
      done: isBusinessProfileComplete(company),
      href: companySettingsPath(slug),
    },
    {
      key: "payments",
      step: 3,
      title: "Connect Payments",
      description: "Connect Paystack so you can receive online payments.",
      actionLabel: "Manage Payments",
      done: counts.paymentsConfigured,
      href: companyPaymentSettingsPath(slug),
    },
    {
      key: "booking",
      step: 4,
      title: "Create Your First Booking",
      description: "Create a booking or import your first customer.",
      actionLabel: "Create Booking",
      done: counts.bookings > 0 || counts.customers > 0,
      href: counts.bookings > 0 ? companyBookingsPath(slug) : companyCustomersPath(slug),
    },
    {
      key: "booking_page",
      step: 5,
      title: industryChecklist[4] ?? `Publish your ${navLabels.bookings.toLowerCase()} page`,
      description: "Start accepting online bookings from customers.",
      actionLabel: "Publish Page",
      done: counts.publishedForms > 0,
      href: companyBookingFormPath(slug),
    },
  ];

  const growthItems: WorkspaceGrowthItem[] = [
    {
      key: "website",
      title: "Connect Website",
      description: "Connect or build your business website.",
      href: companyWebsitesPath(slug),
      icon: "globe",
    },
    {
      key: "domain",
      title: "Connect Domain",
      description: "Use your own branded domain.",
      href: companyWebsiteDomainsPath(slug),
      icon: "link",
    },
    {
      key: "seo",
      title: "Enable SEO",
      description: "Improve your visibility on Google.",
      href: companySeoPath(slug),
      icon: "chart",
    },
    {
      key: "reviews",
      title: "Collect Reviews",
      description: "Build trust with customer reviews.",
      href: companyReviewsPath(slug),
      icon: "star",
    },
    {
      key: "team",
      title: "Invite Team",
      description: "Add team members and assign roles.",
      href: companyTeamPath(slug),
      icon: "users",
    },
    {
      key: "campaign",
      title: "Create Campaign",
      description: "Launch your first marketing campaign.",
      href: companyCampaignsPath(slug),
      icon: "megaphone",
    },
    {
      key: "automations",
      title: "Enable Automations",
      description: "Save time with smart automations.",
      href: companyAutomationsPath(slug),
      icon: "zap",
    },
  ];

  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;

  return {
    items,
    growthItems,
    completedCount,
    totalCount,
    percentComplete: totalCount
      ? Math.round((completedCount / totalCount) * 100)
      : 0,
  };
}
