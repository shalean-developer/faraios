import Link from "next/link";
import { LayoutGrid, Zap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavbarActiveNav = "home" | "projects";

export type NavbarProps = {
  /** Highlights Home or My Projects; omit on pages without center nav (e.g. marketing). */
  activeNav?: NavbarActiveNav;
};

const navLinkClass = (active: boolean) =>
  cn(
    "text-sm font-medium transition-colors",
    active
      ? "text-[#7C3AED]"
      : "text-muted-foreground hover:text-foreground"
  );

export function Navbar({ activeNav }: NavbarProps) {
  const showCenterNav = activeNav !== undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:h-16 md:flex-row md:items-center md:justify-between md:gap-0 md:py-0">
        <div className="flex items-center justify-between md:contents">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 md:flex-1"
          >
            <span
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-sm"
              aria-hidden
            >
              <Zap className="size-5" strokeWidth={2.25} />
            </span>
            FaraiOS
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 md:hidden">
            <Actions />
          </div>
        </div>

        {showCenterNav && (
          <nav
            className="flex justify-center gap-8 md:flex-1 md:justify-center"
            aria-label="Primary"
          >
            <Link
              href="/"
              className={navLinkClass(activeNav === "home")}
            >
              Home
            </Link>
            <Link
              href="/dashboard/projects"
              className={navLinkClass(activeNav === "projects")}
            >
              My Projects
            </Link>
          </nav>
        )}

        <div
          className={cn(
            "hidden items-center justify-end gap-2 sm:gap-3 md:flex md:flex-1"
          )}
        >
          <Actions />
        </div>
      </div>
    </header>
  );
}

function Actions() {
  return (
    <>
      <Link
        href="/dashboard/projects"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-10 gap-1.5 rounded-xl border-border/80 bg-background px-4 shadow-sm transition-all hover:border-[#7C3AED]/30 hover:bg-violet-50/80 hover:text-[#7C3AED] active:translate-y-px"
        )}
      >
        <LayoutGrid className="size-4" aria-hidden />
        Dashboard
      </Link>
      <Link
        href="/get-started"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 rounded-xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-5 text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg active:translate-y-px"
        )}
      >
        Get Started
      </Link>
    </>
  );
}
