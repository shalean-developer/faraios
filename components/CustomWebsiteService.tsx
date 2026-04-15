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
  Zap,
  Shield,
  Headphones,
  LogOut,
} from "lucide-react";

import { createCompanyFromOnboarding } from "@/app/actions/onboarding";
import { getSmartDefaultsForIndustrySlug } from "@/lib/constants/industry-defaults";
import { PAGE_OPTIONS } from "@/lib/constants/onboarding-pages";
import {
  type Project,
  type ProjectStatus,
  companyToProject,
} from "@/lib/mappers/company-to-project";
import type { CompanyWithIndustry } from "@/types/database";
import type { Feature } from "@/types/database";
import type { Industry } from "@/types/database";

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

const NavBar = ({
  screen,
  onNav,
}: {
  screen: Screen;
  onNav: (s: Screen) => void;
}) => (
  <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => onNav("landing")}
        className="group flex items-center gap-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          FaraiOS
        </span>
      </button>
      <nav className="hidden items-center gap-6 md:flex">
        <button
          type="button"
          onClick={() => onNav("landing")}
          className={`text-sm font-medium transition-colors ${
            screen === "landing"
              ? "text-violet-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => onNav("dashboard")}
          className={`text-sm font-medium transition-colors ${
            screen === "dashboard" || screen === "project-detail"
              ? "text-violet-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Projects
        </button>
      </nav>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNav("dashboard")}
          className="hidden items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:flex"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => onNav("form")}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-200"
        >
          Get Started
        </button>
      </div>
    </div>
  </header>
);

const LandingScreen = ({
  onNav,
  industries,
}: {
  onNav: (s: Screen) => void;
  industries: Industry[];
}) => (
  <div className="min-h-screen bg-white">
    <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="space-y-6"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-xs font-semibold text-violet-700">
              <Star className="h-3.5 w-3.5 fill-violet-500" />
              Done-For-You Website Service
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            Let FaraiOS Build Your
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Website For You
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
          >
            We design, build, and launch your website while you focus on your
            business. Professional results. Zero technical hassle.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-center gap-4 pt-2 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => onNav("form")}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-300"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => onNav("dashboard")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
            >
              <Eye className="h-4 w-4" />
              View Examples
            </button>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="mx-4 flex h-6 flex-1 items-center justify-center rounded-md bg-white">
              <span className="text-xs text-gray-400">yourbusiness.com</span>
            </div>
          </div>
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 sm:h-64">
            <div className="space-y-3 text-center text-white">
              <Globe className="mx-auto h-10 w-10 opacity-80" />
              <p className="text-lg font-bold">Your Dream Website</p>
              <p className="text-sm opacity-70">Designed & built by FaraiOS</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {[
            {
              icon: <Zap className="h-6 w-6 text-violet-600" />,
              title: "Fast Delivery",
              desc: "Your website built and launched within 5–7 business days.",
            },
            {
              icon: <Shield className="h-6 w-6 text-violet-600" />,
              title: "Professional Quality",
              desc: "Expert designers and developers crafting pixel-perfect sites.",
            },
            {
              icon: <Headphones className="h-6 w-6 text-violet-600" />,
              title: "Ongoing Support",
              desc: "We stay with you post-launch for edits and improvements.",
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    <section className="border-t border-gray-100 bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="mb-2 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl"
          >
            Industries we serve
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mb-10 text-center text-gray-500"
          >
            Data-driven defaults for your sector — loaded from your workspace
            database.
          </motion.p>
          {industries.length === 0 ? (
            <motion.p
              variants={fadeUp}
              className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500"
            >
              No industries yet. Add rows to the{" "}
              <code className="rounded bg-gray-200 px-1">industries</code> table
              in Supabase to see them here.
            </motion.p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industries.map((ind) => (
                <motion.div
                  key={ind.id}
                  variants={fadeUp}
                  className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="font-bold text-gray-900">{ind.name}</h3>
                  {ind.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      {ind.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-violet-600">
                    {ind.slug}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>

    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-12 shadow-2xl shadow-violet-200"
        >
          <motion.h2
            variants={fadeUp}
            className="mb-4 text-3xl font-extrabold text-white"
          >
            Ready to launch your website?
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-8 text-lg text-violet-100">
            Join hundreds of businesses that trust FaraiOS to build their online
            presence.
          </motion.p>
          <motion.button
            variants={fadeUp}
            type="button"
            onClick={() => onNav("form")}
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-10 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
          >
            Start Your Project
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  </div>
);

type WebsiteFormData = {
  businessName: string;
  industryId: string;
  pages: string[];
  designStyle: string;
  competitors: string;
  logoName: string;
  featureSlugs: string[];
};

const defaultForm: WebsiteFormData = {
  businessName: "",
  industryId: "",
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
  const [errors, setErrors] = useState<
    Partial<Record<keyof WebsiteFormData, string>>
  >({});
  const [dragOver, setDragOver] = useState(false);

  const applyIndustry = (id: string) => {
    const row = industries.find((i) => i.id === id);
    if (!row) return;
    const { pages, featureSlugs } = getSmartDefaultsForIndustrySlug(row.slug);
    setForm((f) => ({
      ...f,
      industryId: id,
      pages,
      featureSlugs,
    }));
  };

  const togglePage = (page: string) => {
    setForm((f) => ({
      ...f,
      pages: f.pages.includes(page)
        ? f.pages.filter((p) => p !== page)
        : [...f.pages, page],
    }));
  };

  const toggleFeatureSlug = (slug: string) => {
    setForm((f) => ({
      ...f,
      featureSlugs: f.featureSlugs.includes(slug)
        ? f.featureSlugs.filter((x) => x !== slug)
        : [...f.featureSlugs, slug],
    }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof WebsiteFormData, string>> = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.industryId) e.industryId = "Please select an industry";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
              <span className="font-medium text-gray-900">Submit Requirements</span>
            </div>
            <h1 className="mb-2 text-3xl font-extrabold text-gray-900">
              Tell us about your website
            </h1>
            <p className="text-gray-500">
              Fill in the details below and our team will get started right away.
            </p>
          </motion.div>

          <motion.form
            variants={fadeUp}
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="space-y-6 p-6 sm:p-8">
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
                <label className={labelClass}>
                  Pages Needed <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS.map((page) => (
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
                  {["Modern", "Luxury", "Minimal"].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, designStyle: style }))
                      }
                      className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                        form.designStyle === style
                          ? "border-violet-600 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/50"
                      }`}
                    >
                      {style}
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
                <label className={labelClass}>Upload Logo</label>
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
                        PNG, JPG, SVG up to 10MB
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
            </div>

            <div className="space-y-3 px-6 pb-8 sm:px-8">
              {submitError ? (
                <p className="text-center text-sm font-medium text-red-600">
                  {submitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting || industries.length === 0}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Submit Request"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
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
            New Project
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
              Get Started
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

  useEffect(() => {
    setProjects(initialCompanies.map(companyToProject));
  }, [initialCompanies]);

  const handleFormSubmit = async (data: WebsiteFormData) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createCompanyFromOnboarding({
        businessName: data.businessName,
        industryId: data.industryId,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push(`/${result.slug}/dashboard`);
      router.refresh();
    });
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setScreen("project-detail");
  };

  const handleNav = (s: Screen) => {
    setSelectedProject(null);
    setScreen(s);
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <NavBar screen={screen} onNav={handleNav} />
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingScreen industries={industries} onNav={handleNav} />
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
