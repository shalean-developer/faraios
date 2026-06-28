"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/templates/service-business/content";
import { luxury } from "@/templates/service-business/luxury-styles";

function LuxuryFaqAccordionStatic({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-[#2d2926]/10 border-y border-[#2d2926]/10">
      {items.map((item, index) => (
        <div key={item.question}>
          <div className="flex w-full items-center justify-between gap-4 py-5 text-left">
            <span
              className="text-base font-medium text-[#2d2926] sm:text-lg"
              style={{ fontFamily: luxury.serif }}
            >
              {item.question}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#2d2926]/50 ${index === 0 ? "rotate-180" : ""}`}
            />
          </div>
          {index === 0 ? (
            <div
              className="pb-5 text-sm leading-relaxed text-[#2d2926]/75 sm:text-base"
              style={{ fontFamily: luxury.sans }}
            >
              {item.answer}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function LuxuryFaqAccordion({ items }: { items: FaqItem[] }) {
  const [mounted, setMounted] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LuxuryFaqAccordionStatic items={items} />;
  }

  return (
    <div className="divide-y divide-[#2d2926]/10 border-y border-[#2d2926]/10">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-5 text-left transition hover:opacity-80"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span
                className="text-base font-medium text-[#2d2926] sm:text-lg"
                style={{ fontFamily: luxury.serif }}
              >
                {item.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#2d2926]/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open ? (
              <div
                className="pb-5 text-sm leading-relaxed text-[#2d2926]/75 sm:text-base"
                style={{ fontFamily: luxury.sans }}
              >
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
