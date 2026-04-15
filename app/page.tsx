import { Suspense } from "react";

import { CustomWebsiteService } from "@/components/CustomWebsiteService";
import { listCompaniesWithIndustry } from "@/lib/services/companies";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";

import { HomeFallback } from "./home-fallback";

export const revalidate = 60;

async function HomeData() {
  const [industries, features, companies] = await Promise.all([
    listIndustries(),
    listFeatures(),
    listCompaniesWithIndustry(),
  ]);

  return (
    <CustomWebsiteService
      industries={industries}
      features={features}
      initialCompanies={companies}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeData />
    </Suspense>
  );
}
