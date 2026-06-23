"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { companyCustomerPath } from "@/lib/paths/company";
import type { CompanyWithIndustry, Customer } from "@/types/database";

type FormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", notes: "" };

export function CompanyCustomersClient({
  slug,
  company,
  customers: initialCustomers,
}: {
  slug: string;
  company: CompanyWithIndustry;
  customers: Customer[];
}) {
  const [rows, setRows] = useState(initialCustomers);
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
        email: form.email,
        phone: form.phone,
        notes: form.notes,
      };

      if (editingId) {
        const result = await updateCustomer(editingId, payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingId
              ? {
                  ...row,
                  name: form.name.trim(),
                  email: form.email.trim() || null,
                  phone: form.phone.trim() || null,
                  notes: form.notes.trim() || null,
                }
              : row
          )
        );
      } else {
        const result = await createCustomer(payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRows((prev) => [
          {
            id: result.id,
            company_id: company.id,
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            notes: form.notes.trim() || null,
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

  const startEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
    });
  };

  const onDelete = async (customerId: string) => {
    if (!confirm("Delete this customer?")) return;
    const result = await deleteCustomer(customerId, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== customerId));
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Customers</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage customer records for your business.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit customer" : "Add customer"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Name"
            required
          />
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            type="email"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Email"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Phone"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Notes"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Saving..." : editingId ? "Update" : "Add customer"}
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No customers yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={companyCustomerPath(slug, row.id)}
                      className="text-violet-700 hover:text-violet-900"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{row.email ?? "—"}</div>
                    {row.phone ? (
                      <div className="text-xs text-slate-400">{row.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                        aria-label="Edit customer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete customer"
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
