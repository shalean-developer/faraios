"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";

import {
  createCompanyService,
  updateCompanyService,
} from "@/app/actions/company-services";
import { Button } from "@/components/ui/button";
import {
  addonsFromService,
  type AddonFormRow,
} from "@/lib/company-services/addons";
import { SERVICE_CATEGORY_PRESETS } from "@/lib/company-services/constants";
import { formatPriceInput } from "@/lib/operations/metrics";
import type { ServiceTemplate } from "@/lib/company-services/constants";
import type { CompanyService } from "@/types/database";

type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  description: "",
  price: "0",
  durationMinutes: "",
  active: true,
};

function templateToForm(template: ServiceTemplate): {
  form: FormState;
  addons: AddonFormRow[];
} {
  return {
    form: {
      name: template.name,
      category: template.category,
      description: template.description,
      price: template.price,
      durationMinutes: String(template.durationMinutes),
      active: true,
    },
    addons: template.addons.map((addon) => ({
      id: crypto.randomUUID(),
      name: addon.name,
      price: addon.price,
    })),
  };
}

function serviceToForm(service: CompanyService): {
  form: FormState;
  addons: AddonFormRow[];
} {
  return {
    form: {
      name: service.name,
      category: service.category ?? "",
      description: service.description ?? "",
      price: formatPriceInput(service.base_price_cents),
      durationMinutes:
        service.duration_minutes != null ? String(service.duration_minutes) : "",
      active: service.active,
    },
    addons: addonsFromService(service.addons as never[]),
  };
}

export function ServiceFormPopover({
  open,
  onClose,
  slug,
  companyId,
  service = null,
  template = null,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  service?: CompanyService | null;
  template?: ServiceTemplate | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [addonRows, setAddonRows] = useState<AddonFormRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = service != null;
  const title = isEditing ? "Edit service" : "Add service";

  useEffect(() => {
    if (!open) return;

    if (service) {
      const mapped = serviceToForm(service);
      setForm(mapped.form);
      setAddonRows(mapped.addons);
    } else if (template) {
      const mapped = templateToForm(template);
      setForm(mapped.form);
      setAddonRows(mapped.addons);
    } else {
      setForm(emptyForm);
      setAddonRows([]);
    }

    setError(null);
  }, [open, service, template]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const addAddonRow = () => {
    setAddonRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), name: "", price: "0" },
    ]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const payload = {
        companyId,
        companySlug: slug,
        name: form.name,
        category: form.category,
        description: form.description,
        price: form.price,
        durationMinutes: form.durationMinutes,
        active: form.active,
        addons: addonRows,
      };

      const result = isEditing
        ? await updateCompanyService(service.id, payload)
        : await createCompanyService(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close service form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p
            id="service-form-popover-title"
            className="text-sm font-semibold text-slate-900"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Service name"
              required
            />
            <div className="sm:col-span-2">
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="service-category-presets"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Category"
              />
              <datalist id="service-category-presets">
                {SERVICE_CATEGORY_PRESETS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              type="number"
              min="0"
              step="0.01"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Price (ZAR)"
              required
            />
            <input
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMinutes: e.target.value }))
              }
              type="number"
              min="0"
              step="15"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Duration (minutes)"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Active (visible on booking forms)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Description"
            />
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Add-ons</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={addAddonRow}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add add-on
              </Button>
            </div>
            {addonRows.length === 0 ? (
              <p className="text-xs text-slate-500">
                Optional extras customers can select (e.g. inside oven, windows).
              </p>
            ) : (
              <div className="space-y-2">
                {addonRows.map((row) => (
                  <div key={row.id} className="flex gap-2">
                    <input
                      value={row.name}
                      onChange={(e) =>
                        setAddonRows((rows) =>
                          rows.map((item) =>
                            item.id === row.id
                              ? { ...item, name: e.target.value }
                              : item
                          )
                        )
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Add-on name"
                    />
                    <input
                      value={row.price}
                      onChange={(e) =>
                        setAddonRows((rows) =>
                          rows.map((item) =>
                            item.id === row.id
                              ? { ...item, price: e.target.value }
                              : item
                          )
                        )
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="ZAR"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAddonRows((rows) => rows.filter((item) => item.id !== row.id))
                      }
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove add-on"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving..." : isEditing ? "Update service" : "Add service"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
