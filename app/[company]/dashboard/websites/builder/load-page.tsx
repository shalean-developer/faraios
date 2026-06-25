import { notFound } from "next/navigation";

import { WebsiteBuilderClient, type BuilderSection } from "@/components/website-builder/website-builder-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { getBuilderDashboardData } from "@/lib/website-builder/service";
import { createClient } from "@/lib/supabase/server";
import type { CompanyService } from "@/types/database";

export const dynamic = "force-dynamic";

export async function loadWebsiteBuilderPage(slug: string, section: BuilderSection) {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { unauthorized: true as const };

  const company = await getCompanyBySlug(decoded);
  if (!company) notFound();

  const hasAccess = await userHasCompanySlugAccess(user.id, decoded);
  if (!hasAccess) return { unauthorized: true as const };

  const [dashboardData, servicesRes] = await Promise.all([
    getBuilderDashboardData(company.id),
    supabase
      .from("company_services")
      .select("*")
      .eq("company_id", company.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    unauthorized: false as const,
    slug: decoded,
    companyId: company.id,
    company,
    section,
    website: dashboardData?.website ?? null,
    landingContent: dashboardData?.landingContent ?? null,
    servicePages: dashboardData?.servicePages ?? [],
    enquiries: dashboardData?.enquiries ?? [],
    domainSettings: dashboardData?.domainSettings ?? null,
    companyServices: (servicesRes.data ?? []) as CompanyService[],
  };
}

export function renderWebsiteBuilderPage(
  data: Awaited<ReturnType<typeof loadWebsiteBuilderPage>>
) {
  if (data.unauthorized) {
    return (
      <main className="px-4 py-10 text-center">
        <p className="text-sm text-slate-600">Please sign in to access the website builder.</p>
      </main>
    );
  }

  return (
    <WebsiteBuilderClient
      slug={data.slug}
      companyId={data.companyId}
      company={data.company}
      section={data.section}
      website={data.website}
      landingContent={data.landingContent}
      servicePages={data.servicePages}
      enquiries={data.enquiries}
      domainSettings={data.domainSettings}
      companyServices={data.companyServices}
    />
  );
}
