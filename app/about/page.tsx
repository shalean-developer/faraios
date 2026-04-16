import type { Metadata } from "next";

import { getTenantContext, getTenantMetadata } from "@/lib/services/tenant-site";
import ServiceBusinessTemplate from "@/templates/service-business/ServiceBusinessTemplate";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return getTenantMetadata("about");
}

export default async function AboutPage() {
  const ctx = await getTenantContext();
  if (ctx.mainHost || !ctx.website || ctx.website.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  return <ServiceBusinessTemplate content={ctx.content} pageSection="about" />;
}
