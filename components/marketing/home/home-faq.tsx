"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { faqItems } from "@/lib/data/pricing";

export function HomeFaq() {
  return (
    <section
      id="faq"
      className={`bg-gray-50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10 text-center"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-700"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Got questions?
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-sm text-gray-500">
            Everything you need to know before getting started.
          </motion.p>
        </motion.div>

        <Accordion className="space-y-3">
          {faqItems.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
