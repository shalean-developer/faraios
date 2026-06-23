"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/templates/service-business/content";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-6 sm:py-6"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span className="text-base font-semibold text-slate-900 sm:text-lg">
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open ? (
              <div className="border-t border-slate-100 px-5 pb-5 pt-2 text-base leading-relaxed text-slate-600 sm:px-6 sm:pb-6 sm:text-lg">
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
