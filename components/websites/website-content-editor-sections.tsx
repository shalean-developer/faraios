"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { WebsiteContentEditorModernSections } from "@/components/websites/website-content-editor-modern-sections";
import { WebsiteImageUploadField } from "@/components/websites/website-image-upload-field";
import {
  defaultLogoWidthForShape,
  LOGO_SHAPE_OPTIONS,
  logoShapeUsesCustomWidth,
  type LogoShape,
} from "@/lib/website-templates/logo-display";
import { SiteLogoMark } from "@/templates/service-business/site-logo";
import {
  type ChipFormItem,
  type FaqFormItem,
  type ServiceItem,
  type StepFormItem,
  type TitleDescriptionItem,
  type WebsiteContentFormData,
} from "@/components/websites/website-content-form-data";
import { cn } from "@/lib/utils";

export const BASIC_CONTENT_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

export const MODERN_OVERLAY_CONTENT_SECTIONS = [
  { id: "brand", label: "Brand" },
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "workProcess", label: "Work process" },
  { id: "whyChooseUs", label: "Quality You Trust" },
  { id: "featureBanner", label: "Feature banner" },
  { id: "transform", label: "Dreams Into Reality" },
  { id: "testimonials", label: "Clients Love Us" },
  { id: "craftsmanship", label: "Homes Made Perfect" },
  { id: "faq", label: "FAQ" },
  { id: "blog", label: "Expert Insights" },
  { id: "contact", label: "Contact" },
  { id: "footer", label: "Footer" },
] as const;

export const SERVICE_BUSINESS_CONTENT_SECTIONS = [
  { id: "brand", label: "Brand" },
  { id: "hero", label: "Hero" },
  { id: "services", label: "Services" },
  { id: "trust", label: "Trust" },
  { id: "about", label: "About" },
  { id: "process", label: "Process" },
  { id: "faq", label: "FAQ" },
  { id: "areas", label: "Areas" },
  { id: "cta", label: "CTA" },
  { id: "contact", label: "Contact" },
  { id: "footer", label: "Footer" },
] as const;

/** Labels aligned with the luxury beauty/spa homepage layout. */
export const LUXURY_BEAUTY_CONTENT_SECTIONS = [
  { id: "brand", label: "Brand" },
  { id: "hero", label: "Hero" },
  { id: "services", label: "Services" },
  { id: "trust", label: "Reviews" },
  { id: "about", label: "About" },
  { id: "process", label: "Blog" },
  { id: "faq", label: "FAQ" },
  { id: "areas", label: "Areas" },
  { id: "contact", label: "Contact" },
  { id: "footer", label: "Footer" },
] as const;

export type ContentSectionId =
  | (typeof SERVICE_BUSINESS_CONTENT_SECTIONS)[number]["id"]
  | (typeof MODERN_OVERLAY_CONTENT_SECTIONS)[number]["id"];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-slate-700";

type WebsiteContentEditorSectionsProps = {
  activeSection: ContentSectionId;
  formData: WebsiteContentFormData;
  setFormData: Dispatch<SetStateAction<WebsiteContentFormData>>;
  extended: boolean;
  luxuryLayout?: boolean;
  modernOverlay?: boolean;
  websiteId: string;
};

export function WebsiteContentEditorSections({
  activeSection,
  formData,
  setFormData,
  extended,
  luxuryLayout = false,
  modernOverlay = false,
  websiteId,
}: WebsiteContentEditorSectionsProps) {
  const updateService = (index: number, key: keyof ServiceItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        items: prev.services.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        items: [
          ...prev.services.items,
          { title: "", description: "", priceFrom: "", image: "", imageAlt: "" },
        ],
      },
    }));
  };

  const removeService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        items: prev.services.items.filter((_, i) => i !== index),
      },
    }));
  };

  const updateChip = (index: number, key: keyof ChipFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceChips: {
        ...prev.serviceChips,
        items: prev.serviceChips.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addChip = () => {
    setFormData((prev) => ({
      ...prev,
      serviceChips: {
        ...prev.serviceChips,
        items: [...prev.serviceChips.items, { title: "", priceFrom: "From R299" }],
      },
    }));
  };

  const removeChip = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      serviceChips: {
        ...prev.serviceChips,
        items: prev.serviceChips.items.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTrustBandItem = (
    index: number,
    key: keyof TitleDescriptionItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      trustBand: {
        ...prev.trustBand,
        items: prev.trustBand.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addTrustBandItem = () => {
    setFormData((prev) => ({
      ...prev,
      trustBand: {
        ...prev.trustBand,
        items: [...prev.trustBand.items, { title: "", description: "" }],
      },
    }));
  };

  const removeTrustBandItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      trustBand: {
        ...prev.trustBand,
        items: prev.trustBand.items.filter((_, i) => i !== index),
      },
    }));
  };

  const updateBenefit = (
    index: number,
    key: keyof TitleDescriptionItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: prev.whyChooseUs.benefits.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: [...prev.whyChooseUs.benefits, { title: "", description: "" }],
      },
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        benefits: prev.whyChooseUs.benefits.filter((_, i) => i !== index),
      },
    }));
  };

  const updateStep = (index: number, key: keyof StepFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: [...prev.howItWorks.steps, { title: "", description: "" }],
      },
    }));
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        steps: prev.howItWorks.steps.filter((_, i) => i !== index),
      },
    }));
  };

  const updateFaqItem = (index: number, key: keyof FaqFormItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: prev.faq.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const addFaqItem = () => {
    setFormData((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: [...prev.faq.items, { question: "", answer: "" }],
      },
    }));
  };

  const removeFaqItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        items: prev.faq.items.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {activeSection === "brand" && extended ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Brand & top bar</h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Logo, header contact details, social links, and the About section tagline."
              : "Logo, theme colors, and contact details shown in the site header bar."}
          </p>
          <div className="mt-4">
            <WebsiteImageUploadField
              label="Business logo"
              websiteId={websiteId}
              value={formData.topbar.logo}
              alt={formData.hero.businessName}
              hideAlt
              previewClassName="h-24 object-contain bg-white p-2"
              onValueChange={(logo) =>
                setFormData((prev) => ({
                  ...prev,
                  topbar: {
                    ...prev.topbar,
                    logo,
                    hideBusinessNameInHeader: logo.trim()
                      ? prev.topbar.hideBusinessNameInHeader
                      : false,
                  },
                }))
              }
              onAltChange={() => {}}
            />
          </div>
          <label className={cn(labelClass, "mt-4 block")}>
            Logo shape
            <select
              className={inputClass}
              value={formData.topbar.logoShape}
              onChange={(e) => {
                const logoShape = e.target.value as LogoShape;
                setFormData((prev) => ({
                  ...prev,
                  topbar: {
                    ...prev.topbar,
                    logoShape,
                    logoWidth: defaultLogoWidthForShape(logoShape, prev.topbar.logoSize),
                  },
                }));
              }}
            >
              {LOGO_SHAPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={cn(labelClass, "mt-4 block")}>
            Logo height ({formData.topbar.logoSize}px)
            <input
              type="range"
              min={24}
              max={120}
              step={2}
              className="mt-2 w-full accent-violet-600"
              value={formData.topbar.logoSize}
              onChange={(e) => {
                const logoSize = Number(e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  topbar: {
                    ...prev.topbar,
                    logoSize,
                    logoWidth: logoShapeUsesCustomWidth(prev.topbar.logoShape)
                      ? defaultLogoWidthForShape(prev.topbar.logoShape, logoSize)
                      : logoSize,
                  },
                }));
              }}
            />
          </label>
          {logoShapeUsesCustomWidth(formData.topbar.logoShape) ? (
            <label className={cn(labelClass, "mt-4 block")}>
              Logo width ({formData.topbar.logoWidth}px)
              <input
                type="range"
                min={formData.topbar.logoShape === "tall" ? 24 : formData.topbar.logoSize}
                max={formData.topbar.logoShape === "tall" ? formData.topbar.logoSize : 280}
                step={2}
                className="mt-2 w-full accent-violet-600"
                value={formData.topbar.logoWidth}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, logoWidth: Number(e.target.value) },
                  }))
                }
              />
            </label>
          ) : null}
          {formData.topbar.logo.trim() ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
              <div className="mt-3 flex items-center gap-3">
                <SiteLogoMark
                  logo={formData.topbar.logo}
                  alt={formData.hero.businessName || "Logo preview"}
                  size={formData.topbar.logoSize}
                  width={formData.topbar.logoWidth}
                  shape={formData.topbar.logoShape}
                  useLuxuryImage
                />
                {!formData.topbar.hideBusinessNameInHeader ? (
                  <span className="text-sm font-semibold text-slate-800">
                    {formData.hero.businessName || "Business name"}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <WebsiteImageUploadField
              label="Favicon"
              websiteId={websiteId}
              value={formData.theme.faviconUrl}
              alt="Site favicon"
              hideAlt
              previewClassName="h-12 w-12 object-contain bg-white p-1"
              onValueChange={(faviconUrl) =>
                setFormData((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, faviconUrl },
                }))
              }
              onAltChange={() => {}}
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown in the browser tab. Use a square PNG or ICO (32×32 or 64×64 recommended).
            </p>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={formData.topbar.hideBusinessNameInHeader}
              disabled={!formData.topbar.logo.trim()}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  topbar: { ...prev.topbar, hideBusinessNameInHeader: e.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Hide business name in header
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {formData.topbar.logo.trim()
                  ? "Show only the logo in the site header — useful when your logo already includes the business name."
                  : "Upload a logo first to hide the text business name from the header."}
              </span>
            </span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Primary color
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200"
                  value={formData.theme.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, primaryColor: e.target.value },
                    }))
                  }
                />
                <input
                  className={cn(inputClass, "mt-0")}
                  value={formData.theme.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, primaryColor: e.target.value },
                    }))
                  }
                />
              </div>
            </label>
            <label className={labelClass}>
              Accent color
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200"
                  value={formData.theme.accentColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, accentColor: e.target.value },
                    }))
                  }
                />
                <input
                  className={cn(inputClass, "mt-0")}
                  value={formData.theme.accentColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, accentColor: e.target.value },
                    }))
                  }
                />
              </div>
            </label>
          </div>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Tagline
              <input
                className={inputClass}
                value={formData.topbar.tagline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, tagline: e.target.value },
                  }))
                }
                placeholder={luxuryLayout ? "e.g. Holistic wellness at your door" : "e.g. TRUSTED LOCAL SERVICE."}
              />
            </label>
            <label className={labelClass}>
              Service area
              <input
                className={inputClass}
                value={formData.topbar.serviceArea}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, serviceArea: e.target.value },
                  }))
                }
                placeholder="e.g. Cape Town & surrounds"
              />
            </label>
            <label className={labelClass}>
              Business hours
              <input
                className={inputClass}
                value={formData.topbar.hours}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, hours: e.target.value },
                  }))
                }
                placeholder="Mon–Sat: 8:00 AM – 6:00 PM"
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                className={inputClass}
                value={formData.topbar.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, phone: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                className={inputClass}
                type="email"
                value={formData.topbar.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, email: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Facebook URL
              <input
                className={inputClass}
                value={formData.topbar.facebook}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, facebook: e.target.value },
                  }))
                }
                placeholder="https://facebook.com/..."
              />
            </label>
            <label className={labelClass}>
              Instagram URL
              <input
                className={inputClass}
                value={formData.topbar.instagram}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    topbar: { ...prev.topbar, instagram: e.target.value },
                  }))
                }
                placeholder="https://instagram.com/..."
              />
            </label>
          </div>
        </>
      ) : null}

      {activeSection === "hero" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Hero section</h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Full-bleed hero headline, subtitle, badge, and background image."
              : "Main headline and call-to-action on the homepage."}
          </p>
          <div className="mt-4 grid gap-3">
            {extended ? (
              <>
                <label className={labelClass}>
                  Business name
                  <input
                    className={inputClass}
                    value={formData.hero.businessName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, businessName: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Headline
                  <input
                    className={inputClass}
                    value={formData.hero.headline}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headline: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Subtitle
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={formData.hero.subtitle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Location badge
                  <input
                    className={inputClass}
                    value={formData.hero.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, location: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Hero badge label
                  <input
                    className={inputClass}
                    value={formData.hero.badge}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, badge: e.target.value },
                      }))
                    }
                    placeholder="e.g. CAPE TOWN'S TRUSTED SPA"
                  />
                </label>
                <label className={labelClass}>
                  Starting price
                  <input
                    className={inputClass}
                    value={formData.hero.startingPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, startingPrice: e.target.value },
                      }))
                    }
                    placeholder="From R299"
                  />
                </label>
                <label className={labelClass}>
                  Trust bullets
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={formData.hero.trustBullets}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, trustBullets: e.target.value },
                      }))
                    }
                    placeholder="One benefit per line"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Primary CTA label
                    <input
                      className={inputClass}
                      value={formData.hero.ctaLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaLabel: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    Secondary CTA label
                    <input
                      className={inputClass}
                      value={formData.hero.ctaSecondaryLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaSecondaryLabel: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
                <label className={labelClass}>
                  Quote CTA label
                  <input
                    className={inputClass}
                    value={formData.hero.quoteCtaLabel}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, quoteCtaLabel: e.target.value },
                      }))
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Rating
                    <input
                      className={inputClass}
                      value={formData.hero.rating}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, rating: e.target.value },
                        }))
                      }
                      placeholder="4.9"
                    />
                  </label>
                  <label className={labelClass}>
                    Rating count
                    <input
                      className={inputClass}
                      value={formData.hero.ratingCount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ratingCount: e.target.value },
                        }))
                      }
                      placeholder="120+ Google reviews"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Floating stat value
                    <input
                      className={inputClass}
                      value={formData.hero.floatingStatValue}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, floatingStatValue: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    Floating stat label
                    <input
                      className={inputClass}
                      value={formData.hero.floatingStatLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, floatingStatLabel: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className={labelClass}>
                  Title
                  <input
                    className={inputClass}
                    value={formData.hero.headline}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headline: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Subtitle
                  <input
                    className={inputClass}
                    value={formData.hero.subtitle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  CTA text
                  <input
                    className={inputClass}
                    value={formData.hero.ctaLabel}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, ctaLabel: e.target.value },
                      }))
                    }
                  />
                </label>
              </>
            )}
            <WebsiteImageUploadField
              label="Hero image"
              websiteId={websiteId}
              value={formData.hero.image}
              alt={formData.hero.imageAlt}
              onValueChange={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, image },
                }))
              }
              onAltChange={(imageAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, imageAlt },
                }))
              }
            />
          </div>
        </>
      ) : null}

      {activeSection === "services" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Services section</h2>
              <p className="mt-1 text-sm text-slate-500">
                {modernOverlay
                  ? "The large photo on the right matches the selected service in the list — set an image on each service below."
                  : luxuryLayout
                    ? "Service list, images, and chips shown on the homepage and /services page."
                    : "List the services this business offers."}
              </p>
            </div>
            <Button type="button" onClick={addService}>
              Add service
            </Button>
          </div>
          <label className={cn(labelClass, "mt-4 block")}>
            Heading
            <input
              className={inputClass}
              value={formData.services.heading}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  services: { ...prev.services, heading: e.target.value },
                }))
              }
            />
          </label>
          {extended ? (
            <label className={cn(labelClass, "mt-3 block")}>
              Subtitle
              <textarea
                className={inputClass}
                rows={2}
                value={formData.services.subtitle}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    services: { ...prev.services, subtitle: e.target.value },
                  }))
                }
              />
            </label>
          ) : null}
          <div className="mt-4 space-y-3">
            {formData.services.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No services yet. Add one to populate this section.
              </p>
            ) : null}
            {formData.services.items.map((item, idx) => (
              <div key={`${idx}-${item.title}`} className="rounded-xl border border-slate-200 p-3">
                <div className="grid gap-2">
                  <label className={labelClass}>
                    Service title
                    <input
                      className={inputClass}
                      value={item.title}
                      onChange={(e) => updateService(idx, "title", e.target.value)}
                    />
                  </label>
                  <label className={labelClass}>
                    Description
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateService(idx, "description", e.target.value)}
                    />
                  </label>
                  {extended ? (
                    <label className={labelClass}>
                      Price from
                      <input
                        className={inputClass}
                        value={item.priceFrom}
                        onChange={(e) => updateService(idx, "priceFrom", e.target.value)}
                        placeholder="From R299"
                      />
                    </label>
                  ) : null}
                  <WebsiteImageUploadField
                    label="Service image"
                    websiteId={websiteId}
                    value={item.image}
                    alt={item.imageAlt}
                    onValueChange={(image) => updateService(idx, "image", image)}
                    onAltChange={(imageAlt) => updateService(idx, "imageAlt", imageAlt)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => removeService(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {extended ? (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Service chips</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Quick-scroll service pills shown below the hero.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addChip}>
                  Add chip
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {formData.serviceChips.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
                    No service chips yet.
                  </p>
                ) : null}
                {formData.serviceChips.items.map((chip, idx) => (
                  <div
                    key={`chip-${idx}-${chip.title}`}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className={labelClass}>
                        Title
                        <input
                          className={inputClass}
                          value={chip.title}
                          onChange={(e) => updateChip(idx, "title", e.target.value)}
                        />
                      </label>
                      <label className={labelClass}>
                        Price from
                        <input
                          className={inputClass}
                          value={chip.priceFrom}
                          onChange={(e) => updateChip(idx, "priceFrom", e.target.value)}
                        />
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => removeChip(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeSection === "trust" && extended && !modernOverlay ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">
            {luxuryLayout ? "Reviews & stats" : "Trust & credibility"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Google review quote, stats band, and strategy section copy. Trust band is hidden on the luxury layout."
              : "Trust band, why choose us, and social proof stats."}
          </p>

          {!luxuryLayout ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Trust band items</h3>
              <Button type="button" variant="outline" onClick={addTrustBandItem}>
                Add item
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {formData.trustBand.items.map((item, idx) => (
                <div key={`trust-${idx}`} className="rounded-xl border border-slate-200 p-3">
                  <label className={labelClass}>
                    Title
                    <input
                      className={inputClass}
                      value={item.title}
                      onChange={(e) => updateTrustBandItem(idx, "title", e.target.value)}
                    />
                  </label>
                  <label className={cn(labelClass, "mt-2 block")}>
                    Description
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateTrustBandItem(idx, "description", e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => removeTrustBandItem(idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          <div className={`${luxuryLayout ? "mt-0" : "mt-8 border-t border-slate-100 pt-6"}`}>
            <h3 className="text-base font-semibold text-slate-900">
              {luxuryLayout ? "About & strategy copy" : "Why choose us"}
            </h3>
            {luxuryLayout ? (
              <p className="mt-1 text-sm text-slate-500">
                Body text powers the hero dock, About page, and Strategy section.
              </p>
            ) : null}
            <div className="mt-3 grid gap-3">
              <label className={labelClass}>
                Heading
                <input
                  className={inputClass}
                  value={formData.whyChooseUs.heading}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      whyChooseUs: { ...prev.whyChooseUs, heading: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Body
                <textarea
                  className={inputClass}
                  rows={4}
                  value={formData.whyChooseUs.body}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      whyChooseUs: { ...prev.whyChooseUs, body: e.target.value },
                    }))
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  CTA label
                  <input
                    className={inputClass}
                    value={formData.whyChooseUs.ctaLabel}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        whyChooseUs: { ...prev.whyChooseUs, ctaLabel: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  WhatsApp number
                  <input
                    className={inputClass}
                    value={formData.whyChooseUs.whatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        whyChooseUs: { ...prev.whyChooseUs, whatsapp: e.target.value },
                      }))
                    }
                    placeholder="+27..."
                  />
                </label>
              </div>
              <WebsiteImageUploadField
                label="Section image"
                websiteId={websiteId}
                value={formData.whyChooseUs.image}
                alt={formData.whyChooseUs.imageAlt}
                onValueChange={(image) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, image },
                  }))
                }
                onAltChange={(imageAlt) =>
                  setFormData((prev) => ({
                    ...prev,
                    whyChooseUs: { ...prev.whyChooseUs, imageAlt },
                  }))
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-800">Benefits</h4>
              <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                Add benefit
              </Button>
            </div>
            {!luxuryLayout ? (
            <div className="mt-3 space-y-3">
              {formData.whyChooseUs.benefits.map((benefit, idx) => (
                <div key={`benefit-${idx}`} className="rounded-xl border border-slate-200 p-3">
                  <label className={labelClass}>
                    Title
                    <input
                      className={inputClass}
                      value={benefit.title}
                      onChange={(e) => updateBenefit(idx, "title", e.target.value)}
                    />
                  </label>
                  <label className={cn(labelClass, "mt-2 block")}>
                    Description
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={benefit.description}
                      onChange={(e) => updateBenefit(idx, "description", e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => removeBenefit(idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Benefits are not shown on the luxury layout.
              </p>
            )}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-base font-semibold text-slate-900">Social proof</h3>
            {luxuryLayout ? (
              <p className="mt-1 text-sm text-slate-500">
                Stats appear on the Reviews page; years of expertise uses Established year.
              </p>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Established year
                <input
                  className={inputClass}
                  value={formData.socialProof.establishedYear}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, establishedYear: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Jobs completed
                <input
                  className={inputClass}
                  value={formData.socialProof.jobsCompleted}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, jobsCompleted: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Satisfaction rate
                <input
                  className={inputClass}
                  value={formData.socialProof.satisfactionRate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, satisfactionRate: e.target.value },
                    }))
                  }
                  placeholder="98%"
                />
              </label>
              <label className={labelClass}>
                Response time
                <input
                  className={inputClass}
                  value={formData.socialProof.responseTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, responseTime: e.target.value },
                    }))
                  }
                  placeholder="2hr"
                />
              </label>
              <label className={cn(labelClass, "sm:col-span-2")}>
                Google reviews label
                <input
                  className={inputClass}
                  value={formData.socialProof.googleReviews}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, googleReviews: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={cn(labelClass, "sm:col-span-2")}>
                Review quote
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.socialProof.reviewQuote}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, reviewQuote: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={cn(labelClass, "sm:col-span-2")}>
                Review author
                <input
                  className={inputClass}
                  value={formData.socialProof.reviewAuthor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialProof: { ...prev.socialProof, reviewAuthor: e.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </div>
        </>
      ) : null}

      {activeSection === "about" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">About section</h2>
          <p className="mt-1 text-sm text-slate-500">
            {modernOverlay
              ? "Three photos in a grid beside your story — each upload maps to a specific slot on the preview."
              : "Tell visitors about the business and what makes it unique."}
          </p>
          <label className={cn(labelClass, "mt-4 block")}>
            Heading
            <input
              className={inputClass}
              value={formData.about.heading}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, heading: e.target.value },
                }))
              }
            />
          </label>
          <label className={cn(labelClass, "mt-3 block")}>
            Content
            <textarea
              className={inputClass}
              rows={6}
              value={formData.about.body}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, body: e.target.value },
                }))
              }
            />
          </label>
          <div className="mt-3">
            <WebsiteImageUploadField
              label={modernOverlay ? "Tall photo (right column, top)" : "About image"}
              websiteId={websiteId}
              value={formData.about.image}
              alt={formData.about.imageAlt}
              onValueChange={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, image },
                }))
              }
              onAltChange={(imageAlt) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, imageAlt },
                }))
              }
            />
          </div>
          {modernOverlay ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <WebsiteImageUploadField
                  label="Left column photo"
                  websiteId={websiteId}
                  value={formData.about.imageSecondary}
                  alt={formData.about.imageAlt}
                  hideAlt
                  onValueChange={(imageSecondary) =>
                    setFormData((prev) => ({
                      ...prev,
                      about: { ...prev.about, imageSecondary },
                    }))
                  }
                  onAltChange={() => {}}
                />
                <WebsiteImageUploadField
                  label="Small photo (right column, bottom)"
                  websiteId={websiteId}
                  value={formData.about.imageTertiary}
                  alt={formData.about.imageAlt}
                  hideAlt
                  onValueChange={(imageTertiary) =>
                    setFormData((prev) => ({
                      ...prev,
                      about: { ...prev.about, imageTertiary },
                    }))
                  }
                  onAltChange={() => {}}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Stat 1 value
                  <input
                    className={inputClass}
                    value={formData.about.stat1Value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        about: { ...prev.about, stat1Value: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Stat 1 label
                  <input
                    className={inputClass}
                    value={formData.about.stat1Label}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        about: { ...prev.about, stat1Label: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Stat 2 value
                  <input
                    className={inputClass}
                    value={formData.about.stat2Value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        about: { ...prev.about, stat2Value: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Stat 2 label
                  <input
                    className={inputClass}
                    value={formData.about.stat2Label}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        about: { ...prev.about, stat2Label: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {activeSection === "process" && extended && !modernOverlay ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {luxuryLayout ? "Wellness blog" : "How it works"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {luxuryLayout
                  ? "Three steps become blog cards on the homepage and /blog page."
                  : "Step-by-step process shown on the homepage."}
              </p>
            </div>
            <Button type="button" onClick={addStep}>
              Add step
            </Button>
          </div>
          <label className={cn(labelClass, "mt-4 block")}>
            Heading
            <input
              className={inputClass}
              value={formData.howItWorks.heading}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  howItWorks: { ...prev.howItWorks, heading: e.target.value },
                }))
              }
            />
          </label>
          <div className="mt-4 space-y-3">
            {formData.howItWorks.steps.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No steps yet. Add one to show your process.
              </p>
            ) : null}
            {formData.howItWorks.steps.map((step, idx) => (
              <div key={`step-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Step {idx + 1}</p>
                <label className={cn(labelClass, "mt-2 block")}>
                  Title
                  <input
                    className={inputClass}
                    value={step.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                  />
                </label>
                <label className={cn(labelClass, "mt-2 block")}>
                  Description
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={step.description}
                    onChange={(e) => updateStep(idx, "description", e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => removeStep(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "faq" && extended ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
              <p className="mt-1 text-sm text-slate-500">
                Common questions and answers for visitors.
              </p>
            </div>
            <Button type="button" onClick={addFaqItem}>
              Add question
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.faq.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Intro text
              <textarea
                className={inputClass}
                rows={2}
                value={formData.faq.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, body: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              CTA label
              <input
                className={inputClass}
                value={formData.faq.ctaLabel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, ctaLabel: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <div className="mt-4 space-y-3">
            {formData.faq.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No FAQ items yet.
              </p>
            ) : null}
            {formData.faq.items.map((item, idx) => (
              <div key={`faq-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <label className={labelClass}>
                  Question
                  <input
                    className={inputClass}
                    value={item.question}
                    onChange={(e) => updateFaqItem(idx, "question", e.target.value)}
                  />
                </label>
                <label className={cn(labelClass, "mt-2 block")}>
                  Answer
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={item.answer}
                    onChange={(e) => updateFaqItem(idx, "answer", e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => removeFaqItem(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "areas" && extended && !modernOverlay ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Service areas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Areas you serve, with popular suburbs highlighted.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.serviceAreas.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceAreas: { ...prev.serviceAreas, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Intro
              <textarea
                className={inputClass}
                rows={2}
                value={formData.serviceAreas.intro}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceAreas: { ...prev.serviceAreas, intro: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Popular areas
              <textarea
                className={inputClass}
                rows={4}
                value={formData.serviceAreas.popular}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceAreas: { ...prev.serviceAreas, popular: e.target.value },
                  }))
                }
                placeholder="One area per line"
              />
            </label>
            <label className={labelClass}>
              All service areas
              <textarea
                className={inputClass}
                rows={6}
                value={formData.serviceAreas.areas}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceAreas: { ...prev.serviceAreas, areas: e.target.value },
                  }))
                }
                placeholder="One suburb or area per line"
              />
            </label>
            <label className={labelClass}>
              CTA label
              <input
                className={inputClass}
                value={formData.serviceAreas.ctaLabel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceAreas: { ...prev.serviceAreas, ctaLabel: e.target.value },
                  }))
                }
              />
            </label>
          </div>
        </>
      ) : null}

      {activeSection === "cta" && extended && !modernOverlay ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Final CTA</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bottom-of-page call to action before the footer.
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.finalCta.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    finalCta: { ...prev.finalCta, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Body
              <textarea
                className={inputClass}
                rows={3}
                value={formData.finalCta.body}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    finalCta: { ...prev.finalCta, body: e.target.value },
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Primary button label
                <input
                  className={inputClass}
                  value={formData.finalCta.primaryLabel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      finalCta: { ...prev.finalCta, primaryLabel: e.target.value },
                    }))
                  }
                />
              </label>
              <label className={labelClass}>
                Secondary button label
                <input
                  className={inputClass}
                  value={formData.finalCta.secondaryLabel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      finalCta: { ...prev.finalCta, secondaryLabel: e.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </div>
        </>
      ) : null}

      {activeSection === "contact" ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Contact section</h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Phone and email power the header, footer, and booking form. Heading is optional on the luxury layout."
              : "How customers can reach this business. Phone and email also update the top bar."}
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              Heading
              <input
                className={inputClass}
                value={formData.contact.heading}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, heading: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                className={inputClass}
                value={formData.contact.phone}
                onChange={(e) => {
                  const phone = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, phone },
                    topbar: { ...prev.topbar, phone },
                  }));
                }}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                className={inputClass}
                type="email"
                value={formData.contact.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, email },
                    topbar: { ...prev.topbar, email },
                  }));
                }}
              />
            </label>
            <label className={labelClass}>
              Address
              <input
                className={inputClass}
                value={formData.contact.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, address: e.target.value },
                  }))
                }
              />
            </label>
            <label className={labelClass}>
              Extra details
              <textarea
                className={inputClass}
                rows={3}
                value={formData.contact.details}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, details: e.target.value },
                  }))
                }
              />
            </label>
          </div>
        </>
      ) : null}

      {activeSection === "footer" && extended ? (
        <>
          <h2 className="text-lg font-semibold text-slate-900">Footer</h2>
          <p className="mt-1 text-sm text-slate-500">
            {luxuryLayout
              ? "Description becomes the large footer headline. Social links use Brand tab URLs."
              : "Footer description and link columns (one link per line)."}
          </p>
          <div className="mt-4 grid gap-3">
            <label className={labelClass}>
              {luxuryLayout || modernOverlay ? "Footer headline" : "Description"}
              <textarea
                className={inputClass}
                rows={3}
                value={formData.footer.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, description: e.target.value },
                  }))
                }
                placeholder={
                  luxuryLayout
                    ? "Holistic perspectives for Being and Spirit"
                    : modernOverlay
                      ? "Modern Home Upgrades Made Easy Today"
                      : undefined
                }
              />
            </label>
            {modernOverlay ? (
              <>
                <label className={labelClass}>
                  Newsletter heading
                  <input
                    className={inputClass}
                    value={formData.footer.newsletterHeading}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, newsletterHeading: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Newsletter body
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={formData.footer.newsletterBody}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, newsletterBody: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className={labelClass}>
                  Copyright business name
                  <input
                    className={inputClass}
                    value={formData.footer.copyrightName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightName: e.target.value },
                      }))
                    }
                    placeholder={formData.hero.businessName}
                  />
                </label>
              </>
            ) : null}
            <label className={labelClass}>
              Service links
              <textarea
                className={inputClass}
                rows={4}
                value={formData.footer.serviceLinks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, serviceLinks: e.target.value },
                  }))
                }
                placeholder="One link label per line"
              />
            </label>
            <label className={labelClass}>
              Company links
              <textarea
                className={inputClass}
                rows={4}
                value={formData.footer.companyLinks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, companyLinks: e.target.value },
                  }))
                }
                placeholder="One link label per line"
              />
            </label>
            {modernOverlay ? (
              <label className={labelClass}>
                Resource links
                <textarea
                  className={inputClass}
                  rows={4}
                  value={formData.footer.resourceLinks}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, resourceLinks: e.target.value },
                    }))
                  }
                  placeholder="One link label per line"
                />
              </label>
            ) : null}
            <label className={labelClass}>
              Support links
              <textarea
                className={inputClass}
                rows={4}
                value={formData.footer.supportLinks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, supportLinks: e.target.value },
                  }))
                }
                placeholder="One link label per line"
              />
            </label>
          </div>
        </>
      ) : null}

      {modernOverlay ? (
        <WebsiteContentEditorModernSections
          activeSection={activeSection}
          formData={formData}
          setFormData={setFormData}
          websiteId={websiteId}
        />
      ) : null}
    </div>
  );
}
