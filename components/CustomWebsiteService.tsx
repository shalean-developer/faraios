"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  LayoutDashboard,
  ChevronRight,
  Star,
  Upload,
  X,
  Calendar,
  Briefcase,
  Eye,
  RefreshCw,
  LogOut,
} from "lucide-react";

import { createCompanyFromOnboarding } from "@/app/actions/onboarding";
import { DualHero } from "@/components/marketing/dual-hero";
import { DashboardPreview } from "@/components/marketing/home/dashboard-preview";
import { HomeMarketingSections } from "@/components/marketing/home-sections";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { getSmartDefaultsForIndustrySlug } from "@/lib/constants/industry-defaults";
import { PAGE_OPTIONS_VISIBLE, syncBlogPageWithFeatures } from "@/lib/constants/onboarding-pages";
import {
  canAddPageToPlan,
  trimPagesToPlanLimit,
} from "@/lib/onboarding/plan-pages";
import {
  normalizePlanSlug,
  planLabelForSlug,
  planPageLimit,
  planPageLimitLabel,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import type { DesignStyle } from "@/types/company";
import {
  type Project,
  type ProjectStatus,
  companyToProject,
} from "@/lib/mappers/company-to-project";
import type { CompanyWithIndustry } from "@/types/database";
import type { Feature } from "@/types/database";
import type { Industry } from "@/types/database";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Screen = "landing" | "form" | "dashboard" | "project-detail";

const statusConfig: Record<
  ProjectStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  "in-progress": {
    label: "In Progress",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  review: {
    label: "In Review",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
};

const timelineSteps = [
  { key: "pending", label: "Request Received", desc: "We have your requirements" },
  { key: "in-progress", label: "Design & Build", desc: "Our team is crafting your site" },
  { key: "review", label: "Review Stage", desc: "Ready for your feedback" },
  { key: "completed", label: "Launched", desc: "Your website is live!" },
];

const statusOrder: ProjectStatus[] = [
  "pending",
  "in-progress",
  "review",
  "completed",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const LandingScreen = ({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) => (
  <div className="min-h-screen bg-white">
    <DualHero onGetStarted={onGetStarted} />
    <DashboardPreview />
    <HomeMarketingSections onGetStarted={onGetStarted} />
    <MarketingFooter />
  </div>
);

const DESIGN_STYLES: { id: DesignStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
];

type WebsiteFormData = {
  businessName: string;
  contactPhone: string;
  projectGoal: string;
  industryId: string;
  planSlug: PricingPlanSlug;
  pages: string[];
  designStyle: DesignStyle | "";
  competitors: string;
  logoName: string;
  featureSlugs: string[];
};

const defaultForm: WebsiteFormData = {
  businessName: "",
  contactPhone: "",
  projectGoal: "",
  industryId: "",
  planSlug: "starter",
  pages: [],
  designStyle: "",
  competitors: "",
  logoName: "",
  featureSlugs: [],
};

const RequirementsForm = ({
  industries,
  features,
  onSubmit,
  submitError,
  isSubmitting,
}: {
  industries: Industry[];
  features: Feature[];
  onSubmit: (data: WebsiteFormData) => void | Promise<void>;
  submitError: string | null;
  isSubmitting: boolean;
}) => {
  const [form, setForm] = useState<WebsiteFormData>({ ...defaultForm });
  const [step, setStep] = useState<"form" | "review">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof WebsiteFormData, string>>
  >({});
  const [dragOver, setDragOver] = useState(false);

  const pageLimit = planPageLimit(form.planSlug);
  const selectedIndustryName =
    industries.find((i) => i.id === form.industryId)?.name ?? null;

  const applyIndustry = (id: string) => {
    const row = industries.find((i) => i.id === id);
    if (!row) return;
    const { pages, featureSlugs } = getSmartDefaultsForIndustrySlug(row.slug);
    setForm((f) => ({
      ...f,
      industryId: id,
      pages: trimPagesToPlanLimit(
        syncBlogPageWithFeatures(pages, featureSlugs),
        f.planSlug
      ),
      featureSlugs,
    }));
  };

  const togglePage = (page: string) => {
    setForm((f) => {
      if (f.pages.includes(page)) {
        return { ...f, pages: f.pages.filter((p) => p !== page) };
      }
      if (!canAddPageToPlan(f.pages, f.planSlug)) {
        setFormError(
          `${planLabelForSlug(f.planSlug)} includes ${planPageLimitLabel(f.planSlug).toLowerCase()}. Remove a page or choose a higher plan.`
        );
        return f;
      }
      setFormError(null);
      return { ...f, pages: [...f.pages, page] };
    });
  };

  const toggleFeatureSlug = (slug: string) => {
    setForm((f) => {
      const featureSlugs = f.featureSlugs.includes(slug)
        ? f.featureSlugs.filter((x) => x !== slug)
        : [...f.featureSlugs, slug];
      return {
        ...f,
        featureSlugs,
        pages: trimPagesToPlanLimit(
          syncBlogPageWithFeatures(f.pages, featureSlugs),
          f.planSlug
        ),
      };
    });
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof WebsiteFormData, string>> = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.contactPhone.trim()) e.contactPhone = "Phone or WhatsApp is required";
    if (!form.projectGoal.trim()) e.projectGoal = "Tell us what you want this website to achieve";
    if (!form.industryId) e.industryId = "Please select an industry";
    if (!form.designStyle) e.designStyle = "Choose a design style";
    if (form.pages.length === 0) e.pages = "Select at least one page";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setFormError(null);
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStep("review");
  };

  const handleFinalSubmit = async () => {
    if (!validate()) {
      setStep("form");
      return;
    }
    await onSubmit(form);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500";
  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";
  const errorClass = "mt-1.5 text-xs text-red-500";

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <Globe className="h-4 w-4 text-violet-500" />
              <span>Custom Website Service</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-gray-900">Start Project</span>
            </div>
            <h1 className="mb-2 text-3xl font-extrabold text-gray-900">
              Submit your project request
            </h1>
            <p className="text-gray-500">
              Tell us about your business. After you submit, our team reviews your brief and
              typically starts within 1–2 business days.
            </p>
          </motion.div>

          <motion.form
            variants={fadeUp}
            onSubmit={step === "form" ? handleContinueToReview : (e) => e.preventDefault()}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            {step === "review" ? (
              <div className="space-y-6 p-6 sm:p-8">
                <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
                  <h2 className="text-base font-semibold text-gray-900">Review your brief</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Plan</dt>
                      <dd className="font-medium text-gray-900">
                        {planLabelForSlug(form.planSlug)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Business</dt>
                      <dd className="font-medium text-gray-900">{form.businessName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Industry</dt>
                      <dd className="font-medium text-gray-900">{selectedIndustryName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="font-medium text-gray-900">{form.contactPhone}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Project goal</dt>
                      <dd className="mt-1 font-medium text-gray-900">{form.projectGoal}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Pages</dt>
                      <dd className="mt-1 font-medium text-gray-900">{form.pages.join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Features</dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {form.featureSlugs.length > 0
                          ? features
                              .filter((f) => form.featureSlugs.includes(f.slug))
                              .map((f) => f.name)
                              .join(", ")
                          : "None selected"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Design style</dt>
                      <dd className="font-medium capitalize text-gray-900">{form.designStyle}</dd>
                    </div>
                  </dl>
                </div>
                {(submitError || formError) && (
                  <p className="text-center text-sm font-medium text-red-600">
                    {submitError ?? formError}
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    disabled={isSubmitting}
                    className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60"
                  >
                    Back to edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinalSubmit()}
                    disabled={isSubmitting || industries.length === 0}
                    className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting request…" : "Submit project request"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <label className={labelClass}>Plan</label>
                <select
                  value={form.planSlug}
                  onChange={(e) => {
                    const planSlug = normalizePlanSlug(e.target.value);
                    setForm((f) => ({
                      ...f,
                      planSlug,
                      pages: trimPagesToPlanLimit(f.pages, planSlug),
                    }));
                  }}
                  className={inputClass}
                >
                  {pricingPlans.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-500">
                  {planPageLimitLabel(form.planSlug)}
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luxe Interiors Co."
                  value={form.businessName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, businessName: e.target.value }))
                  }
                  className={inputClass}
                />
                {errors.businessName && (
                  <p className={errorClass}>{errors.businessName}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Phone or WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 082 123 4567"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                  className={inputClass}
                />
                {errors.contactPhone && (
                  <p className={errorClass}>{errors.contactPhone}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  What should this website achieve? <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="e.g. Get more booking enquiries, showcase our services, and look professional online."
                  value={form.projectGoal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectGoal: e.target.value }))
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
                {errors.projectGoal && (
                  <p className={errorClass}>{errors.projectGoal}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Industry <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.industryId}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setForm((f) => ({ ...f, industryId: "" }));
                      return;
                    }
                    applyIndustry(v);
                  }}
                  className={inputClass}
                >
                  <option value="">
                    {industries.length === 0
                      ? "No industries — configure Supabase"
                      : "Select your industry"}
                  </option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </select>
                {errors.industryId && (
                  <p className={errorClass}>{errors.industryId}</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <label className={labelClass}>
                    Pages Needed <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-500">
                    {form.pages.length}
                    {pageLimit !== null ? ` of ${pageLimit}` : ""} selected ·{" "}
                    {planPageLimitLabel(form.planSlug)}
                  </span>
                </div>
                <p className="mb-2 text-xs text-gray-500">
                  A Blog page is added automatically when Blog / CMS is enabled below.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS_VISIBLE.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => togglePage(page)}
                      className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all ${
                        form.pages.includes(page)
                          ? "border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-200"
                          : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                {errors.pages && <p className={errorClass}>{errors.pages}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  Design Style <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DESIGN_STYLES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, designStyle: id }))
                      }
                      className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                        form.designStyle === id
                          ? "border-violet-600 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.designStyle && (
                  <p className={errorClass}>{errors.designStyle}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Competitor Websites</label>
                <textarea
                  placeholder="e.g. competitor1.com, competitor2.com"
                  value={form.competitors}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, competitors: e.target.value }))
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Logo (optional)</label>
                <div
                  role="presentation"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file)
                      setForm((f) => ({ ...f, logoName: file.name }));
                  }}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    dragOver
                      ? "border-violet-400 bg-violet-50"
                      : "border-gray-200 hover:border-violet-300 hover:bg-gray-50"
                  }`}
                >
                  {form.logoName ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="font-medium text-gray-700">
                        {form.logoName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, logoName: "" }))
                        }
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        <label className="cursor-pointer font-semibold text-violet-600 hover:text-violet-700">
                          Click to upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                setForm((f) => ({
                                  ...f,
                                  logoName: file.name,
                                }));
                            }}
                          />
                        </label>{" "}
                        or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Optional for now — we&apos;ll collect the file after your workspace is created.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Features Needed</label>
                {features.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    No features in the database. Seed the{" "}
                    <code className="rounded bg-gray-200 px-1">features</code>{" "}
                    table in Supabase.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {features.map((feat) => (
                      <label
                        key={feat.id}
                        className="group flex cursor-pointer items-center gap-3"
                      >
                        <div
                          role="checkbox"
                          tabIndex={0}
                          aria-checked={form.featureSlugs.includes(feat.slug)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ")
                              toggleFeatureSlug(feat.slug);
                          }}
                          onClick={() => toggleFeatureSlug(feat.slug)}
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                            form.featureSlugs.includes(feat.slug)
                              ? "border-violet-600 bg-violet-600"
                              : "border-gray-300 group-hover:border-violet-400"
                          }`}
                        >
                          {form.featureSlugs.includes(feat.slug) && (
                            <svg
                              className="h-3 w-3 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          onClick={() => toggleFeatureSlug(feat.slug)}
                          className="select-none text-sm font-medium text-gray-700"
                        >
                          {feat.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {(formError || submitError) && (
                <p className="text-center text-sm font-medium text-red-600">
                  {formError ?? submitError}
                </p>
              )}
            </div>

            <div className="space-y-3 px-6 pb-8 sm:px-8">
              <button
                type="submit"
                disabled={isSubmitting || industries.length === 0}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Review project request
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            </>
            )}
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
};

const DashboardScreen = ({
  projects,
  onViewProject,
  onNav,
}: {
  projects: Project[];
  onViewProject: (p: Project) => void;
  onNav: (s: Screen) => void;
}) => (
  <div className="min-h-screen bg-gray-50 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div
          variants={fadeUp}
          className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <LayoutDashboard className="h-4 w-4 text-violet-500" />
              <span className="font-medium text-gray-900">My Projects</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Your Website Projects
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track the progress of your custom-built websites
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNav("form")}
            className="group flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-300"
          >
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            Start Project
          </button>
        </motion.div>

        {projects.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm"
          >
            <Globe className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-bold text-gray-700">No projects yet</h3>
            <p className="mb-6 text-sm text-gray-500">
              Submit your first website request to get started.
            </p>
            <button
              type="button"
              onClick={() => onNav("form")}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200"
            >
              Start Project
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {projects.map((project) => {
              const st = statusConfig[project.status];
              return (
                <motion.div
                  key={project.id}
                  variants={fadeUp}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500 opacity-80" />
                  <div className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                        <Briefcase className="h-5 w-5 text-violet-600" />
                      </div>
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {project.businessName}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {project.industry}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      Created {project.createdDate}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewProject(project)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    >
                      View Project
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  </div>
);

const ProjectDetailScreen = ({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) => {
  const st = statusConfig[project.status];
  const currentStep = statusOrder.indexOf(project.status);

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 transition-colors hover:text-violet-600"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              My Projects
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-gray-900">{project.businessName}</span>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mb-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
                  <Globe className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900">
                    {project.businessName}
                  </h1>
                  <p className="text-sm text-gray-500">{project.industry}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${st.bg} ${st.color}`}
              >
                {st.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Created",
                  value: project.createdDate,
                  icon: <Calendar className="h-4 w-4 text-gray-400" />,
                },
                {
                  label: "Design Style",
                  value: project.designStyle,
                  icon: <Star className="h-4 w-4 text-gray-400" />,
                },
                {
                  label: "Pages",
                  value: `${project.pages.length} pages`,
                  icon: <Globe className="h-4 w-4 text-gray-400" />,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                    {item.icon}
                    {item.label}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mb-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-gray-900">
              <Clock className="h-4 w-4 text-violet-500" />
              Project Timeline
            </h2>
            <div className="space-y-0">
              {timelineSteps.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          done
                            ? "border-violet-600 bg-violet-600 shadow-md shadow-violet-200"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {done ? (
                          <svg
                            className="h-3.5 w-3.5 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <div
                          className={`mt-1 h-10 w-0.5 ${done ? "bg-violet-200" : "bg-gray-100"}`}
                        />
                      )}
                    </div>
                    <div className="pb-8 pt-1">
                      <p
                        className={`text-sm font-semibold ${done ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {step.label}
                        {active && (
                          <span className="ml-2 rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                            Current
                          </span>
                        )}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${done ? "text-gray-500" : "text-gray-300"}`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-gray-900">
              <Briefcase className="h-4 w-4 text-violet-500" />
              Requirements
            </h2>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Pages
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.pages.map((p) => (
                    <span
                      key={p}
                      className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              {project.features.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {project.competitors ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Competitor References
                  </p>
                  <p className="text-sm text-gray-700">{project.competitors}</p>
                </div>
              ) : null}
              {project.logoName ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Logo File
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {project.logoName}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onBack}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Back to Dashboard
            </button>
            <button
              type="button"
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-300"
            >
              <RefreshCw className="h-4 w-4" />
              Request Changes
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export function CustomWebsiteService({
  industries,
  features,
  initialCompanies,
}: {
  industries: Industry[];
  features: Feature[];
  initialCompanies: CompanyWithIndustry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [screen, setScreen] = useState<Screen>("landing");
  const [projects, setProjects] = useState<Project[]>(() =>
    initialCompanies.map(companyToProject)
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    setProjects(initialCompanies.map(companyToProject));
  }, [initialCompanies]);

  useEffect(() => {
    let isMounted = true;

    const loadAuthState = async () => {
      const supabase = getSupabaseBrowserClient();
      const auth = await loadMarketingNavAuth(supabase);

      if (!isMounted) return;
      setIsAuthenticated(auth.isAuthenticated);
      setCompanySlug(auth.companySlug);
      setIsPlatformAdmin(auth.isPlatformAdmin);
    };

    void loadAuthState();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCompanySlug(null);
    setIsPlatformAdmin(false);
    router.push("/");
    router.refresh();
  };

  const handleFormSubmit = async (data: WebsiteFormData) => {
    setSubmitError(null);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth/sign-up?next=${encodeURIComponent("/onboarding")}`);
      return;
    }

    startTransition(async () => {
      const result = await createCompanyFromOnboarding({
        businessName: data.businessName.trim(),
        industryId: data.industryId,
        onboardingData: {
          pages: data.pages,
          features: data.featureSlugs,
          style: data.designStyle || null,
          competitors: data.competitors || null,
          logoFileName: data.logoName || null,
          projectGoal: data.projectGoal.trim(),
          contactPhone: data.contactPhone.trim(),
        },
        plan: data.planSlug,
        userId: user.id,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push(`/${encodeURIComponent(result.slug)}/dashboard/project?submitted=1`);
      router.refresh();
    });
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setScreen("project-detail");
  };

  const handleNav = (s: Screen) => {
    if (s === "form") {
      router.push(isAuthenticated ? "/onboarding" : "/auth/sign-up");
      return;
    }
    if (s === "dashboard") {
      router.push("/marketplace");
      return;
    }
    setSelectedProject(null);
    setScreen(s);
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <MarketingNav
        isAuthenticated={isAuthenticated}
        companySlug={companySlug}
        isPlatformAdmin={isPlatformAdmin}
        active="home"
        onLogout={handleLogout}
      />
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingScreen
              onGetStarted={() => {
                router.push("/auth/sign-up");
              }}
            />
          </motion.div>
        )}
        {screen === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RequirementsForm
              industries={industries}
              features={features}
              onSubmit={handleFormSubmit}
              submitError={submitError}
              isSubmitting={isPending}
            />
          </motion.div>
        )}
        {screen === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardScreen
              projects={projects}
              onViewProject={handleViewProject}
              onNav={handleNav}
            />
          </motion.div>
        )}
        {screen === "project-detail" && selectedProject && (
          <motion.div
            key="project-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProjectDetailScreen
              project={selectedProject}
              onBack={() => handleNav("dashboard")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
