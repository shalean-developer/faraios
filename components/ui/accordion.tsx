"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function AccordionRoot({
  className,
  ...props
}: Accordion.Root.Props) {
  return (
    <Accordion.Root className={cn("w-full", className)} {...props} />
  );
}

function AccordionItem({
  className,
  ...props
}: Accordion.Item.Props) {
  return (
    <Accordion.Item
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/15",
        className
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Accordion.Trigger.Props) {
  return (
    <Accordion.Header className="flex">
      <Accordion.Trigger
        className={cn(
          "group/trigger flex flex-1 items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-200 outline-none transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500/50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-data-[panel-open]/trigger:rotate-180" />
      </Accordion.Trigger>
    </Accordion.Header>
  );
}

function AccordionContent({
  className,
  ...props
}: Accordion.Panel.Props) {
  return (
    <Accordion.Panel
      className={cn(
        "overflow-hidden px-5 pb-5 pl-[3.25rem] text-sm leading-relaxed text-slate-400",
        className
      )}
      keepMounted={false}
      {...props}
    />
  );
}

export {
  AccordionRoot as Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
