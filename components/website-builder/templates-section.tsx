"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Check,
  Eye,
  Hammer,
  HardHat,
  Loader2,
  Megaphone,
  Monitor,
  Scissors,
  Smartphone,
  Sparkles,
  User,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { applyWebsiteBuilderTemplateAction } from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import {
  PublicSite,
  PublicSitePreviewFrame,
} from "@/components/website-builder/public-site";
import { canAccessWebsiteBuilderFeature } from "@/lib/website-builder/access";
import {
  buildTemplatePreviewPageContent,
  buildTemplatePreviewWebsite,
  getWebsiteBuilderIndustryTemplate,
  listWebsiteBuilderIndustryTemplates,
} from "@/lib/website-builder/industry-site-templates";
import { normalizeIndustrySlug } from "@/lib/industry-modules/registry";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";
import type { BuilderWebsite } from "@/types/website-builder";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  flower: Scissors,
  wrench: Wrench,
  zap: Zap,
  user: User,
  briefcase: Briefcase,
  megaphone: Megaphone,
  hammer: Hammer,
  building: Building2,
  hardhat: HardHat,
};

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields & CompanyWithIndustry;
  website: BuilderWebsite | null;
  companyServices: CompanyService[];
};

function TemplatePreviewCard({
  industryKey,
  isActive,
  onPreview,
  onApply,
  applying,
}: {
  industryKey: string;
  isActive: boolean;
  onPreview: () => void;
  onApply: () => void;
  applying: boolean;
}) {
  const template = useMemo(() => getWebsiteBuilderIndustryTemplate(industryKey), [industryKey]);
  const Icon = ICONS[template.icon] ?? Briefcase;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
        isActive ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"
      )}
    >
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.previewImage}
          alt={template.previewImageAlt}
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${template.primaryColor}dd 0%, transparent 55%)`,
          }}
        />
        <div className="absolute left-4 top-4 flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: template.primaryColor }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {isActive ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <Check className="h-3 w-3" />
            Active
          </span>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">{template.tagline}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
        <p className="mt-1 flex-1 text-sm text-slate-500">{template.description}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={onApply}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: template.primaryColor }}
          >
            {applying ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Apply"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TemplatePreviewModal({
  industryKey,
  company,
  companyId,
  slug,
  companyServices,
  isActive,
  applying,
  onClose,
  onApply,
}: {
  industryKey: string;
  company: CompanyWithIndustry;
  companyId: string;
  slug: string;
  companyServices: CompanyService[];
  isActive: boolean;
  applying: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const template = useMemo(() => getWebsiteBuilderIndustryTemplate(industryKey), [industryKey]);

  const previewWebsite = useMemo(
    () => buildTemplatePreviewWebsite(company, industryKey),
    [company, industryKey]
  );

  const previewContent = useMemo(
    () =>
      buildTemplatePreviewPageContent(
        company,
        industryKey,
        companyServices.map((s) => ({
          name: s.name,
          description: s.description,
          base_price_cents: s.base_price_cents,
        }))
      ),
    [company, industryKey, companyServices]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="template-preview-title" className="text-base font-semibold text-slate-900">
              {template.name} template
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Preview with your business name, contact details, and stock imagery
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("desktop")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                mode === "desktop" ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setMode("mobile")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                mode === "mobile" ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-4 sm:p-6">
          <PublicSitePreviewFrame mode={mode}>
            <PublicSite
              companySlug={slug}
              companyId={companyId}
              companyName={company.name}
              website={previewWebsite}
              landing={previewContent}
              preview
            />
          </PublicSitePreviewFrame>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <p className="text-sm text-slate-500">
            {isActive
              ? "This is your current industry template."
              : "Applying replaces your landing page content and theme colors."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: template.primaryColor }}
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying…
                </>
              ) : isActive ? (
                "Re-apply template"
              ) : (
                "Use this template"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatesSection({ slug, companyId, company, website, companyServices }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = useMemo(() => listWebsiteBuilderIndustryTemplates(), []);
  const currentIndustry = normalizeIndustrySlug(
    company.industries?.slug ?? company.industry_template_key
  );

  const canBuild = canAccessWebsiteBuilderFeature(company, "websiteBuilder");

  if (!canBuild) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilder" />;
  }

  function onApply(industryKey: string, fromPreview = false) {
    const template = getWebsiteBuilderIndustryTemplate(industryKey);

    if (!fromPreview) {
      const confirmed = window.confirm(
        `Apply the ${template.name} website template? This will replace your current landing page content and theme colors.`
      );
      if (!confirmed) return;
    }

    setError(null);
    setMessage(null);
    setApplyingKey(industryKey);
    startTransition(async () => {
      const result = await applyWebsiteBuilderTemplateAction({
        companyId,
        companySlug: slug,
        industryKey,
      });
      setApplyingKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreviewKey(null);
      setMessage(`${template.name} template applied. Preview your site or open the page builder to customise.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Browse industry templates with professional stock photography. Preview any template before
          applying — your business name, contact details, and services are used in the preview.
        </p>
        {website ? (
          <p className="mt-2 text-xs text-slate-500">
            Applying a template updates your home page, theme colours, and images. Existing services
            are preserved when available.
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-700">
            No website yet — applying a template will create one automatically.
          </p>
        )}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <TemplatePreviewCard
            key={template.industryKey}
            industryKey={template.industryKey}
            isActive={currentIndustry === template.industryKey}
            applying={pending && applyingKey === template.industryKey}
            onPreview={() => setPreviewKey(template.industryKey)}
            onApply={() => onApply(template.industryKey)}
          />
        ))}
      </div>

      {previewKey ? (
        <TemplatePreviewModal
          industryKey={previewKey}
          company={company}
          companyId={companyId}
          slug={slug}
          companyServices={companyServices}
          isActive={currentIndustry === previewKey}
          applying={pending && applyingKey === previewKey}
          onClose={() => setPreviewKey(null)}
          onApply={() => onApply(previewKey, true)}
        />
      ) : null}
    </div>
  );
}
