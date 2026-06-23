import Link from "next/link";
import { LayoutGrid, LogOut, UserCircle2 } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { FaraiLogo } from "@/components/brand/farai-logo";
import { buttonVariants } from "@/components/ui/button";
import { isPlatformAdminUser } from "@/lib/auth/post-login-redirect";
import { getPrimaryCompanySlugForUser } from "@/lib/services/routing";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export type NavbarActiveNav = "app" | "pricing" | "dashboard" | "project";

export type NavbarProps = {
  /** Highlights Home or Pricing; omit on pages without center nav. */
  activeNav?: NavbarActiveNav;
  /** Slim header for company workspace (sidebar handles navigation). */
  variant?: "default" | "workspace";
};

const navLinkClass = (active: boolean) =>
  cn(
    "text-sm font-medium transition-colors",
    active
      ? "text-[#7C3AED]"
      : "text-muted-foreground hover:text-foreground"
  );

export async function Navbar({ activeNav, variant = "default" }: NavbarProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryCompanySlug = user
    ? await getPrimaryCompanySlugForUser(user.id)
    : null;
  const isPlatformAdmin = user
    ? await isPlatformAdminUser(supabase, user.id)
    : false;
  const appHref = isPlatformAdmin ? "/admin" : "/app";
  const dashboardHref = isPlatformAdmin
    ? "/admin"
    : primaryCompanySlug
      ? `/${encodeURIComponent(primaryCompanySlug)}/dashboard`
      : appHref;
  const pipelineHref = "/admin/pipeline";
  const logoHref = user ? appHref : "/";

  const isWorkspace = variant === "workspace";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 sm:px-6",
          isWorkspace
            ? "h-16 w-full"
            : "mx-auto max-w-6xl flex-col gap-4 py-4 md:h-16 md:flex-row md:py-0"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between",
            isWorkspace ? "shrink-0" : "md:contents"
          )}
        >
          <Link
            href={logoHref}
            className={cn(
              "flex shrink-0 items-center transition-opacity hover:opacity-90",
              !isWorkspace && "md:flex-1"
            )}
          >
            <FaraiLogo size="header" priority />
          </Link>

          {!isWorkspace ? (
            <div className="flex items-center gap-2 sm:gap-3 md:hidden">
              <Actions
                isAuthenticated={Boolean(user)}
                activeNav={activeNav}
                isPlatformAdmin={isPlatformAdmin}
                appHref={appHref}
                dashboardHref={dashboardHref}
                pipelineHref={pipelineHref}
                onSignOut={signOutAction}
              />
            </div>
          ) : null}
        </div>

        {!isWorkspace ? (
          <nav
            className="flex justify-center gap-8 md:flex-1 md:justify-center"
            aria-label="Primary"
          >
            {user ? (
              isPlatformAdmin ? (
                <>
                  <Link href={appHref} className={navLinkClass(activeNav === "app")}>
                    Admin
                  </Link>
                  <Link
                    href={pipelineHref}
                    className={navLinkClass(activeNav === "project")}
                  >
                    Client projects
                  </Link>
                </>
              ) : (
                <Link
                  href={dashboardHref}
                  className={navLinkClass(activeNav === "dashboard")}
                >
                  Workspace
                </Link>
              )
            ) : (
              <Link href="/pricing" className={navLinkClass(activeNav === "pricing")}>
                Pricing
              </Link>
            )}
          </nav>
        ) : (
          <div className="hidden min-w-0 flex-1 sm:block" aria-hidden />
        )}

        <div
          className={cn(
            "flex items-center justify-end gap-2 sm:gap-3",
            isWorkspace ? "shrink-0" : "hidden md:flex md:flex-1"
          )}
        >
          <Actions
            isAuthenticated={Boolean(user)}
            activeNav={activeNav}
            isPlatformAdmin={isPlatformAdmin}
            appHref={appHref}
            dashboardHref={dashboardHref}
            pipelineHref={pipelineHref}
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
  isPlatformAdmin,
  appHref,
  dashboardHref,
  pipelineHref,
  onSignOut,
}: {
  isAuthenticated: boolean;
  activeNav?: NavbarActiveNav;
  isPlatformAdmin: boolean;
  appHref: string;
  dashboardHref: string;
  pipelineHref: string;
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
          {isPlatformAdmin ? (
            <>
              <Link
                href={appHref}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
                  activeNav === "app" ? "text-[#7C3AED]" : "text-foreground"
                )}
              >
                Admin
              </Link>
              <Link
                href={pipelineHref}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
                  activeNav === "project" ? "text-[#7C3AED]" : "text-foreground"
                )}
              >
                Client projects
              </Link>
            </>
          ) : (
            <Link
              href={dashboardHref}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-[#7C3AED]",
                activeNav === "dashboard" ? "text-[#7C3AED]" : "text-foreground"
              )}
            >
              Workspace
            </Link>
          )}
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
