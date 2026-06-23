import { Suspense } from "react";
import type { Metadata } from "next";

import { CustomWebsiteService } from "@/components/CustomWebsiteService";
import { listMemberCompaniesWithIndustry } from "@/lib/services/companies";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";
import { createClient } from "@/lib/supabase/server";
import { renderWebsiteTemplate } from "@/lib/services/render-website-template";
import { getTenantContext, getTenantMetadata } from "@/lib/services/tenant-site";

import { HomeFallback } from "./home-fallback";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return getTenantMetadata("home");
}

async function HomeData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [industries, features, companies] = await Promise.all([
    listIndustries(),
    listFeatures(),
    user ? listMemberCompaniesWithIndustry(user.id) : Promise.resolve([]),
  ]);

  return (
    <CustomWebsiteService
      industries={industries}
      features={features}
      initialCompanies={companies}
    />
  );
}

export default async function HomePage() {
  const ctx = await getTenantContext();
  const isMainExperience = ctx.mainHost;

  if (isMainExperience) {
    return (
      <Suspense fallback={<HomeFallback />}>
        <HomeData />
      </Suspense>
    );
  }

  const website = ctx.website;
  if (!website) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  if (website.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Coming soon
      </div>
    );
  }

  return renderWebsiteTemplate(website, ctx.content, "home");
}
