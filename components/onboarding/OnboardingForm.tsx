"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload } from "lucide-react";

import { createCompanyFromOnboarding } from "@/app/actions/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  hostingPlanLabelForSlug,
  normalizeHostingPlanSlug,
} from "@/lib/data/hosting";
import {
  normalizePlanSlug,
  planLabelForSlug,
  planPageLimit,
  planPageLimitLabel,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { getSmartDefaultsForIndustrySlug } from "@/lib/constants/industry-defaults";
import { PAGE_OPTIONS_VISIBLE, syncBlogPageWithFeatures } from "@/lib/constants/onboarding-pages";
import {
  canAddPageToPlan,
  trimPagesToPlanLimit,
} from "@/lib/onboarding/plan-pages";
import { cn } from "@/lib/utils";
import type { DesignStyle } from "@/types/company";
import type { Feature } from "@/types/database";
import type { Industry } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DESIGN: { id: DesignStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
];

const MAX_LOGO_BYTES = 10 * 1024 * 1024;

export type OnboardingFormProps = {
  industries: Industry[];
  features: Feature[];
  /** From `/get-started?plan=` */
  initialPlan?: string | null;
  /** After onboarding, redirect to hosting purchase (`redirect=hosting`). */
  redirectAfter?: string | null;
  /** Hosting plan slug when `redirectAfter` is `hosting`. */
  hostingPlan?: string | null;
};

export function OnboardingForm({
  industries,
  features,
  initialPlan = null,
  redirectAfter = null,
  hostingPlan = null,
}: OnboardingFormProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [projectGoal, setProjectGoal] = React.useState("");
  const [industryId, setIndustryId] = React.useState(
    () => industries[0]?.id ?? ""
  );
  const [selectedPages, setSelectedPages] = React.useState<string[]>([]);
  const [designStyle, setDesignStyle] = React.useState<DesignStyle | null>(null);
  const [competitors, setCompetitors] = React.useState("");
  const [logoFileName, setLogoFileName] = React.useState<string | null>(null);
  const [featureSlugs, setFeatureSlugs] = React.useState<string[]>([]);

  const [dragActive, setDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "review">("form");
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(
    null
  );
  const [planSlug, setPlanSlug] = React.useState<PricingPlanSlug>(() =>
    normalizePlanSlug(initialPlan || "starter")
  );

  React.useEffect(() => {
    setPlanSlug(normalizePlanSlug(initialPlan || "starter"));
  }, [initialPlan]);

  React.useEffect(() => {
    setSelectedPages((prev) => trimPagesToPlanLimit(prev, planSlug));
  }, [planSlug]);

  React.useEffect(() => {
    let mounted = true;
    const loadAuth = async () => {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      if (mounted) setIsAuthenticated(Boolean(data.user));
    };
    void loadAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const isHostingFlow = redirectAfter === "hosting";
  const hostingPlanSlug = normalizeHostingPlanSlug(hostingPlan);
  const selectedIndustryName = React.useMemo(
    () => industries.find((ind) => ind.id === industryId)?.name ?? null,
    [industries, industryId]
  );

  const applyIndustryDefaults = React.useCallback(
    (id: string) => {
      const industry = industries.find((i) => i.id === id);
      if (!industry) return;
      const { pages, featureSlugs } = getSmartDefaultsForIndustrySlug(
        industry.slug
      );
      setSelectedPages(
        trimPagesToPlanLimit(
          syncBlogPageWithFeatures(pages, featureSlugs),
          planSlug
        )
      );
      setFeatureSlugs(featureSlugs);
    },
    [industries]
  );

  React.useEffect(() => {
    if (!industryId) return;
    applyIndustryDefaults(industryId);
  }, [industryId, applyIndustryDefaults]);

  const handleIndustryChange = (value: string | null) => {
    setIndustryId(value ?? "");
  };

  const pageLimit = planPageLimit(planSlug);

  const togglePage = (page: string) => {
    setSelectedPages((prev) => {
      if (prev.includes(page)) {
        return prev.filter((p) => p !== page);
      }
      if (!canAddPageToPlan(prev, planSlug)) {
        setError(
          `${planLabelForSlug(planSlug)} includes ${planPageLimitLabel(planSlug).toLowerCase()}. Remove a page or upgrade your plan.`
        );
        return prev;
      }
      setError(null);
      return [...prev, page];
    });
  };

  const onFile = (file: File | null) => {
    setError(null);
    if (!file) {
      setLogoFileName(null);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be PNG, JPG, or SVG and 10MB or smaller.");
      setLogoFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setLogoFileName(file.name);
  };

  const validateForm = (): boolean => {
    const name = businessName.trim();
    if (!name) {
      setError("Please enter your business name.");
      return false;
    }
    if (!industryId) {
      setError("Select an industry so we can tailor your site.");
      return false;
    }
    if (!contactPhone.trim()) {
      setError("Please add a phone or WhatsApp number so we can reach you.");
      return false;
    }
    if (!projectGoal.trim()) {
      setError("Tell us what you want this website to achieve.");
      return false;
    }
    if (!designStyle) {
      setError("Choose a design style for your project.");
      return false;
    }
    if (selectedPages.length === 0) {
      setError("Select at least one page for your website.");
      return false;
    }
    return true;
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setStep("review");
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateForm()) {
      setStep("form");
      return;
    }
    const {
      data: { user },
    } = await getSupabaseBrowserClient().auth.getUser();

    if (!user) {
      const next = `/onboarding${window.location.search}`;
      router.push(
        `/auth/sign-up?next=${encodeURIComponent(next)}`
      );
      return;
    }

    setPending(true);
    try {
      const result = await createCompanyFromOnboarding({
        businessName: businessName.trim(),
        industryId,
        onboardingData: {
          pages: selectedPages,
          features: featureSlugs,
          style: designStyle,
          competitors,
          logoFileName,
          projectGoal: projectGoal.trim(),
          contactPhone: contactPhone.trim(),
        },
        plan: planSlug,
        userId: user.id,
      });
      if (!result.ok) {
        setError(result.error);
        setStep("form");
        return;
      }
      if (redirectAfter === "hosting") {
        const planQuery = hostingPlan ? `?plan=${encodeURIComponent(hostingPlan)}` : "";
        router.push(`/${encodeURIComponent(result.slug)}/dashboard/hosting${planQuery}`);
      } else {
        router.push(
          `/${encodeURIComponent(result.slug)}/project?submitted=1`
        );
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={step === "form" ? handleContinueToReview : (e) => e.preventDefault()}
      className="rounded-3xl border border-border/60 bg-card p-6 shadow-xl sm:p-8 md:p-10"
    >
      <div className="space-y-8">
        <div className="space-y-2 border-b border-border/50 pb-6">
          <h2 className="text-xl font-bold text-foreground">Submit your project request</h2>
          <p className="text-sm text-muted-foreground">
            Tell us about your business. After you submit, our team reviews your brief and
            typically starts within 1–2 business days.
          </p>
        </div>

        {step === "review" ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
              <h3 className="text-base font-semibold text-foreground">Review your brief</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {!isHostingFlow ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Plan</dt>
                    <dd className="font-medium text-foreground">{planLabelForSlug(planSlug)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Business</dt>
                  <dd className="font-medium text-foreground">{businessName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="font-medium text-foreground">{selectedIndustryName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{contactPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Project goal</dt>
                  <dd className="mt-1 font-medium text-foreground">{projectGoal}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd className="mt-1 font-medium text-foreground">{selectedPages.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Features</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {featureSlugs.length > 0
                      ? features
                          .filter((f) => featureSlugs.includes(f.slug))
                          .map((f) => f.name)
                          .join(", ")
                      : "None selected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Design style</dt>
                  <dd className="font-medium capitalize text-foreground">{designStyle}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl"
                onClick={() => setStep("form")}
                disabled={pending}
              >
                Back to edit
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5]"
                disabled={pending}
                onClick={() => void handleSubmit()}
              >
                {pending ? "Submitting request…" : "Submit project request"}
              </Button>
            </div>
          </div>
        ) : (
          <>
        {isHostingFlow ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-sm text-indigo-900">
            <p className="font-semibold">Hosting setup</p>
            <p className="mt-1 text-indigo-800">
              Create your workspace first, then you&apos;ll continue to buy{" "}
              <strong>{hostingPlanLabelForSlug(hostingPlanSlug)}</strong> hosting.
            </p>
          </div>
        ) : null}

        {isAuthenticated === false ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Fill in your details below. When you submit, you&apos;ll be asked to sign in
            or create an account to save your workspace.
          </div>
        ) : null}

        {!isHostingFlow ? (
        <div className="space-y-3 rounded-2xl border border-violet-200/70 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="plan-select" className="text-base font-medium">
              Plan
            </Label>
            <span className="text-xs text-muted-foreground">
              {planLabelForSlug(planSlug)} ·{" "}
              <Link
                href="/pricing"
                className="font-medium text-[#7C3AED] underline-offset-4 hover:underline"
              >
                Compare on Pricing
              </Link>
            </span>
          </div>
          <Select
            value={planSlug}
            onValueChange={(v) =>
              setPlanSlug(normalizePlanSlug(v ?? "starter"))
            }
          >
            <SelectTrigger
              id="plan-select"
              size="default"
              className="h-11 w-full min-w-0 justify-between rounded-xl border-border/80 px-4 text-base data-[size=default]:h-11"
            >
              <span className="flex flex-1 truncate text-left">
                {planLabelForSlug(planSlug)}
              </span>
            </SelectTrigger>
            <SelectContent>
              {pricingPlans.map((p) => (
                <SelectItem key={p.id} value={p.slug}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pre-filled from the pricing page when you arrive with{" "}
            <code className="rounded bg-muted px-1">?plan=</code>. You can change
            it here before submitting.
          </p>
        </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="business-name" className="text-base font-medium">
            Business name
          </Label>
          <Input
            id="business-name"
            name="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Luxe Interiors Co."
            autoComplete="organization"
            className="h-11 rounded-xl border-border/80 px-4 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone" className="text-base font-medium">
            Phone or WhatsApp
          </Label>
          <Input
            id="contact-phone"
            name="contactPhone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="e.g. 082 123 4567"
            autoComplete="tel"
            className="h-11 rounded-xl border-border/80 px-4 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-goal" className="text-base font-medium">
            What should this website achieve?
          </Label>
          <Textarea
            id="project-goal"
            name="projectGoal"
            value={projectGoal}
            onChange={(e) => setProjectGoal(e.target.value)}
            placeholder="e.g. Get more booking enquiries, showcase our services, and look professional online."
            rows={3}
            className="min-h-[96px] rounded-xl border-border/80 px-4 py-3 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry" className="text-base font-medium">
            Industry
          </Label>
          <Select
            value={industryId}
            onValueChange={handleIndustryChange}
            disabled={industries.length === 0}
          >
            <SelectTrigger
              id="industry"
              size="default"
              className="h-11 w-full min-w-0 justify-between rounded-xl border-border/80 px-4 text-base data-[size=default]:h-11"
            >
              <span
                className={cn(
                  "flex flex-1 truncate text-left",
                  !selectedIndustryName && "text-muted-foreground"
                )}
              >
                {selectedIndustryName ??
                  (industries.length === 0
                    ? "No industries — add data in Supabase"
                    : "Select your industry")}
              </span>
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind.id} value={ind.id}>
                  {ind.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            We&apos;ll suggest pages and features that match your sector.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label className="text-base font-medium">Pages needed</Label>
            <span className="text-xs text-muted-foreground">
              {selectedPages.length}
              {pageLimit !== null ? ` of ${pageLimit}` : ""} selected ·{" "}
              {planPageLimitLabel(planSlug)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            A Blog page is added automatically when you enable Blog / CMS below.
          </p>
          <div className="flex flex-wrap gap-2">
            {PAGE_OPTIONS_VISIBLE.map((page) => {
              const on = selectedPages.includes(page);
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => togglePage(page)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                    on
                      ? "border-[#7C3AED] bg-violet-50 text-[#6D28D9] shadow-sm dark:bg-violet-950/40 dark:text-violet-100"
                      : "border-border/80 bg-background text-muted-foreground hover:border-violet-200 hover:text-foreground"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">
            Design style <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DESIGN.map(({ id, label }) => {
              const active = designStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDesignStyle(id)}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-4 text-center text-sm font-semibold transition-all",
                    active
                      ? "border-[#7C3AED] bg-violet-50 text-[#5B21B6] shadow-sm dark:bg-violet-950/30 dark:text-violet-100"
                      : "border-border/70 bg-muted/30 text-muted-foreground hover:border-violet-200 hover:bg-muted/50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitors" className="text-base font-medium">
            Competitor websites
          </Label>
          <Textarea
            id="competitors"
            name="competitors"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            placeholder="e.g. competitor1.com, competitor2.com"
            rows={4}
            className="min-h-[120px] rounded-xl border-border/80 px-4 py-3 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Logo (optional)</Label>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragActive
                ? "border-[#7C3AED] bg-violet-50/80 dark:bg-violet-950/20"
                : "border-border/80 bg-muted/20 hover:border-violet-300 hover:bg-muted/30"
            )}
          >
            <Upload className="size-10 text-[#7C3AED]" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-muted-foreground">
              Optional for now — we&apos;ll collect the file after your workspace is created.
            </span>
            {logoFileName ? (
              <span className="mt-2 text-xs font-medium text-[#7C3AED]">
                {logoFileName}
              </span>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Features needed</Label>
          <p className="text-xs text-muted-foreground">
            Interactive capabilities for your site — not the same as static pages above.
          </p>
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            {features.map((feat) => (
              <label
                key={feat.id}
                className="flex cursor-pointer items-center gap-3 text-sm font-medium"
              >
                <Checkbox
                  checked={featureSlugs.includes(feat.slug)}
                  onCheckedChange={(v) => {
                    setFeatureSlugs((s) => {
                      const next =
                        v === true
                          ? s.includes(feat.slug)
                            ? s
                            : [...s, feat.slug]
                          : s.filter((x) => x !== feat.slug);
                      setSelectedPages((pages) =>
                        trimPagesToPlanLimit(
                          syncBlogPageWithFeatures(pages, next),
                          planSlug
                        )
                      );
                      return next;
                    });
                  }}
                    className="data-checked:border-[#7C3AED] data-checked:bg-[#7C3AED]"
                  />
                  {feat.name}
                </label>
              ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending || industries.length === 0}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl disabled:opacity-60"
          )}
        >
          Review project request
          <ArrowRight className="size-4" aria-hidden />
        </Button>
          </>
        )}
      </div>
    </form>
  );
}
