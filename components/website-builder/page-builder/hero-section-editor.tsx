"use client";

import type { HeroSectionProps } from "@/types/website-builder-sections";

import { StatListEditor, StringListEditor, inputClass } from "./editor-fields";
import { BuilderImageUploadField } from "./builder-image-upload-field";

type Props = {
  value: HeroSectionProps;
  websiteId: string;
  companyId?: string;
  onChange: (next: HeroSectionProps) => void;
};

export function HeroSectionEditor({ value, websiteId, companyId, onChange }: Props) {
  function patch(partial: Partial<HeroSectionProps>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Headline</span>
        <input
          className={inputClass}
          value={value.headline}
          onChange={(e) => patch({ headline: e.target.value })}
          placeholder="{{business_name}}"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Subheadline</span>
        <textarea
          rows={3}
          className={inputClass}
          value={value.subheadline}
          onChange={(e) => patch({ subheadline: e.target.value })}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Alignment</span>
          <select
            className={inputClass}
            value={value.alignment ?? "center"}
            onChange={(e) => patch({ alignment: e.target.value as HeroSectionProps["alignment"] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Height</span>
          <select
            className={inputClass}
            value={value.height ?? "default"}
            onChange={(e) => patch({ height: e.target.value as HeroSectionProps["height"] })}
          >
            <option value="compact">Compact</option>
            <option value="default">Default</option>
            <option value="tall">Tall</option>
            <option value="fullscreen">Fullscreen</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Animation</span>
          <select
            className={inputClass}
            value={value.animation ?? "none"}
            onChange={(e) => patch({ animation: e.target.value as HeroSectionProps["animation"] })}
          >
            <option value="none">None</option>
            <option value="fade">Fade in</option>
            <option value="slide-up">Slide up</option>
          </select>
        </label>
      </div>
      <BuilderImageUploadField
        label="Background image"
        websiteId={websiteId}
        companyId={companyId}
        value={value.backgroundImageUrl}
        onChange={(backgroundImageUrl) => patch({ backgroundImageUrl })}
      />
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Background video URL</span>
        <input
          className={inputClass}
          value={value.backgroundVideoUrl ?? ""}
          onChange={(e) => patch({ backgroundVideoUrl: e.target.value || null })}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Overlay color</span>
          <input
            type="color"
            className="mt-1 h-10 w-full rounded-md border border-slate-200"
            value={value.overlayColor ?? "#000000"}
            onChange={(e) => patch({ overlayColor: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Overlay opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="mt-3 w-full"
            value={value.overlayOpacity ?? 0.35}
            onChange={(e) => patch({ overlayOpacity: Number(e.target.value) })}
          />
        </label>
      </div>
      <BuilderImageUploadField
        label="Hero image"
        websiteId={websiteId}
        companyId={companyId}
        value={value.heroImageUrl}
        onChange={(heroImageUrl) => patch({ heroImageUrl })}
      />
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-500">Primary CTA</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Label"
            value={value.primaryCta?.label ?? ""}
            onChange={(e) =>
              patch({
                primaryCta: {
                  label: e.target.value,
                  href: value.primaryCta?.href ?? "{{booking_url}}",
                  style: "primary",
                },
              })
            }
          />
          <input
            className={inputClass}
            placeholder="Link"
            value={value.primaryCta?.href ?? ""}
            onChange={(e) =>
              patch({
                primaryCta: {
                  label: value.primaryCta?.label ?? "Book Now",
                  href: e.target.value,
                  style: "primary",
                },
              })
            }
          />
        </div>
      </fieldset>
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-500">Secondary CTA</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Label"
            value={value.secondaryCta?.label ?? ""}
            onChange={(e) =>
              patch({
                secondaryCta: {
                  label: e.target.value,
                  href: value.secondaryCta?.href ?? "#contact",
                  style: "outline",
                },
              })
            }
          />
          <input
            className={inputClass}
            placeholder="Link"
            value={value.secondaryCta?.href ?? ""}
            onChange={(e) =>
              patch({
                secondaryCta: {
                  label: value.secondaryCta?.label ?? "Contact",
                  href: e.target.value,
                  style: "outline",
                },
              })
            }
          />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.floatingBookingButton ?? false}
          onChange={(e) => patch({ floatingBookingButton: e.target.checked })}
        />
        Floating booking button
      </label>
      <StringListEditor
        label="Trust badges"
        items={value.trustBadges ?? []}
        onChange={(trustBadges) => patch({ trustBadges })}
        placeholder="Licensed & insured"
      />
      <StatListEditor
        items={value.statistics ?? []}
        onChange={(statistics) => patch({ statistics })}
      />
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-500">Reviews badge</legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(value.reviewsBadge)}
            onChange={(e) =>
              patch({
                reviewsBadge: e.target.checked
                  ? { rating: 4.9, count: 120, label: "Google reviews" }
                  : null,
              })
            }
          />
          Show reviews badge
        </label>
        {value.reviewsBadge ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs">
              Rating
              <input
                type="number"
                step={0.1}
                min={0}
                max={5}
                className={inputClass}
                value={value.reviewsBadge.rating}
                onChange={(e) =>
                  patch({
                    reviewsBadge: {
                      ...value.reviewsBadge!,
                      rating: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="block text-xs">
              Count
              <input
                type="number"
                className={inputClass}
                value={value.reviewsBadge.count}
                onChange={(e) =>
                  patch({
                    reviewsBadge: {
                      ...value.reviewsBadge!,
                      count: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="block text-xs">
              Label
              <input
                className={inputClass}
                value={value.reviewsBadge.label ?? ""}
                onChange={(e) =>
                  patch({
                    reviewsBadge: {
                      ...value.reviewsBadge!,
                      label: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.whatsAppButton?.enabled ?? false}
          onChange={(e) =>
            patch({
              whatsAppButton: {
                ...value.whatsAppButton,
                enabled: e.target.checked,
                phone: value.whatsAppButton?.phone ?? "{{phone}}",
              },
            })
          }
        />
        WhatsApp button
      </label>
      {value.whatsAppButton?.enabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Phone"
            value={value.whatsAppButton.phone ?? ""}
            onChange={(e) =>
              patch({
                whatsAppButton: { ...value.whatsAppButton!, phone: e.target.value },
              })
            }
          />
          <input
            className={inputClass}
            placeholder="Prefilled message"
            value={value.whatsAppButton.message ?? ""}
            onChange={(e) =>
              patch({
                whatsAppButton: { ...value.whatsAppButton!, message: e.target.value },
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
