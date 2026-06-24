"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Cpu,
  Dumbbell,
  Heart,
  Paintbrush,
  Plane,
  Shield,
  Sparkles,
  Trees,
  Zap,
} from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { INDUSTRY_CARDS, type IndustryCardIcon } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

function IndustryIcon({ icon }: { icon: IndustryCardIcon }) {
  const className = "h-6 w-6 text-violet-600";
  switch (icon) {
    case "sparkles":
      return <Sparkles className={className} />;
    case "heart":
      return <Heart className={className} />;
    case "cpu":
      return <Cpu className={className} />;
    case "plane":
      return <Plane className={className} />;
    case "paintbrush":
      return <Paintbrush className={className} />;
    case "zap":
      return <Zap className={className} />;
    case "dumbbell":
      return <Dumbbell className={className} />;
    case "trees":
      return <Trees className={className} />;
    case "shield":
      return <Shield className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function IndustriesSection({ highlightSlug }: { highlightSlug?: string }) {
  return (
    <section className={`border-t border-gray-100 bg-white px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="mb-2 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl"
          >
            Industries we serve
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-10 text-center text-gray-500">
            Purpose-built defaults for the way your type of business works.
          </motion.p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRY_CARDS.map((ind) => {
              const highlighted = highlightSlug === ind.slug;
              return (
              <motion.div
                key={ind.slug}
                variants={fadeUp}
                id={ind.slug}
                className={cn(
                  "rounded-2xl border bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-sm transition-shadow hover:shadow-md",
                  highlighted
                    ? "border-violet-400 ring-2 ring-violet-200"
                    : "border-gray-100"
                )}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                  <IndustryIcon icon={ind.icon} />
                </div>
                <h3 className="font-bold text-gray-900">{ind.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{ind.description}</p>
              </motion.div>
            );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
