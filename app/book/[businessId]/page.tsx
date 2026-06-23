import Link from "next/link";
import { notFound } from "next/navigation";

import { BookPageClient } from "./book-page-client";
import { getPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { listServicesForCompany } from "@/lib/services/company-services";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ businessId: string }> };

export default async function PublicBookPage({ params }: Props) {
  const { businessId } = await params;
  const admin = tryCreateAdminClient();
  if (!admin.ok) notFound();

  const { data: company } = await admin.client
    .from("companies")
    .select("id, name")
    .eq("id", businessId)
    .maybeSingle();

  if (!company) notFound();

  const [form, services] = await Promise.all([
    getPublishedBookingFormForCompany(company.id),
    listServicesForCompany(company.id, { activeOnly: true }),
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

  return (
    <main className="min-h-screen bg-[#f8f7ff] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <BookPageClient
          companyId={company.id}
          businessName={company.name}
          fields={form.fields}
          services={services}
        />
      </div>
    </main>
  );
}
