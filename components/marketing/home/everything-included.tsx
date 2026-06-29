"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import {
  landingContainer,
  landingSectionPad,
  landingSectionTitle,
} from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { EVERYTHING_INCLUDED } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

export function EverythingIncluded({ showId = true }: { showId?: boolean }) {
  return (
    <section
      {...(showId ? { id: "features" } : {})}
      className={cn(landingSectionPad, sectionScrollClass, "bg-white")}
    >
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10 text-center"
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            Everything your service business needs
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-slate-600">
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
              className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
