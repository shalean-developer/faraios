import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, MapPin, Sparkles } from "lucide-react";

import type { MarketplaceListing } from "@/types/marketplace";

type Props = {
  listing: MarketplaceListing;
  bookingForm: React.ReactNode;
};

export function MarketplaceListingPage({ listing, bookingForm }: Props) {
  const siteHref = listing.websitePublicUrl ?? listing.websitePreviewPath;

  return (
    <div className="min-h-screen bg-[#f8f7ff] font-sans">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
          <Link
            href={siteHref}
            target={listing.websitePublicUrl ? "_blank" : undefined}
            rel={listing.websitePublicUrl ? "noreferrer" : undefined}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            View website
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 py-8 text-white">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {listing.industry}
                </span>
                {listing.featured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Featured
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">{listing.name}</h1>
              {listing.location ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-violet-100">
                  <MapPin className="h-4 w-4" />
                  {listing.location}
                </p>
              ) : null}
            </div>
            <div className="space-y-4 px-6 py-6">
              <p className="text-sm leading-relaxed text-gray-600">
                {listing.summary ??
                  listing.seoDescription ??
                  `${listing.name} offers professional ${listing.industry.toLowerCase()} services.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={siteHref}
                  target={listing.websitePublicUrl ? "_blank" : undefined}
                  rel={listing.websitePublicUrl ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <Globe className="h-4 w-4" />
                  Visit website
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5 text-sm text-violet-900">
            <p className="font-semibold">Hosted & maintained by Shalean</p>
            <p className="mt-1 text-violet-800/80">
              This business site, SEO, and marketplace listing are managed on the Shalean platform.
            </p>
          </div>
        </section>

        <section>{bookingForm}</section>
      </main>
    </div>
  );
}
