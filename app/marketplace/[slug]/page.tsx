import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketplaceDynamicBookingForm } from "@/components/marketplace/marketplace-dynamic-booking-form";
import { MarketplaceListingPage } from "@/components/marketplace/marketplace-listing-page";
import { getPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { listServicesForCompany } from "@/lib/services/company-services";
import { getMarketplaceBusinessBySlugPublic } from "@/lib/services/marketplace";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const listing = await getMarketplaceBusinessBySlugPublic(slug);
  if (!listing) {
    return { title: "Business not found — FaraiOS Marketplace" };
  }
  return {
    title: `${listing.name} — FaraiOS Marketplace`,
    description:
      listing.summary ??
      listing.seoDescription ??
      `Book ${listing.name} on the FaraiOS marketplace.`,
  };
}

export default async function MarketplaceBusinessPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getMarketplaceBusinessBySlugPublic(slug);

  if (!listing) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Business not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This listing is not available or is not published on the marketplace.
        </p>
        <Link
          href="/marketplace"
          className="mt-6 inline-block text-sm font-semibold text-violet-700 hover:text-violet-900"
        >
          ← Back to marketplace
        </Link>
      </main>
    );
  }

  const [form, services] = await Promise.all([
    getPublishedBookingFormForCompany(listing.companyId),
    listServicesForCompany(listing.companyId, { activeOnly: true }),
  ]);

  return (
    <MarketplaceListingPage
      listing={listing}
      bookingForm={
        <MarketplaceDynamicBookingForm
          listing={listing}
          fields={form?.fields ?? []}
          services={services}
        />
      }
    />
  );
}
