"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Globe,
  Headphones,
  HelpCircle,
  Lock,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  faqItems,
  formatZar,
  pricingPlans,
  trustBadges,
  type TrustBadgeRecord,
} from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

const trustIcon = (b: TrustBadgeRecord["icon"]) => {
  const className = "h-5 w-5";
  switch (b) {
    case "lock":
      return <Lock className={`${className} text-indigo-400`} />;
    case "badge":
      return <BadgeCheck className={`${className} text-violet-400`} />;
    case "headphones":
      return <Headphones className={`${className} text-indigo-400`} />;
    case "globe":
      return <Globe className={`${className} text-violet-400`} />;
    case "card":
      return <CreditCard className={`${className} text-indigo-400`} />;
    default:
      return null;
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardStagger = {
  visible: {
    transition: { staggerChildren: 0.13 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FaraiPricingPage() {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden font-sans"
      style={{ background: "#0a0f1e" }}
    >
      <header className="flex w-full items-center justify-between border-b border-white/5 px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold leading-tight tracking-tight text-white">
              FaraiOS
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
              Pricing
            </span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Pricing subnav">
          <Link
            href="/auth/sign-in"
            className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
          <span className="border-b border-indigo-500 pb-0.5 text-sm font-semibold text-white">
            Pricing
          </span>
          <Link
            href="/auth/sign-up?next=/onboarding%3Fplan%3Dbusiness"
            className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-white"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="pb-14 pt-16 text-center"
        >
          <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simple, Transparent Pricing</span>
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl"
          >
            <span>Invest in your </span>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              digital future
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-xl text-lg leading-relaxed text-slate-400 md:text-xl"
          >
            Every plan includes a professionally crafted website built specifically for your
            business. Choose the package that fits your growth stage.
          </motion.p>
        </motion.section>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-14 flex flex-wrap justify-center gap-3"
        >
          {trustBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm"
            >
              {trustIcon(badge.icon)}
              <div>
                <p className="text-xs font-bold leading-tight text-white">{badge.label}</p>
                <p className="text-[10px] leading-tight text-slate-500">{badge.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardStagger}
          className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {pricingPlans.map((plan) => (
            <motion.article
              key={plan.id}
              variants={cardVariant}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl transition-transform duration-300 hover:z-10 hover:scale-[1.02]",
                plan.is_popular
                  ? "shadow-2xl shadow-indigo-900/60 ring-1 ring-indigo-500/40 hover:shadow-indigo-500/25"
                  : "shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-indigo-900/20"
              )}
            >
              {plan.is_popular && (
                <div
                  className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.45) 0%, rgba(139,92,246,0.45) 50%, rgba(168,85,247,0.2) 100%)",
                    padding: "1.5px",
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-full flex-col rounded-2xl backdrop-blur-sm",
                  plan.is_popular
                    ? "border border-indigo-500/40 bg-gradient-to-br from-indigo-700/80 via-violet-800/80 to-indigo-900/80"
                    : "border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-900/90"
                )}
              >
                <div className="border-b border-white/10 px-6 pb-5 pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2
                      className={cn(
                        "text-base font-extrabold tracking-tight",
                        plan.is_popular ? "text-white" : "text-slate-200"
                      )}
                    >
                      {plan.name}
                    </h2>
                    {plan.is_popular && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                        <Star className="h-3 w-3 fill-amber-300" />
                        <span>Most Popular</span>
                      </span>
                    )}
                  </div>

                  <p
                    className={cn(
                      "mb-5 text-xs leading-relaxed",
                      plan.is_popular ? "text-indigo-200" : "text-slate-500"
                    )}
                  >
                    {plan.description}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "text-3xl font-extrabold",
                          plan.is_popular ? "text-white" : "text-slate-100"
                        )}
                      >
                        {formatZar(plan.setup_price)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">setup</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          plan.is_popular ? "text-indigo-200" : "text-slate-400"
                        )}
                      >
                        {formatZar(plan.monthly_price)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">/ month</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-6 py-5">
                  <p
                    className={cn(
                      "mb-4 text-[10px] font-bold uppercase tracking-widest",
                      plan.is_popular ? "text-indigo-300" : "text-slate-500"
                    )}
                  >
                    What&apos;s included
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
                            plan.is_popular
                              ? "border-indigo-400/40 bg-indigo-500/30"
                              : "border-slate-600/40 bg-slate-700/60"
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3 w-3",
                              plan.is_popular ? "text-indigo-200" : "text-slate-400"
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            plan.is_popular ? "text-indigo-100" : "text-slate-300"
                          )}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  <Link
                    href={`/auth/sign-up?next=${encodeURIComponent(`/onboarding?plan=${plan.slug}`)}`}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200",
                      plan.is_popular
                        ? "bg-white text-indigo-700 shadow-lg shadow-indigo-900/40 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-xl hover:shadow-indigo-900/50"
                        : "border border-slate-600/60 bg-slate-700/80 text-slate-200 hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white"
                    )}
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mx-auto max-w-2xl"
        >
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-300">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>FAQ</span>
              </span>
            </div>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Got questions?
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <Accordion className="space-y-3">
            {faqItems.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-3">
                    <Shield className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="mt-20 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 via-violet-900/30 to-slate-900/40 px-8 py-12 text-center backdrop-blur-sm"
        >
          <div className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Ready to launch?
            </span>
          </div>
          <h3 className="mb-3 text-2xl font-extrabold text-white md:text-3xl">
            Start building your presence today
          </h3>
          <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-slate-400">
            Join hundreds of businesses already growing online with FaraiOS. Your site can be live
            in as little as 14 days.
          </p>
          <Link
            href="/auth/sign-up?next=/onboarding%3Fplan%3Dbusiness"
            className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/60"
          >
            <span>Get Started — Most Popular</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
