import Image from "next/image";
import type { WebsiteContent } from "@/types/database";
import {
  ShieldCheck,
  Sparkles,
  Wrench,
  Home,
  Zap,
  Star,
  Clock3,
  ArrowRight,
} from "lucide-react";

type Props = {
  content: WebsiteContent[];
  pageSection?: "home" | "services" | "about" | "contact";
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asServiceItems(
  value: unknown
): { title: string; description: string; icon?: string; image?: string; imageAlt?: string }[] {
  if (!Array.isArray(value)) return [];
  const objectItems: {
    title: string;
    description: string;
    icon?: string;
    image?: string;
    imageAlt?: string;
  }[] = [];
  for (const item of value) {
    if (typeof item !== "object" || !item) continue;
    const title = (item as { title?: unknown }).title;
    const description = (item as { description?: unknown }).description;
    const icon = (item as { icon?: unknown }).icon;
    const image = (item as { image?: unknown; imageUrl?: unknown }).image;
    const imageUrl = (item as { image?: unknown; imageUrl?: unknown }).imageUrl;
    const imageAlt = (item as { imageAlt?: unknown }).imageAlt;
    if (typeof title !== "string") continue;
    objectItems.push({
      title,
      description: typeof description === "string" ? description : "",
      icon: typeof icon === "string" ? icon : undefined,
      image:
        typeof image === "string"
          ? image
          : typeof imageUrl === "string"
            ? imageUrl
            : undefined,
      imageAlt: typeof imageAlt === "string" ? imageAlt : undefined,
    });
  }
  if (objectItems.length > 0) return objectItems;
  return asStringArray(value).map((title) => ({ title, description: "" }));
}

function asTestimonialItems(
  value: unknown
): { quote: string; author?: string; role?: string }[] {
  if (!Array.isArray(value)) return [];
  const objectItems: { quote: string; author?: string; role?: string }[] = [];
  for (const item of value) {
    if (typeof item !== "object" || !item) continue;
    const quote = (item as { quote?: unknown }).quote;
    const author = (item as { author?: unknown }).author;
    const role = (item as { role?: unknown }).role;
    if (typeof quote !== "string") continue;
    objectItems.push({
      quote,
      author: typeof author === "string" ? author : undefined,
      role: typeof role === "string" ? role : undefined,
    });
  }
  if (objectItems.length > 0) return objectItems;
  return asStringArray(value).map((quote) => ({ quote }));
}

function asStatItems(value: unknown): { value: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const statValue = (item as { value?: unknown }).value;
      const label = (item as { label?: unknown }).label;
      if (typeof statValue !== "string" || typeof label !== "string") return null;
      return { value: statValue, label };
    })
    .filter((item): item is { value: string; label: string } => item !== null);
}

function asProjectItems(
  value: unknown
): { title: string; image?: string; imageAlt?: string; location?: string }[] {
  if (!Array.isArray(value)) return [];
  const items: {
    title: string;
    image?: string;
    imageAlt?: string;
    location?: string;
  }[] = [];
  for (const item of value) {
    if (typeof item !== "object" || !item) continue;
    const title = (item as { title?: unknown }).title;
    const image = (item as { image?: unknown; imageUrl?: unknown }).image;
    const imageUrl = (item as { image?: unknown; imageUrl?: unknown }).imageUrl;
    const imageAlt = (item as { imageAlt?: unknown }).imageAlt;
    const location = (item as { location?: unknown }).location;
    if (typeof title !== "string") continue;
    items.push({
      title,
      image:
        typeof image === "string"
          ? image
          : typeof imageUrl === "string"
            ? imageUrl
            : undefined,
      imageAlt: typeof imageAlt === "string" ? imageAlt : undefined,
      location: typeof location === "string" ? location : undefined,
    });
  }
  return items;
}

type HeroSectionProps = {
  hero: Record<string, unknown>;
  heroImage: string;
  heroImageAlt: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
  trustBadge: string;
  trustSubtext: string;
  locationText: string;
  floatingStatValue: string;
  floatingStatLabel: string;
  serviceItems: { title: string; description: string; icon?: string; image?: string; imageAlt?: string }[];
};

function HeroSection({
  hero,
  heroImage,
  heroImageAlt,
  heroCtaLabel,
  heroCtaHref,
  heroSecondaryCtaLabel,
  heroSecondaryCtaHref,
  trustBadge,
  trustSubtext,
  locationText,
  floatingStatValue,
  floatingStatLabel,
  serviceItems,
}: HeroSectionProps) {
  const rating = asString(hero.rating);
  const cardTitle = asString(hero.cardTitle);
  const cardSubtitle = asString(hero.cardSubtitle);
  const cardTotalLabel = asString(hero.cardTotalLabel);
  const cardTotalValue = asString(hero.cardTotalValue);
  const cardFooter = asString(hero.cardFooter);

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-purple-700 py-20 text-white">
      <div className="absolute inset-0 opacity-15">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={heroImageAlt}
            fill
            className="object-cover"
            loading="lazy"
            unoptimized
          />
        ) : null}
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold leading-tight sm:text-6xl">{asString(hero.title)}</h1>
          <p className="max-w-2xl text-lg leading-8 text-blue-100 sm:text-xl">
            {asString(hero.subtitle)}
          </p>
          {locationText ? (
            <p className="inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-100">
              {locationText}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            {heroCtaLabel ? (
              <a
                href={heroCtaHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                {heroCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
            {heroSecondaryCtaLabel ? (
              <a
                href={heroSecondaryCtaHref}
                className="inline-flex items-center rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/20"
              >
                {heroSecondaryCtaLabel}
              </a>
            ) : null}
          </div>
          {(trustBadge || trustSubtext || rating) && (
            <div className="inline-flex flex-col rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <div className="flex items-center gap-1 text-amber-300">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
              {trustBadge ? <p className="mt-2 text-sm font-medium text-white">{trustBadge}</p> : null}
              {rating ? <p className="mt-1 text-sm text-amber-300">{rating}</p> : null}
              {trustSubtext ? <p className="mt-1 text-sm text-blue-100">{trustSubtext}</p> : null}
            </div>
          )}
        </div>
        <div className="relative">
          {heroImage ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
                <Image
                  src={heroImage}
                  alt={heroImageAlt}
                  width={760}
                  height={560}
                  className="h-[360px] w-full object-cover"
                  loading="lazy"
                  unoptimized
                />
              </div>
              {serviceItems.length > 0 ? (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur">
                  <p className="text-sm font-medium text-blue-100">
                    {cardSubtitle || asString(hero.serviceBoxTitle)}
                  </p>
                  <div className="mt-3 space-y-2">
                    {serviceItems.slice(0, 2).map((item) => (
                      <div
                        key={`${item.title}-hero-service-box`}
                        className="rounded-xl border border-white/10 bg-white/10 p-3 transition-all duration-300 hover:bg-white/20"
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur">
              {cardSubtitle ? <p className="text-sm text-blue-100">{cardSubtitle}</p> : null}
              {cardTitle ? <p className="mt-1 text-xl font-semibold">{cardTitle}</p> : null}
              <div className="mt-6 space-y-3">
                {serviceItems.slice(0, 3).map((item) => (
                  <div
                    key={`${item.title}-hero-card`}
                    className="rounded-xl border border-white/10 bg-white/10 p-3 transition-all duration-300 hover:bg-white/20 hover:shadow-lg"
                  >
                    <p className="font-medium">{item.title}</p>
                  </div>
                ))}
              </div>
              {(cardTotalLabel || cardTotalValue || cardFooter) && (
                <div className="mt-6 rounded-xl border border-white/15 bg-white/10 p-4">
                  {cardTotalLabel ? (
                    <p className="text-xs uppercase tracking-wider text-blue-200">{cardTotalLabel}</p>
                  ) : null}
                  {cardTotalValue ? <p className="mt-1 text-2xl font-bold">{cardTotalValue}</p> : null}
                  {cardFooter ? <p className="mt-2 text-sm text-blue-100">{cardFooter}</p> : null}
                </div>
              )}
              {heroCtaLabel ? (
                <a
                  href={heroCtaHref}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  {heroCtaLabel}
                </a>
              ) : null}
            </div>
          )}
          {(floatingStatValue || floatingStatLabel) && (
            <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
              <p className="text-2xl font-bold">{floatingStatValue}</p>
              <p className="text-xs text-slate-500">{floatingStatLabel}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ServiceBusinessTemplate({
  content,
  pageSection = "home",
}: Props) {
  const hero = content.find((c) => c.section === "hero")?.content ?? {};
  const services = content.find((c) => c.section === "services")?.content ?? {};
  const about = content.find((c) => c.section === "about")?.content ?? {};
  const testimonials =
    content.find((c) => c.section === "testimonials")?.content ?? {};
  const contact = content.find((c) => c.section === "contact")?.content ?? {};
  const trust = content.find((c) => c.section === "trust")?.content ?? {};
  const features = content.find((c) => c.section === "features")?.content ?? {};
  const projects = content.find((c) => c.section === "projects")?.content ?? {};
  const cta = content.find((c) => c.section === "cta")?.content ?? {};
  const footer = content.find((c) => c.section === "footer")?.content ?? {};

  const serviceItems = asServiceItems(services.items);
  const testimonialItems = asTestimonialItems(testimonials.items);
  const featureItems = asServiceItems(features.items);
  const projectItems = asProjectItems(projects.items);
  const trustStats = asStatItems(trust.items);
  const heroImage = asString(hero.image, asString(hero.imageUrl));
  const heroImageAlt = asString(hero.imageAlt, asString(hero.title));
  const businessName = asString(hero.businessName, asString(hero.title));
  const heroCtaLabel = asString(hero.ctaLabel);
  const heroCtaHref = asString(hero.ctaHref, "#contact");
  const heroSecondaryCtaLabel = asString(hero.ctaSecondaryLabel);
  const heroSecondaryCtaHref = asString(hero.ctaSecondaryHref, "#services");
  const aboutImage = asString(about.image, asString(about.imageUrl, heroImage));
  const aboutImageAlt = asString(about.imageAlt, asString(about.heading));
  const contactCtaLabel = asString(contact.ctaLabel);
  const contactCtaHref = asString(contact.ctaHref, heroCtaHref);
  const ctaPrimaryLabel = asString(cta.primaryLabel, heroCtaLabel);
  const ctaPrimaryHref = asString(cta.primaryHref, heroCtaHref);
  const ctaSecondaryLabel = asString(cta.secondaryLabel, heroSecondaryCtaLabel);
  const ctaSecondaryHref = asString(cta.secondaryHref, heroSecondaryCtaHref);
  const ctaHeading = asString(cta.heading);
  const ctaBody = asString(cta.body);
  const contactPhone = asString(contact.phone);
  const contactEmail = asString(contact.email);
  const contactAddress = asString(contact.address);
  const contactPhoneHref = contactPhone.replace(/\s+/g, "");
  const trustBadge = asString(hero.trustBadge);
  const trustSubtext = asString(hero.trustSubtext);
  const locationText = asString(hero.location, contactAddress);
  const floatingStatValue = asString(hero.floatingStatValue);
  const floatingStatLabel = asString(hero.floatingStatLabel);
  const aboutStats = asStatItems(about.stats);
  const footerLinks = asStringArray(footer.links);
  const featuredTestimonials = testimonialItems.slice(0, 3);
  const compactBusinessMark = businessName
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const trustItems =
    trustStats.length > 0
      ? trustStats
      : [
          { value: "500+", label: "clients" },
          { value: "8+", label: "years" },
          { value: "98%", label: "satisfaction" },
          { value: "24/7", label: "support" },
        ];
  const darkFeatureItems =
    featureItems.length > 0 ? featureItems.slice(0, 4) : serviceItems.slice(0, 4);
  const serviceIcons = [Home, Wrench, Sparkles, Zap, ShieldCheck, Star];
  const featureIcons = [ShieldCheck, Clock3, Star, Sparkles];
  const navPrimaryCtaLabel = asString(hero.navCtaLabel, heroCtaLabel);
  const navPrimaryCtaHref = asString(hero.navCtaHref, heroCtaHref);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: asString(hero.title),
    telephone: contactPhone || undefined,
    email: contactEmail || undefined,
    address: contactAddress || undefined,
    url: "/",
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-blue-900 to-purple-700 text-xs font-bold text-white shadow-lg">
              {compactBusinessMark}
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-900">{businessName}</p>
          </div>
          <nav aria-label="Primary" className="flex items-center gap-6 text-sm font-medium">
            <a href="#services" className="text-slate-600 transition-colors hover:text-slate-900">
              {asString(services.heading)}
            </a>
            <a href="#about" className="text-slate-600 transition-colors hover:text-slate-900">
              {asString(about.heading)}
            </a>
            <a href="#contact" className="text-slate-600 transition-colors hover:text-slate-900">
              {asString(contact.heading)}
            </a>
            {navPrimaryCtaLabel ? (
              <a
                href={navPrimaryCtaHref}
                className="rounded-xl bg-gradient-to-r from-blue-900 to-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {navPrimaryCtaLabel}
              </a>
            ) : null}
          </nav>
        </div>
      </header>

      <HeroSection
        hero={hero}
        heroImage={heroImage}
        heroImageAlt={heroImageAlt}
        heroCtaLabel={heroCtaLabel}
        heroCtaHref={heroCtaHref}
        heroSecondaryCtaLabel={heroSecondaryCtaLabel}
        heroSecondaryCtaHref={heroSecondaryCtaHref}
        trustBadge={trustBadge}
        trustSubtext={trustSubtext}
        locationText={locationText}
        floatingStatValue={floatingStatValue}
        floatingStatLabel={floatingStatLabel}
        serviceItems={serviceItems}
      />

      <section className="border-b border-slate-100 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-4">
          {asString(trust.heading) ? (
            <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-slate-400">
              {asString(trust.heading)}
            </p>
          ) : null}
          <ul className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {trustItems.map((item) => (
              <li key={`${item.value}-${item.label}`} className="text-center">
                <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{item.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {(pageSection === "home" || pageSection === "services") && (
        <section id="services" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            {asString(services.tag) ? (
              <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
                {asString(services.tag)}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{asString(services.heading)}</h2>
            {asString(services.subtitle) ? (
              <p className="mt-3 max-w-2xl text-slate-600">{asString(services.subtitle)}</p>
            ) : null}
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {serviceItems.map((item, index) => (
                <li
                  key={`${item.title}-${item.description}`}
                  className="rounded-2xl border-t-4 border-t-blue-700 border-slate-200 bg-gradient-to-b from-blue-50/80 to-purple-50/50 p-8 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={asString(item.imageAlt, item.title)}
                      width={600}
                      height={340}
                      className="h-32 w-full rounded-2xl object-cover shadow-lg"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-100 to-purple-100 shadow-lg">
                      <p className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                        {item.icon ? (
                          <span className="text-lg">{item.icon}</span>
                        ) : (
                          (() => {
                            const Icon = serviceIcons[index % serviceIcons.length];
                            return <Icon className="h-5 w-5" />;
                          })()
                        )}
                      </p>
                    </div>
                  )}
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-blue-800">
                    {asString(services.cardTagline)}
                  </p>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pageSection === "home" && projectItems.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            {asString(projects.tag) ? (
              <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
                {asString(projects.tag)}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{asString(projects.heading)}</h2>
            {asString(projects.subtitle) ? (
              <p className="mt-3 max-w-2xl text-slate-600">{asString(projects.subtitle)}</p>
            ) : null}
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projectItems.map((item) => (
                <li
                  key={`${item.title}-${item.image ?? "project"}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {item.image ? (
                    <div className="relative">
                      <Image
                        src={item.image}
                        alt={asString(item.imageAlt, item.title)}
                        width={640}
                        height={420}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                        unoptimized
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent p-3">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
                      <p className="text-sm text-slate-600">{asString(projects.imagePlaceholder)}</p>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    {item.location ? (
                      <p className="mt-1 text-sm text-slate-600">{item.location}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(pageSection === "home" || pageSection === "about") && (
        <section id="about" className="bg-slate-50 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
            <div>
              {asString(about.tag) ? (
                <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
                  {asString(about.tag)}
                </p>
              ) : null}
              <h2 className="text-2xl font-semibold">{asString(about.heading)}</h2>
              <p className="mt-4 text-slate-700">{asString(about.body)}</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              {aboutImage ? (
                <Image
                  src={aboutImage}
                  alt={aboutImageAlt}
                  width={720}
                  height={420}
                  className="h-64 w-full rounded-2xl object-cover shadow-lg md:h-80"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-900 to-purple-700 p-8 text-white shadow-lg md:h-80">
                  <p className="text-sm text-blue-100">{asString(about.imagePlaceholder)}</p>
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {aboutStats.slice(0, 2).map((item) => (
                    <div key={`${item.value}-${item.label}`} className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-lg">
                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="text-sm text-slate-600">{item.label}</p>
                  </div>
                ))}
                {aboutStats.length === 0 ? (
                  <>
                    <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-lg">
                      <p className="text-2xl font-bold text-slate-900">8+</p>
                      <p className="text-sm text-slate-600">years experience</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-lg">
                      <p className="text-2xl font-bold text-slate-900">500+</p>
                      <p className="text-sm text-slate-600">clients served</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {pageSection === "home" && darkFeatureItems.length > 0 && (
        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-6xl px-4">
            {asString(features.tag) ? (
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
                {asString(features.tag)}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{asString(features.heading)}</h2>
            {asString(features.subtitle) ? (
              <p className="mt-3 max-w-2xl text-slate-300">{asString(features.subtitle)}</p>
            ) : null}
            <ul className="mt-8 grid gap-6 md:grid-cols-2">
              {darkFeatureItems.map((item) => (
                <li
                  key={`${item.title}-feature`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl"
                >
                  <p className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg">
                    {item.icon ? (
                      <span>{item.icon}</span>
                    ) : (
                      (() => {
                        const Icon = featureIcons[
                          darkFeatureItems.findIndex((entry) => entry.title === item.title) %
                            featureIcons.length
                        ];
                        return <Icon className="h-5 w-5" />;
                      })()
                    )}
                  </p>
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pageSection === "home" && (
        <section id="testimonials" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            {asString(testimonials.tag) ? (
              <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
                {asString(testimonials.tag)}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{asString(testimonials.heading)}</h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredTestimonials.map((item, index) => (
                <li
                  key={`${item.quote}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-4 flex items-center gap-1 text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <p className="text-sm leading-7 text-slate-700">"{item.quote}"</p>
                  {item.author ? (
                    <p className="mt-4 font-semibold text-slate-900">
                      {item.author}
                      {item.role ? (
                        <span className="font-normal text-slate-600"> - {item.role}</span>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pageSection === "home" && (
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-700 p-12 text-center text-white shadow-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">{ctaHeading}</h2>
              {ctaBody ? <p className="mx-auto mt-3 max-w-2xl text-blue-100">{ctaBody}</p> : null}
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {ctaPrimaryLabel || asString(cta.fallbackPrimaryLabel) ? (
                  <a
                    href={ctaPrimaryHref}
                    className="inline-flex items-center rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {ctaPrimaryLabel || asString(cta.fallbackPrimaryLabel)}
                  </a>
                ) : null}
                {ctaSecondaryLabel || asString(cta.fallbackSecondaryLabel) ? (
                  <a
                    href={ctaSecondaryHref}
                    className="inline-flex items-center rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/20"
                  >
                    {ctaSecondaryLabel || asString(cta.fallbackSecondaryLabel)}
                  </a>
                ) : null}
              </div>
              {asString(cta.meta) ? (
                <p className="mt-4 text-sm text-blue-100/90">{asString(cta.meta)}</p>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {(pageSection === "home" || pageSection === "contact") && (
        <section id="contact" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4">
            {asString(contact.tag) ? (
              <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
                {asString(contact.tag)}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{asString(contact.heading)}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {contactPhone ? (
                <a
                  href={`tel:${contactPhoneHref}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-lg transition-all hover:-translate-y-1"
                >
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    {asString(contact.phoneLabel)}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{contactPhone}</p>
                </a>
              ) : null}
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-lg transition-all hover:-translate-y-1"
                >
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    {asString(contact.emailLabel)}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{contactEmail}</p>
                </a>
              ) : null}
              {contactAddress ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-lg">
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    {asString(contact.addressLabel)}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{contactAddress}</p>
                </div>
              ) : null}
            </div>
            {asString(contact.details) ? (
              <p className="mt-6 whitespace-pre-wrap text-slate-600">{asString(contact.details)}</p>
            ) : null}
            {contactCtaLabel ? (
              <div className="mt-8">
                <a
                  href={contactCtaHref}
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-blue-900 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {contactCtaLabel}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <footer className="bg-slate-950 py-12 text-white">
        <div className="mx-auto max-w-6xl px-4 text-sm text-slate-600">
          <p className="font-semibold text-white">{businessName}</p>
          <div className="mt-4 flex flex-wrap gap-5 text-slate-300">
            {footerLinks.map((link) => (
              <a key={link} href="#" className="transition-colors hover:text-white">
                {link}
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-slate-300">
            {contactPhone ? <p>{contactPhone}</p> : null}
            {contactEmail ? <p>{contactEmail}</p> : null}
            {contactAddress ? <p>{contactAddress}</p> : null}
          </div>
          <p className="mt-6 text-slate-400">
            {new Date().getFullYear()} {businessName}
          </p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
