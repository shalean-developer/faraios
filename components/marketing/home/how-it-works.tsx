"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  CreditCard,
  Rocket,
  Settings,
} from "lucide-react";

import {
  landingContainer,
  landingSectionHeader,
  landingSectionPad,
  landingSectionTitle,
} from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { HOW_IT_WORKS_STEPS } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

const STEP_ICONS = [ClipboardList, Settings, CreditCard, Rocket] as const;

export function HowItWorks() {
  return (
    <section className={cn(landingSectionPad, sectionScrollClass, "bg-slate-50")}>
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className={landingSectionHeader}
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            How FaraiOS works
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-slate-600">
            From workspace setup to growth — everything stays connected.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((item, i) => {
            const Icon = STEP_ICONS[i] ?? ClipboardList;
            return (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                  Step {item.step}
                </p>
                <h3 className="mt-2 font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
