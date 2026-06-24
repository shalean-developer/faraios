"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Link2, Search, Server } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import {
  WEBSITE_HOSTING_CARDS,
  WEBSITE_HOSTING_DESCRIPTION,
  WEBSITE_HOSTING_TITLE,
} from "@/lib/data/home-marketing";

const CARD_ICONS = [Link2, Globe, Server, Search] as const;

function HostingCard({
  card,
  icon: Icon,
}: {
  card: (typeof WEBSITE_HOSTING_CARDS)[number];
  icon: typeof Globe;
}) {
  const content = (
    <motion.div
      variants={fadeUp}
      className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
        <Icon className="h-5 w-5 text-violet-600" />
      </div>
      <h3 className="font-bold text-gray-900">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{card.description}</p>
    </motion.div>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

export function WebsiteHosting() {
  return (
    <section
      id="website"
      className={`bg-gray-50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-12 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            {WEBSITE_HOSTING_TITLE}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-gray-500">
            {WEBSITE_HOSTING_DESCRIPTION}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-6 sm:grid-cols-2"
        >
          {WEBSITE_HOSTING_CARDS.map((card, i) => {
            const Icon = CARD_ICONS[i] ?? Globe;
            return (
              <HostingCard key={card.title} card={card} icon={Icon} />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
