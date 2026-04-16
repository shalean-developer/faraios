import Link from "next/link";
import { LayoutGrid, LogOut, UserCircle2, Zap } from "lucide-react";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { getPrimaryCompanySlugForUser } from "@/lib/services/routing";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export type NavbarActiveNav = "app" | "pricing" | "dashboard" | "project";

export type NavbarProps = {
  /** Highlights Home or Pricing; omit on pages without center nav. */
  activeNav?: NavbarActiveNav;
};

const navLinkClass = (active: boolean) =>
  cn(
    "text-sm font-medium transition-colors",
    active
      ? "text-[#7C3AED]"
      : "text-muted-foreground hover:text-foreground"
  );

export async function Navbar({ activeNav }: NavbarProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOutAction() {
    "use server";

    const actionClient = await createClient();
    await actionClient.auth.signOut();
    redirect("/");
  }

  const primaryCompanySlug = user
    ? await getPrimaryCompanySlugForUser(user.id)
    : null;
  const appHref = "/app";
  const dashboardHref = primaryCompanySlug
    ? `/${encodeURIComponent(primaryCompanySlug)}/dashboard`
    : appHref;
  const projectHref = primaryCompanySlug
    ? `/${encodeURIComponent(primaryCompanySlug)}/project`
    : appHref;
  const logoHref = user ? appHref : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:h-16 md:flex-row md:items-center md:justify-between md:gap-0 md:py-0">
        <div className="flex items-center justify-between md:contents">
          <Link
            href={logoHref}
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
            <Actions
              isAuthenticated={Boolean(user)}
              activeNav={activeNav}
              appHref={appHref}
              dashboardHref={dashboardHref}
              projectHref={projectHref}
              onSignOut={signOutAction}
            />
          </div>
        </div>

        <nav
          className="flex justify-center gap-8 md:flex-1 md:justify-center"
          aria-label="Primary"
        >
          {user ? (
            <>
              <Link href={appHref} className={navLinkClass(activeNav === "app")}>
                App
              </Link>
              <Link
                href={dashboardHref}
                className={navLinkClass(activeNav === "dashboard")}
              >
                Dashboard
              </Link>
              <Link
                href={projectHref}
                className={navLinkClass(activeNav === "project")}
              >
                Project
              </Link>
            </>
          ) : (
            <Link href="/pricing" className={navLinkClass(activeNav === "pricing")}>
              Pricing
            </Link>
          )}
        </nav>

        <div
          className={cn(
            "hidden items-center justify-end gap-2 sm:gap-3 md:flex md:flex-1"
          )}
        >
          <Actions
            isAuthenticated={Boolean(user)}
            activeNav={activeNav}
            appHref={appHref}
            dashboardHref={dashboardHref}
            projectHref={projectHref}
            onSignOut={signOutAction}
          />
        </div>
      </div>
    </header>
  );
}

function Actions({
  isAuthenticated,
  activeNav,
  appHref,
  dashboardHref,
  projectHref,
  onSignOut,
}: {
  isAuthenticated: boolean;
  activeNav?: NavbarActiveNav;
  appHref: string;
  dashboardHref: string;
  projectHref: string;
  onSignOut: () => Promise<void>;
}) {
  if (!isAuthenticated) {
    return (
      <>
        <Link
          href="/auth/sign-in"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 gap-1.5 rounded-xl border-border/80 bg-background px-4 shadow-sm transition-all hover:border-[#7C3AED]/30 hover:bg-violet-50/80 hover:text-[#7C3AED] active:translate-y-px"
          )}
        >
          <LayoutGrid className="size-4" aria-hidden />
          Login
        </Link>
        <Link
          href="/auth/sign-up"
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

  return (
    <>
      <details className="group relative">
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 list-none gap-1.5 rounded-xl border-border/80 bg-background px-4 shadow-sm transition-all hover:border-[#7C3AED]/30 hover:bg-violet-50/80 hover:text-[#7C3AED] active:translate-y-px"
          )}
        >
          <UserCircle2 className="size-4" aria-hidden />
          Account
        </summary>
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border/80 bg-background p-2 shadow-lg">
          <Link
            href={appHref}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
              activeNav === "app" ? "text-[#7C3AED]" : "text-foreground"
            )}
          >
            App
          </Link>
          <Link
            href={dashboardHref}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
              activeNav === "dashboard" ? "text-[#7C3AED]" : "text-foreground"
            )}
          >
            Dashboard
          </Link>
          <Link
            href={projectHref}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
              activeNav === "project" ? "text-[#7C3AED]" : "text-foreground"
            )}
          >
            Project
          </Link>
          <Link
            href="/pricing"
            className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-violet-50 hover:text-[#7C3AED]"
          >
            Billing
          </Link>
          <form action={onSignOut}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-violet-50 hover:text-[#7C3AED]"
            >
              <LogOut className="size-4" aria-hidden />
              Logout
            </button>
          </form>
        </div>
      </details>
    </>
  );
}
