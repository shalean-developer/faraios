"use client";

import { motion } from "framer-motion";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import {
  CLIENT_EXAMPLES,
  SOCIAL_PROOF_STATS,
  SOCIAL_PROOF_TAGLINE,
} from "@/lib/data/home-marketing";

export function SocialProof() {
  return (
    <section className={`border-y border-gray-100 bg-white px-4 py-16 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SOCIAL_PROOF_STATS.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <p className="text-3xl font-extrabold text-violet-600">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            className="mt-10 text-center text-sm leading-relaxed text-gray-500"
          >
            {SOCIAL_PROOF_TAGLINE}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            {CLIENT_EXAMPLES.map((name) => (
              <span
                key={name}
                className="rounded-full border border-violet-100 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700"
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
