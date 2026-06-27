"use client";

import { useMemo, useState } from "react";

import { getContactFormSettings, visibleFormFields } from "@/lib/website-builder/forms";
import type { BuilderWebsite } from "@/types/website-builder";
import type { WebsiteContactFormSettings, WebsiteFormField } from "@/types/website-builder-forms";
import { trackPublicSiteConversion } from "./public-site-tracking";

type Props = {
  companySlug: string;
  companyId?: string;
  websiteId?: string;
  services: string[];
  primaryColor?: string;
  website?: BuilderWebsite | null;
  formSettings?: WebsiteContactFormSettings;
};

function fieldInputType(field: WebsiteFormField): string {
  if (field.type === "email") return "email";
  if (field.type === "phone") return "tel";
  return "text";
}

export function PublicContactForm({
  companySlug,
  companyId,
  websiteId,
  services,
  primaryColor = "#6366f1",
  website,
  formSettings: formSettingsProp,
}: Props) {
  const formSettings = useMemo(
    () => formSettingsProp ?? (website ? getContactFormSettings({ website }) : null),
    [formSettingsProp, website]
  );

  const fields = formSettings ? visibleFormFields(formSettings) : null;

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const payload = {
      name: values.name ?? "",
      email: values.email ?? "",
      phone: values.phone ?? "",
      message: values.message ?? "",
      serviceInterest: values.service ?? "",
    };

    try {
      const res = await fetch(`/api/public/site/${encodeURIComponent(companySlug)}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error ?? "Could not send your message.");
        return;
      }
      if (companyId && websiteId) {
        trackPublicSiteConversion({
          companyId,
          websiteId,
          eventType: "contact_submission",
        });
      }
      setStatus("success");
      setValues({});
    } catch {
      setStatus("error");
      setError("Could not send your message. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <p className="font-semibold">{formSettings?.successHeading ?? "Message sent"}</p>
        <p className="mt-1 text-sm">
          {formSettings?.successMessage ?? "We will get back to you soon."}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const activeFields =
    fields ??
    [
      { id: "name", type: "name" as const, label: "Name", required: true, visible: true },
      { id: "email", type: "email" as const, label: "Email", required: false, visible: true },
      { id: "phone", type: "phone" as const, label: "Phone", required: false, visible: true },
      ...(services.length > 0
        ? [{ id: "service", type: "service" as const, label: "Service interested in", required: false, visible: true }]
        : []),
      { id: "message", type: "message" as const, label: "Message", required: true, visible: true },
    ];

  const submitLabel = formSettings?.submitLabel ?? "Send message";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {activeFields.map((field) => {
        if (field.type === "service") {
          if (services.length === 0) return null;
          return (
            <div key={field.id}>
              <label className="text-sm font-medium text-slate-900">{field.label}</label>
              <select
                value={values.service ?? ""}
                required={field.required}
                onChange={(e) => setValue("service", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{field.placeholder ?? "Select a service"}</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "message") {
          return (
            <div key={field.id}>
              <label className="text-sm font-medium text-slate-900">{field.label}</label>
              <textarea
                required={field.required}
                rows={4}
                value={values.message ?? ""}
                placeholder={field.placeholder}
                onChange={(e) => setValue("message", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          );
        }

        return (
          <div key={field.id}>
            <label className="text-sm font-medium text-slate-900">{field.label}</label>
            <input
              type={fieldInputType(field)}
              required={field.required}
              value={values[field.type] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => setValue(field.type, e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        );
      })}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {status === "loading" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
