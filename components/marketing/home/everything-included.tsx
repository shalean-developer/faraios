"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { EVERYTHING_INCLUDED } from "@/lib/data/home-marketing";

export function EverythingIncluded({ showId = true }: { showId?: boolean }) {
  return (
    <section
      {...(showId ? { id: "features" } : {})}
      className={`px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Everything your service business needs
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-gray-500">
            One platform with the depth to run operations, revenue, growth, and team.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="flex flex-wrap justify-center gap-3"
        >
          {EVERYTHING_INCLUDED.map((feature) => (
            <motion.div
              key={feature}
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm"
            >
              <Check className="h-3.5 w-3.5 text-violet-600" />
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
