"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Hammer,
  HardHat,
  Megaphone,
  Scissors,
  Sparkles,
  User,
  Wrench,
  Zap,
} from "lucide-react";

import { applyCompanyIndustryTemplateAction } from "@/app/actions/industry-template";
import { Button } from "@/components/ui/button";
import { getIndustryTemplate } from "@/lib/industry-templates/industryTemplates";
import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { normalizeIndustrySlug } from "@/lib/industry-modules/registry";
import type { CompanyWithIndustry, Industry } from "@/types/database";

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
  company: CompanyWithIndustry;
  industries: Industry[];
};

export function IndustrySettingsPanel({ slug, company, industries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedIndustryId, setSelectedIndustryId] = useState(
    company.industry_id ?? industries[0]?.id ?? ""
  );
  const [overwriteTemplateServices, setOverwriteTemplateServices] = useState(false);
  const [resetBookingForm, setResetBookingForm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedIndustry = industries.find((i) => i.id === selectedIndustryId);
  const normalizedPreviewSlug = normalizeIndustrySlug(selectedIndustry?.slug);
  const preview = getIndustryTemplate(normalizedPreviewSlug);
  const previewModule = loadIndustryModule(normalizedPreviewSlug);
  const PreviewIcon = ICONS[previewModule.icon] ?? Briefcase;

  const currentSlug = company.industries?.slug ?? company.industry_template_key;
  const isChanging = selectedIndustry?.slug && normalizeIndustrySlug(selectedIndustry.slug) !== normalizeIndustrySlug(currentSlug);

  const onApply = () => {
    if (!selectedIndustryId) return;

    if (isChanging) {
      const confirmed = window.confirm(
        `Apply the ${preview.industryName} template? Existing services you created will be kept. Template services can be added or replaced based on your selection below.`
      );
      if (!confirmed) return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await applyCompanyIndustryTemplateAction({
        companyId: company.id,
        companySlug: slug,
        industryId: selectedIndustryId,
        businessName: company.name,
        overwriteTemplateServices,
        resetBookingForm,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        `Your FaraiOS workspace has been configured for ${result.industryName}. Added ${result.servicesCreated} service(s); ${result.servicesSkipped} already existed.`
      );
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50">
          <PreviewIcon className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Industry template</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure services, booking fields, dashboard labels, and setup steps for your
            business type.
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Current industry
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {company.industries?.name ?? "Not set"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Template applied
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {company.industry_template_applied
              ? company.template_applied_at
                ? new Date(company.template_applied_at).toLocaleDateString("en-ZA")
                : "Yes"
              : "Not yet"}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Change industry
        </label>
        <select
          value={selectedIndustryId}
          onChange={(e) => setSelectedIndustryId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {industries.map((industry) => (
            <option key={industry.id} value={industry.id}>
              {industry.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4">
        <p className="text-sm font-semibold text-slate-900">Preview: {preview.industryName}</p>
        <p className="mt-1 text-sm text-slate-600">{preview.description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Dashboard labels</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>{preview.dashboardLabels.booking ?? "Bookings"}</li>
              <li>{preview.dashboardLabels.service ?? "Services"}</li>
              <li>{preview.dashboardLabels.staff ?? "Team"}</li>
              <li>{preview.dashboardLabels.customer ?? "Customers"}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Sample services</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {preview.defaultServices.slice(0, 4).map((s) => (
                <li key={s.name}>{s.name}</li>
              ))}
            </ul>
          </div>
        </div>
        {preview.pricingExamples.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Pricing examples</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {preview.pricingExamples.map((p) => (
                <li
                  key={p.label}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-100"
                >
                  {p.label} from {p.fromPrice}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <input
            type="checkbox"
            checked={overwriteTemplateServices}
            onChange={(e) => setOverwriteTemplateServices(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              Replace template services
            </span>
            <span className="block text-xs text-slate-500">
              Removes previously imported template services and re-imports. Your custom
              services are never deleted.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <input
            type="checkbox"
            checked={resetBookingForm}
            onChange={(e) => setResetBookingForm(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              Update booking form fields
            </span>
            <span className="block text-xs text-slate-500">
              Resets the booking form to industry-specific fields.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-6 rounded-xl"
        disabled={pending || !selectedIndustryId}
        onClick={onApply}
      >
        {pending ? "Applying…" : isChanging ? "Apply industry template" : "Re-apply template"}
      </Button>
    </section>
  );
}
