"use client";

import Link from "next/link";
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

import { landingSectionSubtitle, landingSectionTitle } from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { INDUSTRY_CARDS, type IndustryCardIcon } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

function IndustryIcon({ icon, className }: { icon: IndustryCardIcon; className?: string }) {
  const props = { className: cn("h-5 w-5", className) };
  switch (icon) {
    case "sparkles":
      return <Sparkles {...props} />;
    case "heart":
      return <Heart {...props} />;
    case "cpu":
      return <Cpu {...props} />;
    case "plane":
      return <Plane {...props} />;
    case "paintbrush":
      return <Paintbrush {...props} />;
    case "zap":
      return <Zap {...props} />;
    case "dumbbell":
      return <Dumbbell {...props} />;
    case "trees":
      return <Trees {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "briefcase":
      return <Briefcase {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

const iconColors = [
  "bg-emerald-100 text-emerald-600",
  "bg-pink-100 text-pink-600",
  "bg-blue-100 text-blue-600",
  "bg-amber-100 text-amber-600",
  "bg-orange-100 text-orange-600",
  "bg-yellow-100 text-yellow-700",
  "bg-violet-100 text-violet-600",
  "bg-teal-100 text-teal-600",
  "bg-slate-100 text-slate-600",
  "bg-indigo-100 text-indigo-600",
];

export function IndustriesSection({ highlightSlug }: { highlightSlug?: string }) {
  return (
    <section className={`bg-white px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid items-center gap-12 lg:grid-cols-[1fr_auto]"
        >
          <div>
            <motion.h2 variants={fadeUp} className={landingSectionTitle}>
              Built for every type of service business
            </motion.h2>
            <motion.p variants={fadeUp} className={landingSectionSubtitle}>
              FaraiOS adapts to your industry with smart defaults for bookings, services, and
              workflows — so you can launch faster.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 columns-1 gap-x-8 sm:columns-2">
              {INDUSTRY_CARDS.map((ind, i) => (
                <Link
                  key={ind.slug}
                  href={`/industries/${ind.slug}`}
                  id={ind.slug}
                  className={cn(
                    "mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-emerald-700",
                    highlightSlug === ind.slug && "font-bold text-emerald-700"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      iconColors[i % iconColors.length]
                    )}
                  >
                    <IndustryIcon icon={ind.icon} />
                  </span>
                  {ind.name}
                </Link>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6">
              <Link
                href="/industries"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View all industries →
              </Link>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="hidden shrink-0 grid-cols-5 gap-3 self-center lg:grid"
          >
            {INDUSTRY_CARDS.map((ind, i) => (
              <div
                key={ind.slug}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full shadow-sm",
                  iconColors[i % iconColors.length]
                )}
                title={ind.name}
              >
                <IndustryIcon icon={ind.icon} />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
