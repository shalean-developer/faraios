"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Globe, LayoutGrid, Sparkles } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { websiteExamples } from "@/lib/data/examples";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const highlights = [
  {
    title: "Tailored to your brand",
    description: "Colors, typography, and layout matched to your business identity.",
  },
  {
    title: "Mobile-first design",
    description: "Every example is built to look great on phones, tablets, and desktop.",
  },
  {
    title: "Ready to grow",
    description: "Contact forms, service pages, and SEO foundations included from day one.",
  },
];

export function ExamplesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const auth = await loadMarketingNavAuth(supabase);

      if (!mounted) return;
      setIsAuthenticated(auth.isAuthenticated);
      setCompanySlug(auth.companySlug);
      setIsPlatformAdmin(auth.isPlatformAdmin);
    };

    void loadAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCompanySlug(null);
    setIsPlatformAdmin(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white font-sans">
      <MarketingNav
        isAuthenticated={isAuthenticated}
        companySlug={companySlug}
        isPlatformAdmin={isPlatformAdmin}
        active="examples"
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative overflow-hidden pb-14 pt-8 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
          <div className="relative">
            <motion.div variants={fadeUp} className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-xs font-semibold text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Our work
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
            >
              Website{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                examples
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
            >
              Explore sample sites to see the style, structure, and quality FaraiOS
              delivers for real businesses.
            </motion.p>
          </div>
        </motion.section>

        <section className="mb-12 border-y border-gray-100 py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">Custom-built</strong> for each client
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              <strong className="text-gray-900">Mobile-first</strong> layouts
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              Live in as little as <strong className="text-gray-900">14 days</strong>
            </span>
          </div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Featured examples
              </h2>
              <p className="mt-2 text-gray-500">
                Representative sites across industries we serve.
              </p>
            </div>
            <LayoutGrid className="hidden h-8 w-8 text-violet-300 sm:block" aria-hidden />
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {websiteExamples.map((example) => (
              <motion.article
                key={example.id}
                variants={fadeUp}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100 transition-colors group-hover:from-violet-200/80 group-hover:to-indigo-200/80">
                  <Globe className="h-10 w-10 text-violet-400 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{example.name}</h3>
                    <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                      {example.category}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {example.description}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Demo preview coming soon
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20 rounded-3xl border border-gray-100 bg-gray-50 px-6 py-12 sm:px-10"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              What every FaraiOS site includes
            </h2>
            <p className="mt-2 text-gray-500">
              The same quality you see here — built specifically for your business.
            </p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-3">
            {highlights.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="pb-12"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-center shadow-2xl shadow-violet-200 sm:p-12"
          >
            <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
              Want a site like these?
            </h3>
            <p className="mx-auto mt-4 max-w-md text-base text-violet-100">
              Tell us about your business and we&apos;ll design a website tailored
              to your brand — live in as little as 14 days.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/sign-up?next=/onboarding%3Fplan%3Dbusiness"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </main>

      <MarketingFooter />
    </div>
  );
}
