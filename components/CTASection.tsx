import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CTASection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-8 py-14 text-center shadow-xl shadow-violet-500/20 sm:px-12 sm:py-16">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Ready to launch your website?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-white/90 sm:text-lg">
            Join hundreds of businesses that trust FaraiOS to build their
            online presence.
          </p>
          <Link
            href="/get-started"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-10 inline-flex h-12 gap-2 rounded-2xl border-0 bg-white px-8 text-base font-semibold text-[#5B21B6] shadow-lg transition-all hover:bg-white/95 hover:shadow-xl active:translate-y-px"
            )}
          >
            Start Your Project
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
