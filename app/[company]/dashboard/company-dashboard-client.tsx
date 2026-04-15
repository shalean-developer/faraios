"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FolderKanban,
  Globe,
  LayoutGrid,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  normalizePlanSlug,
  planLabelForSlug,
} from "@/lib/data/pricing";
import type { CompanyWithIndustry, Project } from "@/types/database";

type Props = {
  slug: string;
  company: CompanyWithIndustry | null;
  projects: Project[];
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

function formatProjectStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    in_progress: "In progress",
    review: "In review",
    completed: "Completed",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function countActiveProjects(list: Project[]): number {
  return list.filter((p) => p.status !== "completed").length;
}

export function CompanyDashboardClient({
  slug,
  company,
  projects,
}: Props) {
  const title = company?.name ?? slug.replace(/-/g, " ");
  const planSlug = normalizePlanSlug(company?.plan);
  const planLabel = planLabelForSlug(planSlug);
  const totalProjects = projects.length;
  const activeProjects = countActiveProjects(projects);
  const base = `/${encodeURIComponent(slug)}`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f6fb]">
      <motion.div
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7C3AED] transition-colors hover:text-[#5b21b6]"
          >
            ← Back to home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.header
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.12]"
            style={{
              background:
                "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Workspace
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                Welcome to your business dashboard
              </p>
              {company?.industries?.name ? (
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {company.industries.name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${base}/project`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-5 text-white shadow-md shadow-violet-200/50 hover:brightness-110"
                )}
              >
                <Zap className="mr-2 h-4 w-4" aria-hidden />
                Open project
              </Link>
            </div>
          </div>
        </motion.header>

        {!company ? (
          <motion.div
            variants={fadeUp}
            className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 text-center shadow-sm"
          >
            <p className="text-sm text-slate-600">
              No company found for{" "}
              <span className="font-mono font-medium text-slate-900">
                {slug}
              </span>
              . It may not exist yet, or Supabase env is not configured.
            </p>
            <Link
              href="/get-started"
              className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-xl")}
            >
              Start onboarding
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <motion.div
              variants={fadeUp}
              className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <StatCard
                icon={<FolderKanban className="h-5 w-5 text-violet-600" />}
                label="Total projects"
                value={String(totalProjects)}
                hint="In this workspace"
              />
              <StatCard
                icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
                label="Active projects"
                value={String(activeProjects)}
                hint="Not yet completed"
              />
              <StatCard
                icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
                label="Subscription plan"
                value={planLabel}
                hint="Current tier"
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
                label="Status"
                value="Active"
                hint="Account in good standing"
                valueClass="text-emerald-600"
              />
            </motion.div>

            {/* Quick actions */}
            <motion.section variants={fadeUp} className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quick actions
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  href={`${base}/project`}
                  icon={<LayoutGrid className="h-5 w-5" />}
                  title="View project"
                  subtitle="Pipeline & milestones"
                />
                <QuickAction
                  href={`${base}/project`}
                  icon={<Globe className="h-5 w-5" />}
                  title="Manage website"
                  subtitle="Build & launch"
                />
                <QuickAction
                  href="#bookings"
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Booking system"
                  subtitle="Jobs & calendar"
                />
                <QuickAction
                  href="/dashboard"
                  icon={<Settings className="h-5 w-5" />}
                  title="Settings"
                  subtitle="Account & workspace"
                />
              </div>
            </motion.section>

            {/* Projects list */}
            <motion.section variants={fadeUp} className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Projects
                  </h2>
                  <p className="text-sm text-slate-500">
                    All projects linked to this company in FaraiOS.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {projects.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <p className="text-sm text-slate-500">
                      No projects yet. Complete onboarding or open your project
                      hub to create the first build.
                    </p>
                    <Link
                      href="/get-started"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "mt-4 rounded-xl"
                      )}
                    >
                      Get started
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <div className="hidden grid-cols-[1fr_120px_140px_auto] gap-4 bg-slate-50/90 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid">
                      <span>Name</span>
                      <span>Status</span>
                      <span>Created</span>
                      <span className="text-right">Action</span>
                    </div>
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50/50 lg:grid lg:grid-cols-[1fr_120px_140px_auto] lg:items-center lg:gap-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {p.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400 lg:hidden">
                            {formatProjectStatus(p.status)} ·{" "}
                            {new Date(p.created_at).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="hidden lg:block">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              p.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                                : p.status === "in_progress"
                                  ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100"
                                  : "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                            )}
                          >
                            {formatProjectStatus(p.status)}
                          </span>
                        </div>
                        <div className="hidden text-sm text-slate-600 lg:block">
                          {new Date(p.created_at).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex justify-end">
                          <Link
                            href={`${base}/project`}
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "sm",
                              }),
                              "rounded-xl border-slate-200 font-semibold"
                            )}
                          >
                            View project
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>

            {/* Bookings anchor */}
            <motion.section
              id="bookings"
              variants={fadeUp}
              className="mt-10 scroll-mt-24 rounded-2xl border border-dashed border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Booking system
                  </h2>
                  <p className="mt-1 max-w-lg text-sm text-slate-500">
                    Scheduling, quotes, and job management will connect here as
                    your site goes live. Track everything next to your website
                    project.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 rounded-xl"
                  disabled
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Coming soon
                </Button>
              </div>
            </motion.section>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight text-slate-900",
          valueClass
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const inner = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-700 ring-1 ring-violet-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </>
  );

  const className =
    "flex w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-md";

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
