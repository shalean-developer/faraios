import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTenantContext, getTenantMetadata } from "@/lib/services/tenant-site";
import { isTenantBuilderWebsite } from "@/lib/website-builder/tenant-public-site";
import ServiceBusinessTemplate from "@/templates/service-business/ServiceBusinessTemplate";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return getTenantMetadata("services");
}

export default async function ServicesPage() {
  const ctx = await getTenantContext();
  if (ctx.mainHost || !ctx.website || ctx.website.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  if (isTenantBuilderWebsite(ctx.website)) {
    redirect("/#services");
  }

  return <ServiceBusinessTemplate content={ctx.content} pageSection="services" bookingUrl={ctx.bookingUrl} marketplaceBookingUrl={ctx.marketplaceBookingUrl} templateVariant={ctx.website.template} companyBranding={ctx.companyBranding} />;
}
