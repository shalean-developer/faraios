import { Headphones, Shield, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Fast Delivery",
    description:
      "Your website built and launched within 5–7 business days.",
  },
  {
    icon: Shield,
    title: "Professional Quality",
    description:
      "Expert designers and developers crafting pixel-perfect sites.",
  },
  {
    icon: Headphones,
    title: "Ongoing Support",
    description:
      "We stay with you post-launch for edits and improvements.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="border-t border-border/40 bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className={cn(
                "group rounded-2xl border border-border/70 bg-card p-8 shadow-sm",
                "transition-all duration-300 hover:-translate-y-1 hover:border-violet-200/80 hover:shadow-md dark:hover:border-violet-500/20"
              )}
            >
              <div
                className="mb-5 flex size-12 items-center justify-center rounded-xl bg-violet-100 text-[#7C3AED] shadow-inner dark:bg-violet-950/50 dark:text-violet-300"
                aria-hidden
              >
                <Icon className="size-6" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
