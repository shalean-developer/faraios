"use client";

import { motion } from "framer-motion";

import {
  BookingFlowDesktopPreview,
  BookingFlowMobilePreview,
  PhoneMockup,
} from "@/components/marketing/home/ui-mockups";
import { landingSectionSubtitle, landingSectionTitle } from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";

export function BookingSystemSection() {
  return (
    <section
      className={`bg-gradient-to-b from-sky-50 to-blue-50/50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            A complete booking system for your business
          </motion.h2>
          <motion.p variants={fadeUp} className={`mx-auto max-w-2xl ${landingSectionSubtitle}`}>
            Give customers a professional booking experience on desktop and mobile — while your
            team sees every job in the FaraiOS dashboard.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative mx-auto w-full max-w-4xl"
        >
          <BookingFlowDesktopPreview className="w-full sm:pr-24" />

          <PhoneMockup
            edgeToEdge
            className="absolute -right-1 top-[2.375rem] z-20 hidden h-[calc(220px*19.5/9)] w-[220px] sm:block"
          >
            <BookingFlowMobilePreview />
          </PhoneMockup>

          <div className="mt-8 flex justify-center sm:hidden">
            <PhoneMockup edgeToEdge className="w-[min(100%,240px)]">
              <BookingFlowMobilePreview />
            </PhoneMockup>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
