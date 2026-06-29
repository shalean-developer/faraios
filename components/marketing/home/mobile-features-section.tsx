"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import {
  landingContainer,
  landingGrid2Col,
  landingSectionPad,
  landingSectionSubtitle,
  landingSectionTitle,
} from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { PhoneMockup } from "@/components/marketing/home/ui-mockups";
import { MOBILE_FEATURE_SECTIONS } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

function MobileScreenContent({ index }: { index: number }) {
  const screens = [
    {
      title: "Today's schedule",
      items: ["House clean · 09:00", "Office clean · 13:00", "Deep clean · 16:00"],
    },
    {
      title: "Book a service",
      items: ["Select service", "Choose date", "Confirm booking"],
    },
    {
      title: "Job details",
      items: ["Customer: Sarah M.", "Address: Sandton", "Status: En route"],
    },
  ];
  const screen = screens[index] ?? screens[0];

  return (
    <div className="flex h-full flex-col px-4 pb-5">
      <p className="text-xs font-bold text-slate-900">{screen.title}</p>
      <div className="mt-3 space-y-2">
        {screen.items.map((item) => (
          <div
            key={item}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
      <div className="mt-auto pt-8">
        <div className="rounded-xl bg-emerald-600 py-2 text-center text-xs font-semibold text-white">
          Open in FaraiOS
        </div>
      </div>
    </div>
  );
}

export function MobileFeaturesSection() {
  return (
    <>
      {MOBILE_FEATURE_SECTIONS.map((section, index) => (
        <section
          key={section.title}
          className={cn(
            landingSectionPad,
            sectionScrollClass,
            index % 2 === 0 ? "bg-white" : "bg-sky-50/60"
          )}
        >
          <div className={cn(landingContainer, landingGrid2Col)}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className={cn(section.reversed ? "lg:order-2" : "lg:order-1")}
            >
              <motion.h2 variants={fadeUp} className={landingSectionTitle}>
                {section.title}
              </motion.h2>
              <motion.p variants={fadeUp} className={landingSectionSubtitle}>
                {section.description}
              </motion.p>
              <motion.ul variants={fadeUp} className="mt-6 space-y-3">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2.5 text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    {bullet}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className={cn(
                "flex justify-center",
                section.reversed ? "lg:order-1" : "lg:order-2"
              )}
            >
              <PhoneMockup>
                <MobileScreenContent index={index} />
              </PhoneMockup>
            </motion.div>
          </div>
        </section>
      ))}
    </>
  );
}
