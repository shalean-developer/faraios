"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type WebsiteContentFormPayload,
  updateWebsiteContentAction,
} from "@/app/actions/websites";
import { Button } from "@/components/ui/button";
import type { WebsiteContent } from "@/types/database";

type ServiceItem = { title: string; description: string };

type FormData = {
  hero: {
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  services: {
    heading: string;
    items: ServiceItem[];
  };
  about: {
    heading: string;
    body: string;
  };
  contact: {
    heading: string;
    phone: string;
    email: string;
    address: string;
    details: string;
  };
};

function toRecord(rows: WebsiteContent[]): Record<string, Record<string, unknown>> {
  return rows.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
    acc[row.section] = row.content ?? {};
    return acc;
  }, {});
}

function toServiceItems(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw)) return [];
  const objectItems = raw
    .map((item) => {
      if (typeof item !== "object" || !item) return null;
      const title = (item as { title?: unknown }).title;
      const description = (item as { description?: unknown }).description;
      return {
        title: typeof title === "string" ? title : "",
        description: typeof description === "string" ? description : "",
      };
    })
    .filter((item): item is ServiceItem => item !== null);
  if (objectItems.length > 0) return objectItems;
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((title) => ({ title, description: "" }));
}

function buildInitialFormData(rows: WebsiteContent[]): FormData {
  const content = toRecord(rows);
  const hero = content.hero ?? {};
  const services = content.services ?? {};
  const about = content.about ?? {};
  const contact = content.contact ?? {};

  return {
    hero: {
      title: typeof hero.title === "string" ? hero.title : "",
      subtitle: typeof hero.subtitle === "string" ? hero.subtitle : "",
      ctaLabel: typeof hero.ctaLabel === "string" ? hero.ctaLabel : "",
    },
    services: {
      heading: typeof services.heading === "string" ? services.heading : "Services",
      items: toServiceItems(services.items),
    },
    about: {
      heading: typeof about.heading === "string" ? about.heading : "About",
      body: typeof about.body === "string" ? about.body : "",
    },
    contact: {
      heading: typeof contact.heading === "string" ? contact.heading : "Contact",
      phone: typeof contact.phone === "string" ? contact.phone : "",
      email: typeof contact.email === "string" ? contact.email : "",
      address: typeof contact.address === "string" ? contact.address : "",
      details: typeof contact.details === "string" ? contact.details : "",
    },
  };
}

type Props = {
  websiteId: string;
  companySlug: string;
  previewUrl: string;
  contentRows: WebsiteContent[];
};

export function WebsiteContentEditor({
  websiteId,
  companySlug,
  previewUrl,
  contentRows,
}: Props) {
  const [formData, setFormData] = useState<FormData>(() =>
    buildInitialFormData(contentRows)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        items: [...prev.services.items, { title: "", description: "" }],
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

  const updateService = (
    index: number,
    key: "title" | "description",
    value: string
  ) => {
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

  const onSave = async () => {
    setPending(true);
    setError(null);
    const payload: WebsiteContentFormPayload = {
      hero: formData.hero,
      services: formData.services,
      about: formData.about,
      contact: formData.contact,
    };
    try {
      const result = await updateWebsiteContentAction(websiteId, companySlug, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToast("Saved successfully");
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${encodeURIComponent(companySlug)}/dashboard`}
          className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
        >
          ← Back to dashboard
        </Link>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900"
        >
          Preview Website →
        </a>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Website Content Editor
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Update content sections and publish changes instantly.
      </p>

      <section className="mt-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Hero Section</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium text-slate-700">
              Title
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.hero.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, title: e.target.value },
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Subtitle
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.hero.subtitle}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, subtitle: e.target.value },
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              CTA text
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.hero.ctaLabel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, ctaLabel: e.target.value },
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Services Section</h2>
            <Button type="button" onClick={addService}>
              Add service
            </Button>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Heading
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={formData.services.heading}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  services: { ...prev.services, heading: e.target.value },
                }))
              }
            />
          </label>
          <div className="mt-4 space-y-3">
            {formData.services.items.map((item, idx) => (
              <div key={`${idx}-${item.title}`} className="rounded-xl border border-slate-200 p-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Service title
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={item.title}
                      onChange={(e) => updateService(idx, "title", e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Description
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateService(idx, "description", e.target.value)}
                    />
                  </label>
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">About Section</h2>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Heading
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={formData.about.heading}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, heading: e.target.value },
                }))
              }
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Content
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={5}
              value={formData.about.body}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  about: { ...prev.about, body: e.target.value },
                }))
              }
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contact Section</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.contact.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, phone: e.target.value },
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.contact.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, email: e.target.value },
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Address
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formData.contact.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, address: e.target.value },
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Extra details
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
        </div>
      </section>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="mt-6">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {toast ? (
        <div className="fixed bottom-4 right-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
