"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Globe,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";

import {
  HERO_BADGE,
  HERO_BULLETS,
  HERO_HEADLINE_EMPHASIS,
  HERO_HEADLINE_PREFIX,
  HERO_SUBHEADLINE,
  HERO_TRUST_LINE,
} from "@/lib/data/home-marketing";

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

const BULLET_ICONS = [LayoutDashboard, Globe, Users] as const;

type Props = {
  onGetStarted?: () => void;
  getStartedHref?: string;
};

export function DualHero({ onGetStarted, getStartedHref = "/auth/sign-up" }: Props) {
  const primaryCtaClass =
    "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl";

  const secondaryCtaClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:border-violet-200 hover:shadow-md";

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              {HERO_BADGE}
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            {HERO_HEADLINE_PREFIX}{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {HERO_HEADLINE_EMPHASIS}
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
          >
            {HERO_SUBHEADLINE}
          </motion.p>

          <motion.ul
            variants={fadeUp}
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 text-left text-sm text-gray-600 sm:text-center"
          >
            {HERO_BULLETS.map((bullet, i) => {
              const Icon = BULLET_ICONS[i] ?? LayoutDashboard;
              return (
                <li
                  key={bullet}
                  className="flex items-start justify-center gap-2 sm:items-center"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 sm:mt-0" />
                  {bullet}
                </li>
              );
            })}
          </motion.ul>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            {onGetStarted ? (
              <button type="button" onClick={onGetStarted} className={primaryCtaClass}>
                Start your workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <Link href={getStartedHref} className={primaryCtaClass}>
                Start your workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            <Link href="/pricing" className={secondaryCtaClass}>
              View pricing
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-sm text-gray-500">
            <BadgeCheck className="mr-1 inline h-3.5 w-3.5 text-violet-600" />
            {HERO_TRUST_LINE}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
