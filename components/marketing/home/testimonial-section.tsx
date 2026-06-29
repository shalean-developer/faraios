"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { landingContainer, landingSectionPad } from "@/components/marketing/home/landing-styles";
import { TESTIMONIAL } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

export function TestimonialSection() {
  return (
    <section
      className={cn(
        landingSectionPad,
        sectionScrollClass,
        "bg-gradient-to-br from-amber-50/80 to-orange-50/40"
      )}
    >
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16"
        >
          <motion.div variants={fadeUp}>
            <Quote className="h-10 w-10 text-emerald-600/40" />
            <blockquote className="mt-4 text-2xl font-medium leading-relaxed text-slate-800 sm:text-3xl">
              &ldquo;{TESTIMONIAL.quote}&rdquo;
            </blockquote>
            <footer className="mt-6">
              <p className="font-bold text-slate-900">{TESTIMONIAL.name}</p>
              <p className="text-sm text-slate-500">{TESTIMONIAL.role}</p>
            </footer>
          </motion.div>

          <motion.div variants={fadeUp} className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-emerald-200/40 blur-xl" />
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-4xl font-bold text-white shadow-xl sm:h-48 sm:w-48">
                {TESTIMONIAL.initials}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
