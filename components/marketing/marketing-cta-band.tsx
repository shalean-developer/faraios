"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import {
  landingContainer,
  landingSectionPad,
  landingSectionTitle,
  marketingCtaCard,
} from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { cn } from "@/lib/utils";

type MarketingCtaBandProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function MarketingCtaBand({
  title,
  description,
  children,
  className,
}: MarketingCtaBandProps) {
  return (
    <section className={cn(landingSectionPad, "bg-white", className)}>
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className={cn("mx-auto max-w-4xl", marketingCtaCard)}
        >
          <h2 className={landingSectionTitle}>{title}</h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">{description}</p>
          ) : null}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {children}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
