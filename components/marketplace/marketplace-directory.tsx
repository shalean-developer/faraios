"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Globe, MapPin, Search, Sparkles } from "lucide-react";

import {
  landingContainer,
  landingSectionPad,
  marketingBadge,
} from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketplaceIndustriesFromListings } from "@/lib/marketplace/utils";
import type { MarketplaceListing } from "@/types/marketplace";
import { cn } from "@/lib/utils";

type Props = {
  listings: MarketplaceListing[];
};

export function MarketplaceDirectory({ listings }: Props) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const industries = useMemo(
    () => marketplaceIndustriesFromListings(listings),
    [listings]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesIndustry = industry === "all" || listing.industry === industry;
      if (!matchesIndustry) return false;
      if (!q) return true;
      return (
        listing.name.toLowerCase().includes(q) ||
        listing.industry.toLowerCase().includes(q) ||
        (listing.location ?? "").toLowerCase().includes(q) ||
        (listing.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [industry, listings, query]);

  return (
    <MarketingPageShell active="marketplace">
      <main>
        <MarketingPageHero
          badge={
            <span className={marketingBadge}>
              <Globe className="h-3.5 w-3.5" />
              FaraiOS Marketplace
            </span>
          }
          title="Find trusted local services"
          description="Browse businesses hosted on FaraiOS, view their sites, and book services directly. Each business has a unique site built and maintained by FaraiOS."
        />

        <section className={cn(landingSectionPad, "bg-white pt-0")}>
          <div className={landingContainer}>
            <motion.section
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search businesses, services, locations…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All industries</option>
                {industries.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </motion.section>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                <Globe className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <h2 className="text-lg font-bold text-slate-900">No listings yet</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {listings.length === 0
                    ? "Businesses appear here once FaraiOS publishes them to the marketplace."
                    : "Try a different search or industry filter."}
                </p>
                <Link
                  href="/pricing"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  List your business on FaraiOS
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((listing) => (
                  <motion.article
                    key={listing.companyId}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-amber-50 to-emerald-50">
                      <Globe className="h-10 w-10 text-emerald-500" />
                    </div>
                    <div className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">{listing.name}</h2>
                          {listing.location ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {listing.location}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            {listing.industry}
                          </span>
                          {listing.featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              <Sparkles className="h-3 w-3" />
                              Featured
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
                        {listing.summary ?? listing.seoDescription ?? "Professional services on FaraiOS."}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`/marketplace/${listing.slug}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Book now
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={listing.websitePreviewPath}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View site
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </MarketingPageShell>
  );
}
