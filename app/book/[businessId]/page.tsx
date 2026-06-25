import Link from "next/link";
import { notFound } from "next/navigation";

import { BookPageClient } from "./book-page-client";
import { getBookingFormConfigForCompany } from "@/lib/services/booking-form-config";
import { getPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { resolveCompanyByBookIdentifier } from "@/lib/bookings/resolve-company";
import { listPublicServicesForCompany } from "@/lib/services/company-services";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ businessId: string }>; searchParams: Promise<{ embed?: string }> };

export default async function PublicBookPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { embed } = await searchParams;
  const embedded = embed === "1" || embed === "true";
  const admin = tryCreateAdminClient();
  if (!admin.ok) notFound();

  const company = await resolveCompanyByBookIdentifier(businessId);
  if (!company) notFound();

  const [form, services, config] = await Promise.all([
    getPublishedBookingFormForCompany(company.id),
    listPublicServicesForCompany(company.id, { activeOnly: true }),
    getBookingFormConfigForCompany(company.id, { useAdmin: true }),
  ]);

  if (!form) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900">Booking not available</h1>
        <p className="mt-2 text-sm text-slate-500">
          {company.name} has not published a booking form yet.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-violet-700">
          ← Home
        </Link>
      </main>
    );
  }

  const settings = form.settings ?? config.settings;
  const branding = settings.branding ?? {};
  const displayName =
    branding.businessName?.trim() ||
    (branding.useCompanyBranding !== false ? company.name : company.name);
  const logoUrl =
    branding.useCompanyBranding !== false ? company.brand_logo_url : branding.logoUrl;
  const brandColor =
    branding.useCompanyBranding !== false
      ? company.brand_primary_color
      : branding.brandColor;

  return (
    <main
      className={
        embedded
          ? "bg-transparent px-0 py-0"
          : "min-h-screen bg-[#f8f7ff] px-4 py-10"
      }
    >
      <div className={embedded ? "mx-auto w-full max-w-none" : "mx-auto max-w-xl"}>
        <BookPageClient
          companyId={company.id}
          businessName={displayName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          fields={form.fields}
          services={services}
          settings={settings}
          extras={config.extras.filter((e) => e.active)}
          pricingRule={config.pricingRule}
          embedded={embedded}
        />
      </div>
    </main>
  );
}
