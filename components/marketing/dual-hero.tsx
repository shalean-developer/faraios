"use client";

import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

import { EmailSignupForm } from "@/components/marketing/home/email-signup-form";
import { HeroVisualCollage } from "@/components/marketing/home/hero-visual-collage";
import {
  HERO_HEADLINE,
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

type Props = {
  onGetStarted?: () => void;
};

export function DualHero({ onGetStarted }: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/40 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
          >
            {HERO_HEADLINE}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
          >
            {HERO_SUBHEADLINE}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <EmailSignupForm onGetStarted={onGetStarted} size="lg" />
          </motion.div>

          <motion.p variants={fadeUp} className="mt-5 text-sm text-slate-500">
            <BadgeCheck className="mr-1 inline h-4 w-4 text-emerald-600" />
            {HERO_TRUST_LINE}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
        >
          <HeroVisualCollage />
        </motion.div>
      </div>
    </section>
  );
}
