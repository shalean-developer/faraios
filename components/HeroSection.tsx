import Link from "next/link";
import { ArrowRight, Eye, Sparkles, Globe } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 shadow-sm transition-colors dark:border-violet-500/20 dark:bg-violet-950/40 dark:text-violet-200">
            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-300" aria-hidden />
            Done-For-You Website Service
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Let FaraiOS Build Your
            <span className="mt-1 block bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] bg-clip-text text-transparent sm:mt-2">
              Website For You
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            We design, build, and launch your website while you focus on your
            business. Professional results. Zero technical hassle.
          </p>

          <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href="/auth/sign-up"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-8 text-base text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl active:translate-y-px"
              )}
            >
              Get Started
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/examples"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 gap-2 rounded-2xl border-border/80 bg-background px-8 text-base shadow-sm transition-all hover:border-violet-300/80 hover:bg-muted/50 hover:shadow-md active:translate-y-px"
              )}
            >
              <Eye className="size-4" aria-hidden />
              View Examples
            </Link>
          </div>

          <div
            className="mt-16 w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg shadow-black/5"
            role="img"
            aria-label="Preview of your website in a browser window"
          >
            <div className="flex items-center gap-2 border-b border-border/80 bg-muted/60 px-4 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-3 rounded-full bg-red-400/90" />
                <span className="size-3 rounded-full bg-amber-400/90" />
                <span className="size-3 rounded-full bg-emerald-400/90" />
              </div>
              <div className="mx-auto flex min-h-8 flex-1 items-center justify-center rounded-lg border border-border/50 bg-background px-3 text-xs text-muted-foreground shadow-inner">
                yourbusiness.com
              </div>
            </div>
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-6 py-14 text-white sm:min-h-[280px]">
              <Globe className="size-12 opacity-95" strokeWidth={1.25} aria-hidden />
              <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                Your Dream Website
              </p>
              <p className="text-sm text-white/90 sm:text-base">
                Designed &amp; built by FaraiOS
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
