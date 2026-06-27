"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateWebsiteThemeAction } from "@/app/actions/website-builder";
import { BuilderImageUploadField } from "@/components/website-builder/page-builder/builder-image-upload-field";
import type { BuilderWebsite } from "@/types/website-builder";
import type { WebsiteThemeSettings } from "@/types/website-builder-sections";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

type Props = {
  slug: string;
  companyId: string;
  website: BuilderWebsite;
};

export function ThemeEditor({ slug, companyId, website }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<WebsiteThemeSettings>(() => ({
    primaryColor: (website.theme_settings?.primaryColor as string) ?? "#5a8dee",
    secondaryColor: (website.theme_settings?.secondaryColor as string) ?? "#64748b",
    accentColor: (website.theme_settings?.accentColor as string) ?? "#4a6fd8",
    headingFont: (website.theme_settings?.headingFont as string) ?? "inherit",
    bodyFont: (website.theme_settings?.bodyFont as string) ?? "inherit",
    buttonStyle: (website.theme_settings?.buttonStyle as WebsiteThemeSettings["buttonStyle"]) ?? "solid",
    borderRadius: (website.theme_settings?.borderRadius as WebsiteThemeSettings["borderRadius"]) ?? "md",
    shadowStyle: (website.theme_settings?.shadowStyle as WebsiteThemeSettings["shadowStyle"]) ?? "sm",
    containerWidth: (website.theme_settings?.containerWidth as WebsiteThemeSettings["containerWidth"]) ?? "default",
    sectionSpacing: (website.theme_settings?.sectionSpacing as WebsiteThemeSettings["sectionSpacing"]) ?? "default",
    cardStyle: (website.theme_settings?.cardStyle as WebsiteThemeSettings["cardStyle"]) ?? "bordered",
    logoUrl: (website.theme_settings?.logoUrl as string) ?? null,
    faviconUrl: (website.theme_settings?.faviconUrl as string) ?? null,
  }));

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateWebsiteThemeAction({ companyId, companySlug: slug, theme });
      setMessage(result.ok ? "Theme saved." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className={riseCardClassName}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-medium text-slate-800">Theme settings</h2>
        <p className="mt-1 text-sm text-slate-500">Site-wide colors, typography, and layout defaults.</p>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="font-medium text-slate-700">Primary color</span>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-md border border-slate-200"
            value={theme.primaryColor}
            onChange={(e) => setTheme((t) => ({ ...t, primaryColor: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Secondary color</span>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-md border border-slate-200"
            value={theme.secondaryColor}
            onChange={(e) => setTheme((t) => ({ ...t, secondaryColor: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Accent color</span>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-md border border-slate-200"
            value={theme.accentColor}
            onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Heading font</span>
          <input
            className={inputClass}
            value={theme.headingFont ?? ""}
            onChange={(e) => setTheme((t) => ({ ...t, headingFont: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Body font</span>
          <input
            className={inputClass}
            value={theme.bodyFont ?? ""}
            onChange={(e) => setTheme((t) => ({ ...t, bodyFont: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-700">Border radius</span>
          <select
            className={inputClass}
            value={theme.borderRadius}
            onChange={(e) =>
              setTheme((t) => ({
                ...t,
                borderRadius: e.target.value as WebsiteThemeSettings["borderRadius"],
              }))
            }
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="full">Full</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <BuilderImageUploadField
            label="Site logo"
            websiteId={website.id}
            value={theme.logoUrl}
            onChange={(logoUrl) => setTheme((t) => ({ ...t, logoUrl }))}
          />
        </div>
        <div className="sm:col-span-2">
          <BuilderImageUploadField
            label="Favicon"
            websiteId={website.id}
            value={theme.faviconUrl}
            onChange={(faviconUrl) => setTheme((t) => ({ ...t, faviconUrl }))}
            compact
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded-md bg-[#5a8dee] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-60"
        >
          Save theme
        </button>
        {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
