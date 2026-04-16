"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload } from "lucide-react";

import { createCompanyFromOnboarding } from "@/app/actions/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  normalizePlanSlug,
  planLabelForSlug,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { getSmartDefaultsForIndustrySlug } from "@/lib/constants/industry-defaults";
import { PAGE_OPTIONS } from "@/lib/constants/onboarding-pages";
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
  SelectValue,
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
};

export function OnboardingForm({
  industries,
  features,
  initialPlan = null,
}: OnboardingFormProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = React.useState("");
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
  const [planSlug, setPlanSlug] = React.useState<PricingPlanSlug>(() =>
    normalizePlanSlug(initialPlan || "starter")
  );

  React.useEffect(() => {
    setPlanSlug(normalizePlanSlug(initialPlan || "starter"));
  }, [initialPlan]);

  const applyIndustryDefaults = React.useCallback(
    (id: string) => {
      const industry = industries.find((i) => i.id === id);
      if (!industry) return;
      const { pages, featureSlugs } = getSmartDefaultsForIndustrySlug(
        industry.slug
      );
      setSelectedPages(pages);
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

  const togglePage = (page: string) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = businessName.trim();
    if (!name) {
      setError("Please enter your business name.");
      return;
    }
    if (!industryId) {
      setError("Select an industry so we can tailor your site.");
      return;
    }

    const {
      data: { user },
    } = await getSupabaseBrowserClient().auth.getUser();

    if (!user) {
      const next = `/onboarding${window.location.search}`;
      router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }

    setPending(true);
    try {
      const result = await createCompanyFromOnboarding({
        businessName: name,
        industryId,
        onboardingData: {
          pages: selectedPages,
          features: featureSlugs,
          style: designStyle,
          competitors,
        },
        plan: planSlug,
        userId: user.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/app");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border/60 bg-card p-6 shadow-xl sm:p-8 md:p-10"
    >
      <div className="space-y-8">
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
              <SelectValue placeholder="Select a plan" />
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
              <SelectValue
                placeholder={
                  industries.length === 0
                    ? "No industries — add data in Supabase"
                    : "Select your industry"
                }
              />
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
          <Label className="text-base font-medium">Pages needed</Label>
          <div className="flex flex-wrap gap-2">
            {PAGE_OPTIONS.map((page) => {
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
          <Label className="text-base font-medium">Design style</Label>
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
          <Label className="text-base font-medium">Upload logo</Label>
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
              PNG, JPG, SVG up to 10MB
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
          {features.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              No features configured. Add rows to the{" "}
              <code className="rounded bg-muted px-1">features</code> table in
              Supabase.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              {features.map((feat) => (
                <label
                  key={feat.id}
                  className="flex cursor-pointer items-center gap-3 text-sm font-medium"
                >
                  <Checkbox
                    checked={featureSlugs.includes(feat.slug)}
                    onCheckedChange={(v) => {
                      if (v === true) {
                        setFeatureSlugs((s) =>
                          s.includes(feat.slug) ? s : [...s, feat.slug]
                        );
                      } else {
                        setFeatureSlugs((s) => s.filter((x) => x !== feat.slug));
                      }
                    }}
                    className="data-checked:border-[#7C3AED] data-checked:bg-[#7C3AED]"
                  />
                  {feat.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={
            pending ||
            industries.length === 0 ||
            !businessName.trim() ||
            !industryId
          }
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl disabled:opacity-60"
          )}
        >
          {pending ? "Setting up your workspace…" : "Create workspace"}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
