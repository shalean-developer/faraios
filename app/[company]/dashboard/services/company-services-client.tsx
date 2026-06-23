"use client";

import { type FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  createCompanyService,
  deleteCompanyService,
  updateCompanyService,
} from "@/app/actions/company-services";
import { formatPriceInput } from "@/lib/operations/metrics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";

type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  description: "",
  price: "0",
  active: true,
};

export function CompanyServicesClient({
  slug,
  company,
  services: initialServices,
}: {
  slug: string;
  company: CompanyWithIndustry;
  services: CompanyService[];
}) {
  const [rows, setRows] = useState(initialServices);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        companyId: company.id,
        companySlug: slug,
        name: form.name,
        category: form.category,
        description: form.description,
        price: form.price,
        active: form.active,
      };

      if (editingId) {
        const result = await updateCompanyService(editingId, payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const priceCents = Math.round(Number.parseFloat(form.price) * 100);
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingId
              ? {
                  ...row,
                  name: form.name.trim(),
                  category: form.category.trim() || null,
                  description: form.description.trim() || null,
                  base_price_cents: priceCents,
                  active: form.active,
                }
              : row
          )
        );
      } else {
        const result = await createCompanyService(payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const priceCents = Math.round(Number.parseFloat(form.price) * 100);
        setRows((prev) => [
          {
            id: result.id,
            company_id: company.id,
            name: form.name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            base_price_cents: priceCents,
            active: form.active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setForm(emptyForm);
      setEditingId(null);
    } finally {
      setPending(false);
    }
  };

  const startEdit = (service: CompanyService) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      category: service.category ?? "",
      description: service.description ?? "",
      price: formatPriceInput(service.base_price_cents),
      active: service.active,
    });
  };

  const onDelete = async (serviceId: string) => {
    if (!confirm("Delete this service?")) return;
    const result = await deleteCompanyService(serviceId, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== serviceId));
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Services</h1>
        <p className="mt-2 text-sm text-slate-500">
          Define your service catalog and pricing for bookings.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit service" : "Add service"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Service name"
            required
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Category"
          />
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
            />
            Active
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Description"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Saving..." : editingId ? "Update" : "Add service"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No services yet. Add your first service above.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    {row.description ? (
                      <p className="text-xs text-slate-500">{row.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    R {(row.base_price_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        row.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                        aria-label="Edit service"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
