/** Shared Tailwind classes for the FaraiOS marketing landing page. */
export const landingGreenBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg";

export const landingGreenBtnLg =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg";

export const landingSectionTitle =
  "text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl";

export const landingSectionSubtitle = "mt-4 text-lg leading-relaxed text-slate-600";

/** Horizontal padding shared by nav, footer, and every landing section. */
export const landingSectionX = "px-4 sm:px-6 lg:px-8";

/** Standard vertical padding for full content sections. */
export const landingSectionY = "py-20";

/** Compact vertical padding for trust strips and bridge sections. */
export const landingSectionYCompact = "py-12";

/** Top offset for the hero below the fixed nav; pairs with `landingSectionY` bottom padding. */
export const landingHeroPad = "pt-28 pb-20";

/** Max-width content container — aligns nav, footer, and all sections. */
export const landingContainer = "mx-auto max-w-6xl";

/** Two-column section grid with consistent gap. */
export const landingGrid2Col = "grid items-center gap-12 lg:grid-cols-2 lg:gap-16";

/** Centered section header spacing. */
export const landingSectionHeader = "mb-12 text-center";

export const landingSectionPad = `${landingSectionX} ${landingSectionY}`;

export const landingSectionPadCompact = `${landingSectionX} ${landingSectionYCompact}`;

/** Sub-page hero shell — matches the home page amber gradient. */
export const marketingHeroSection =
  "relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/40";

export const marketingHeroPad = "pt-28 pb-12";

export const marketingPageTitle =
  "text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl";

export const marketingPageLead = "mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600";

export const marketingBadge =
  "inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/70 px-4 py-1.5 text-xs font-semibold text-amber-900";

export const marketingCtaCard =
  "rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50/60 px-8 py-14 text-center shadow-sm ring-1 ring-amber-100/80 sm:px-12 sm:py-16";
