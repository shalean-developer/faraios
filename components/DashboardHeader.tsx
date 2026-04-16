import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  return (
    <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-[#7C3AED]">
          <LayoutGrid className="size-4" aria-hidden />
          My Projects
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your Website Projects
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Track the progress of your custom-built websites
        </p>
      </div>

      <Link
        href="/onboarding"
        className={cn(
          buttonVariants({ size: "lg" }),
          "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-6 text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg active:translate-y-px md:self-start"
        )}
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        Start Project
      </Link>
    </div>
  );
}
