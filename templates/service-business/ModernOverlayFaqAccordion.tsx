"use client";

import { useState, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";

import type { FaqItem } from "@/templates/service-business/content";

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600">
      {open ? <Minus className="h-4 w-4" strokeWidth={2} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
    </span>
  );
}

function FaqAccordionStatic({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.question}
          className="overflow-hidden rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200/60 sm:px-6 sm:py-6"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-semibold text-slate-900 sm:text-lg">{item.question}</span>
            <ToggleIcon open={index === 0} />
          </div>
          {index === 0 ? (
            <p className="mt-4 text-base leading-relaxed text-slate-600">{item.answer}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ModernOverlayFaqAccordion({ items }: { items: FaqItem[] }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [openIndex, setOpenIndex] = useState(0);

  if (!isClient) {
    return <FaqAccordionStatic items={items} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200/60 sm:px-6 sm:py-6"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span className="text-base font-semibold text-slate-900 sm:text-lg">{item.question}</span>
              <ToggleIcon open={open} />
            </button>
            {open ? (
              <p className="mt-4 text-base leading-relaxed text-slate-600">{item.answer}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RenovationIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="h-auto w-full max-w-[280px] text-slate-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="40" y="30" width="240" height="180" rx="4" />
      <line x1="40" y1="150" x2="280" y2="150" />
      <rect x="70" y="55" width="50" height="40" rx="2" />
      <rect x="140" y="55" width="50" height="40" rx="2" />
      <rect x="210" y="55" width="50" height="40" rx="2" />
      <path d="M200 170 L200 90 L230 70 L230 170" />
      <line x1="200" y1="110" x2="230" y2="110" />
      <line x1="200" y1="130" x2="230" y2="130" />
      <circle cx="95" cy="185" r="14" />
      <path d="M95 175 L95 195 M88 182 L102 182" />
      <rect x="130" y="165" width="35" height="25" rx="2" />
    </svg>
  );
}

export { RenovationIllustration };
