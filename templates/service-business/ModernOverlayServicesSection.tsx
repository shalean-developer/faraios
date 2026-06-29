"use client";

import { useState } from "react";

import type { ParsedSiteContent, ServiceCard } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { sectionContainer } from "@/templates/service-business/template-styles";

type ServiceCategory = {
  label: string;
  items: ServiceCard[];
};

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_TABS = ["Remodel", "Upgrade", "Restore"];

/** Tabs are visual filters in the design — the full numbered list stays visible. */
function buildCategories(items: ServiceCard[]): ServiceCategory[] {
  return DEFAULT_TABS.map((label) => ({ label, items }));
}

export function ModernOverlayServicesSection({ site }: Props) {
  const { services, topbar, theme, whyChooseUs, hero } = site;
  const listItems = services.items.slice(0, 6);
  const categories = buildCategories(listItems);
  const [activeTab, setActiveTab] = useState(0);
  const [activeItem, setActiveItem] = useState(0);

  const featuredImage =
    listItems[activeItem]?.image ||
    listItems[0]?.image ||
    whyChooseUs.image ||
    hero.image ||
    luxuryFallbackImage(0);

  const headline =
    services.heading === "Our Services" || !services.heading?.trim()
      ? "Spaces That Feel Right"
      : services.heading;

  const phone = topbar.phone?.trim();
  const phoneHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;

  return (
    <section
      id="services"
      className="relative py-16 sm:py-20 lg:py-24"
      style={{
        backgroundColor: "#f7f5f0",
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
      }}
    >
      <div className={sectionContainer}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: theme.accent }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: theme.accent }}
                aria-hidden
              />
              Our Services
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
              {headline}
            </h2>
          </div>

          <div className="flex shrink-0 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
            {categories.map((category, index) => {
              const isActive = index === activeTab;
              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => {
                    setActiveTab(index);
                    setActiveItem(0);
                  }}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                  style={
                    isActive
                      ? { backgroundColor: theme.accent, color: "#fff" }
                      : { color: "#1e293b" }
                  }
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-start">
          <div className="flex flex-col">
            <ul className="divide-y divide-slate-300/70 border-t border-slate-300/70">
              {listItems.map((item, index) => {
                const isActive = index === activeItem;
                return (
                  <li key={`${item.title}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setActiveItem(index)}
                      className="group w-full py-5 text-left transition"
                    >
                      <span className="text-base font-medium text-slate-900 sm:text-lg">
                        {index + 1}. {item.title}
                      </span>
                      <span
                        className="mt-3 block h-px w-full transition"
                        style={{
                          backgroundColor: isActive ? theme.accent : "transparent",
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {phone ? (
              <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
                <p className="text-base text-slate-700">
                  Urgent home repair services available.
                </p>
                <p className="mt-2 text-base text-slate-700">
                  For immediate support, call{" "}
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="font-semibold hover:underline"
                      style={{ color: theme.accent }}
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="font-semibold" style={{ color: theme.accent }}>
                      {phone}
                    </span>
                  )}
                </p>
              </div>
            ) : null}
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-slate-200 sm:min-h-[420px] lg:min-h-[480px]">
            <LuxuryImage
              src={featuredImage}
              alt={listItems[activeItem]?.imageAlt ?? listItems[activeItem]?.title ?? "Our services"}
              fill
              fallbackIndex={0}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
