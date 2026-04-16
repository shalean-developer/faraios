"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
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
import { createBookingForCompany } from "@/app/actions/bookings";
import {
  connectDomainAction,
  publishWebsiteAction,
  updateWebsiteSeoAction,
} from "@/app/actions/websites";
import {
  normalizePlanSlug,
  planLabelForSlug,
} from "@/lib/data/pricing";
import type {
  Booking,
  CompanyWithIndustry,
  Project,
  Website,
} from "@/types/database";

type Props = {
  slug: string;
  company: CompanyWithIndustry | null;
  projects: Project[];
  bookings: Booking[];
  website: Website | null;
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
  bookings,
  website,
}: Props) {
  const title = company?.name ?? slug.replace(/-/g, " ");
  const planSlug = normalizePlanSlug(company?.plan);
  const planLabel = planLabelForSlug(planSlug);
  const totalProjects = projects.length;
  const activeProjects = countActiveProjects(projects);
  const base = `/${encodeURIComponent(slug)}`;
  const [bookingRows, setBookingRows] = useState<Booking[]>(bookings);
  const [customerName, setCustomerName] = useState("");
  const [service, setService] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingPending, setBookingPending] = useState(false);
  const [billingPlan, setBillingPlan] = useState(planSlug);
  const [billingPending, setBillingPending] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState(website?.domain ?? "");
  const [domainPending, setDomainPending] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [publishPending, setPublishPending] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState(website?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    website?.seo_description ?? ""
  );
  const [seoKeywords, setSeoKeywords] = useState(website?.seo_keywords ?? "");
  const [seoPending, setSeoPending] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  const onCreateBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setBookingError(null);
    setBookingPending(true);
    try {
      const result = await createBookingForCompany({
        companyId: company.id,
        companySlug: slug,
        customerName,
        service,
        bookingDate,
      });
      if (!result.ok) {
        setBookingError(result.error);
        return;
      }
      setBookingRows((prev) => [
        {
          id: crypto.randomUUID(),
          company_id: company.id,
          customer_name: customerName.trim(),
          service: service.trim(),
          booking_date: new Date(bookingDate).toISOString(),
          date: new Date(bookingDate).toISOString(),
          status: "pending",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCustomerName("");
      setService("");
      setBookingDate("");
    } finally {
      setBookingPending(false);
    }
  };

  const onStartPayment = async () => {
    if (!company?.id || !company.primary_contact_email) {
      setBillingError("Missing company billing email.");
      return;
    }
    setBillingError(null);
    setBillingPending(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          plan: billingPlan,
          email: company.primary_contact_email,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        authorizationUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.authorizationUrl) {
        setBillingError(data.error ?? "Failed to initialize payment.");
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setBillingError("Could not start payment.");
    } finally {
      setBillingPending(false);
    }
  };

  const onPublishWebsite = async () => {
    if (!website?.id) return;
    setPublishError(null);
    setPublishPending(true);
    try {
      const result = await publishWebsiteAction(website.id, slug);
      if (!result.ok) {
        setPublishError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setPublishPending(false);
    }
  };

  const onConnectDomain = async (event: FormEvent) => {
    event.preventDefault();
    if (!website?.id) return;
    setDomainError(null);
    setDomainPending(true);
    try {
      const result = await connectDomainAction(website.id, domainInput, slug);
      if (!result.ok) {
        setDomainError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setDomainPending(false);
    }
  };

  const onSaveSeo = async (event: FormEvent) => {
    event.preventDefault();
    if (!website?.id) return;
    setSeoError(null);
    setSeoPending(true);
    try {
      const result = await updateWebsiteSeoAction(website.id, slug, {
        seoTitle,
        seoDescription,
        seoKeywords,
      });
      if (!result.ok) {
        setSeoError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setSeoPending(false);
    }
  };

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
              href="/onboarding"
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
                  href={`${base}/dashboard`}
                  icon={<Settings className="h-5 w-5" />}
                  title="Settings"
                  subtitle="Account & workspace"
                />
              </div>
            </motion.section>

            <motion.section variants={fadeUp} className="mt-10">
              <h2 className="text-lg font-bold text-slate-900">Billing</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a plan and continue to secure Paystack checkout.
              </p>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                <select
                  value={billingPlan}
                  onChange={(e) => setBillingPlan(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                  <option value="premium">Premium</option>
                </select>
                <Button
                  onClick={onStartPayment}
                  className="rounded-xl"
                  disabled={billingPending}
                >
                  {billingPending ? "Redirecting..." : "Pay with Paystack"}
                </Button>
              </div>
              {billingError ? (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {billingError}
                </p>
              ) : null}
            </motion.section>

            <motion.section variants={fadeUp} className="mt-10">
              <h2 className="text-lg font-bold text-slate-900">Website publishing</h2>
              {!website ? (
                <p className="mt-2 text-sm text-slate-500">
                  No website draft yet. Use <span className="font-medium">Create website</span> to start.
                </p>
              ) : (
                <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium">
                      Status: {website.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium">
                      Fallback: {website.subdomain}.faraios.com
                    </span>
                  </div>

                  <form onSubmit={onConnectDomain} className="space-y-2">
                    <p className="text-sm font-medium text-slate-800">Connect domain</p>
                    <p className="text-xs text-slate-500">
                      Add an <strong>A</strong> record to Vercel IP or a <strong>CNAME</strong> to
                      <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">cname.vercel-dns.com</code>
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="www.clientbusiness.com"
                      />
                      <Button type="submit" disabled={domainPending}>
                        {domainPending ? "Saving..." : "Save domain"}
                      </Button>
                    </div>
                    {domainError ? (
                      <p className="text-sm font-medium text-red-600">{domainError}</p>
                    ) : null}
                  </form>

                  <div className="flex items-center gap-3">
                    <Button disabled={publishPending} onClick={onPublishWebsite}>
                      {publishPending ? "Publishing..." : "Publish Website"}
                    </Button>
                    <Link
                      href={`/dashboard/websites/${website.id}/edit`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "rounded-xl border-slate-200"
                      )}
                    >
                      Edit content
                    </Link>
                    <p className="text-xs text-slate-500">
                      Only published websites are publicly accessible.
                    </p>
                  </div>
                  {publishError ? (
                    <p className="text-sm font-medium text-red-600">{publishError}</p>
                  ) : null}

                  <form onSubmit={onSaveSeo} className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-800">SEO settings</p>
                    <input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="SEO title"
                    />
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder="SEO description"
                    />
                    <input
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="SEO keywords (comma-separated)"
                    />
                    <Button type="submit" disabled={seoPending}>
                      {seoPending ? "Saving SEO..." : "Save SEO"}
                    </Button>
                    {seoError ? (
                      <p className="text-sm font-medium text-red-600">{seoError}</p>
                    ) : null}
                  </form>
                </div>
              )}
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
                      href="/onboarding"
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
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Booking system
                  </h2>
                  <p className="mt-1 max-w-lg text-sm text-slate-500">
                    Create and track bookings for this company workspace.
                  </p>
                </div>

                <form
                  onSubmit={onCreateBooking}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4"
                >
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Customer name"
                    required
                  />
                  <input
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Service"
                    required
                  />
                  <input
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    type="datetime-local"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    required
                  />
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={bookingPending}
                  >
                    {bookingPending ? "Saving..." : "Create Booking"}
                  </Button>
                </form>
                {bookingError ? (
                  <p className="text-sm font-medium text-red-600">{bookingError}</p>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {bookingRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            No bookings yet.
                          </td>
                        </tr>
                      ) : (
                        bookingRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 text-slate-900">
                              {row.customer_name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.service ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {new Date(
                                row.booking_date ?? row.date ?? ""
                              ).toLocaleString("en-ZA")}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                {row.status ?? "pending"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
