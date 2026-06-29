"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import {
  landingContainer,
  landingSectionX,
  marketingHeroPad,
  marketingHeroSection,
  marketingPageLead,
  marketingPageTitle,
} from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { cn } from "@/lib/utils";

type MarketingPageHeroProps = {
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  align?: "center" | "left";
};

export function MarketingPageHero({
  badge,
  title,
  description,
  children,
  align = "center",
}: MarketingPageHeroProps) {
  const left = align === "left";

  return (
    <section className={cn(marketingHeroSection, landingSectionX, marketingHeroPad)}>
      <div className={cn(landingContainer, left ? "text-left" : "text-center")}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          {badge}
          <h1 className={cn(marketingPageTitle, badge ? "mt-6" : undefined)}>{title}</h1>
          {description ? (
            <p className={cn(marketingPageLead, left && "mx-0 max-w-2xl")}>{description}</p>
          ) : null}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
