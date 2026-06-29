"use client";

import { motion } from "framer-motion";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import {
  landingContainer,
  landingSectionPadCompact,
} from "@/components/marketing/home/landing-styles";
import {
  SOCIAL_PROOF_HEADLINE,
  SOCIAL_PROOF_LOGOS,
} from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

export function SocialProof() {
  return (
    <section
      className={cn(
        landingSectionPadCompact,
        sectionScrollClass,
        "border-y border-slate-100 bg-white"
      )}
    >
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center"
        >
          <motion.p variants={fadeUp} className="text-sm font-medium text-slate-500">
            {SOCIAL_PROOF_HEADLINE}
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {SOCIAL_PROOF_LOGOS.map((name) => (
              <span
                key={name}
                className="text-base font-bold tracking-tight text-slate-300 transition-colors hover:text-slate-400"
              >
                {name}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
