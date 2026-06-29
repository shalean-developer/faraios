"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  updateWebsiteContentAction,
} from "@/app/actions/websites";
import { Button } from "@/components/ui/button";
import {
  BASIC_CONTENT_SECTIONS,
  LUXURY_BEAUTY_CONTENT_SECTIONS,
  MODERN_OVERLAY_CONTENT_SECTIONS,
  SERVICE_BUSINESS_CONTENT_SECTIONS,
  WebsiteContentEditorSections,
  type ContentSectionId,
} from "@/components/websites/website-content-editor-sections";
import {
  buildWebsiteContentFormData,
  isLuxuryBeautyWebsite,
  isModernOverlayWebsite,
  isServiceBusinessTemplate,
  websiteContentFormDataToPayload,
  type WebsiteContentFormData,
} from "@/components/websites/website-content-form-data";
import { resolveContentSectionId } from "@/components/websites/website-content-section-ids";
import { WebsitePreviewFrame } from "@/components/websites/website-preview-frame";
import { companyDashboardPath, companyWebsiteBuilderPath, companyWebsitesPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { WebsiteContent } from "@/types/database";

type Props = {
  websiteId: string;
  companySlug: string;
  previewUrl?: string;
  previewPath?: string;
  contentRows: WebsiteContent[];
  websiteIndustry?: string;
  websiteTemplate?: string;
  variant?: "company" | "admin";
  embedded?: boolean;
  initialSection?: string | null;
};

export function WebsiteContentEditor({
  websiteId,
  companySlug,
  previewUrl,
  previewPath,
  contentRows,
  websiteIndustry,
  websiteTemplate,
  variant = "company",
  embedded = false,
  initialSection = null,
}: Props) {
  const extended = isServiceBusinessTemplate(websiteTemplate, websiteIndustry);
  const luxuryLayout = isLuxuryBeautyWebsite(websiteTemplate, websiteIndustry);
  const modernOverlay = isModernOverlayWebsite(websiteTemplate, contentRows);
  const contentSections = useMemo(
    () =>
      modernOverlay
        ? MODERN_OVERLAY_CONTENT_SECTIONS
        : luxuryLayout
          ? LUXURY_BEAUTY_CONTENT_SECTIONS
          : extended
            ? SERVICE_BUSINESS_CONTENT_SECTIONS
            : BASIC_CONTENT_SECTIONS,
    [extended, luxuryLayout, modernOverlay]
  );

  const [formData, setFormData] = useState<WebsiteContentFormData>(() =>
    buildWebsiteContentFormData(contentRows)
  );

  useEffect(() => {
    setFormData(buildWebsiteContentFormData(contentRows));
  }, [contentRows]);

  const [activeSection, setActiveSection] = useState<ContentSectionId>(() =>
    resolveContentSectionId(initialSection, modernOverlay)
  );

  useEffect(() => {
    if (initialSection) {
      setActiveSection(resolveContentSectionId(initialSection, modernOverlay));
    }
  }, [initialSection, modernOverlay]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const onSave = async () => {
    setPending(true);
    setError(null);
    const payload = websiteContentFormDataToPayload(formData, extended, modernOverlay);
    try {
      const result = await updateWebsiteContentAction(websiteId, companySlug, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToast("Saved successfully");
      setPreviewVersion((version) => version + 1);
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setPending(false);
    }
  };

  const resolvedPreviewHref = previewPath ?? previewUrl ?? `/preview/${websiteId}`;
  const previewIframeSrc = `${previewPath ?? `/preview/${websiteId}`}?v=${previewVersion}`;
  const isAdmin = variant === "admin";

  const sectionPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <WebsiteContentEditorSections
        activeSection={activeSection}
        formData={formData}
        setFormData={setFormData}
        extended={extended}
        luxuryLayout={luxuryLayout}
        modernOverlay={modernOverlay}
        websiteId={websiteId}
      />
    </div>
  );

  const content = (
    <>
      {!embedded ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={isAdmin ? "/admin/websites" : companyWebsitesPath(companySlug)}
            className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
          >
            ← Back to websites
          </Link>
          {!isAdmin ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={companyWebsiteBuilderPath(companySlug)}
                className="text-sm font-medium text-[#4a6fd8] transition-colors hover:underline"
              >
                Visual website builder
              </Link>
              <Link
                href={companyDashboardPath(companySlug)}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Dashboard
              </Link>
            </div>
          ) : null}
          <a
            href={resolvedPreviewHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
          >
            Preview Website →
          </a>
        </div>
      ) : null}

      {!embedded ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Classic content editor
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {extended
              ? modernOverlay
                ? "Edit every homepage section from header to footer — logo size, favicon, and all images. Save to refresh the preview."
                : "Edit all homepage sections — preview updates after you save. Prefer drag-and-drop? Use the visual website builder instead."
              : "Update content sections — use the live preview on larger screens."}
          </p>
        </>
      ) : (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Content</h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Luxury spa layout — each tab maps to a section on the live site. Save to refresh the preview."
              : "Edit on the left; the preview updates when you save."}
          </p>
        </div>
      )}

      {modernOverlay && !embedded ? (
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
          <p className="text-sm font-medium text-slate-800">Jump to a homepage section</p>
          <p className="mt-1 text-xs text-slate-600">
            These tabs match the labels on your preview site. Upload images, edit copy, then save.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "about" as const, label: "About" },
              { id: "services" as const, label: "Services" },
              { id: "whyChooseUs" as const, label: "Quality You Trust" },
              { id: "featureBanner" as const, label: "Feature banner" },
              { id: "transform" as const, label: "Dreams Into Reality" },
              { id: "testimonials" as const, label: "Clients Love Us" },
              { id: "craftsmanship" as const, label: "Homes Made Perfect" },
              { id: "blog" as const, label: "Expert Insights" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeSection === item.id
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:border-violet-300"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="min-w-0 lg:col-span-2">
          <div
            className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Content sections"
          >
            {contentSections.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  activeSection === section.id
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>

          <section className="mt-4 pb-24 lg:pb-6" role="tabpanel">
            {sectionPanel}
          </section>
        </div>

        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live preview</p>
                <p className="text-xs text-slate-500">Desktop view — refreshes after you save</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewVersion((version) => version + 1)}
                >
                  Refresh
                </Button>
                <a
                  href={resolvedPreviewHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  Open
                </a>
              </div>
            </div>
            <WebsitePreviewFrame src={previewIframeSrc} refreshKey={previewVersion} />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            {error ? (
              <p className="text-sm font-medium text-red-600">{error}</p>
            ) : toast ? (
              <p className="text-sm font-medium text-emerald-600">{toast}</p>
            ) : (
          <p className="text-sm text-slate-500">
                Editing <span className="font-medium text-slate-700">{activeSection}</span> — upload
                images here, then save to publish them on the site.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={resolvedPreviewHref}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-violet-700 hover:text-violet-900 lg:hidden"
            >
              Preview
            </a>
            <Button onClick={onSave} disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{content}</main>;
}
