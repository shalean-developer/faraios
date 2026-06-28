import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTenantContext, getTenantMetadata } from "@/lib/services/tenant-site";
import ServiceBusinessTemplate from "@/templates/service-business/ServiceBusinessTemplate";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getTenantContext();
  if (ctx.mainHost) {
    return {
      title: "FAQ — FaraiOS",
      description: "Frequently asked questions about FaraiOS.",
    };
  }
  return getTenantMetadata("faq");
}

export default async function FaqPage() {
  const ctx = await getTenantContext();

  if (ctx.mainHost) {
    redirect("/platform");
  }

  if (!ctx.website || ctx.website.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  return (
    <ServiceBusinessTemplate
      content={ctx.content}
      pageSection="faq"
      bookingUrl={ctx.bookingUrl}
      marketplaceBookingUrl={ctx.marketplaceBookingUrl}
      templateVariant={ctx.website.template}
      companyBranding={ctx.companyBranding}
    />
  );
}
