"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, Loader2, Pencil, RefreshCw, Search, Shield, ShieldAlert, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  adminDeleteWebsiteDomainAction,
  adminUpdateWebsiteDomainAction,
  adminVerifyWebsiteDomainAction,
} from "@/app/actions/admin";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import {
  riseInputClassName,
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { AdminDomainRow, AdminDomainsData } from "@/types/admin";

type DomainFormState = {
  domain: string;
  domainType: "primary" | "subdomain" | "preview";
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "not_started" | "pending" | "active" | "failed";
};

type MessageState = {
  tone: "success" | "error";
  text: string;
} | null;

function formFromDomain(domain: AdminDomainRow): DomainFormState {
  return {
    domain: domain.domain,
    domainType: domain.domainType as DomainFormState["domainType"],
    verificationStatus: domain.verificationStatus as DomainFormState["verificationStatus"],
    sslStatus: domain.sslStatus as DomainFormState["sslStatus"],
  };
}

export function FaraiAdminDomains({ data }: { data: AdminDomainsData }) {
  const router = useRouter();
  const editDialogRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [editingDomain, setEditingDomain] = useState<AdminDomainRow | null>(null);
  const [form, setForm] = useState<DomainFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data.domains;
    return data.domains.filter(
      (d) =>
        d.domain.toLowerCase().includes(q) ||
        d.businessName.toLowerCase().includes(q)
    );
  }, [data.domains, search]);

  const stats = [
    { label: "Total Domains", value: data.total },
    { label: "Verified", value: data.verified },
    { label: "Pending", value: data.pending },
    { label: "SSL Active", value: data.sslActive },
    { label: "SSL Failed", value: data.sslFailed },
  ];

  useEffect(() => {
    if (!editingDomain) return;
    editDialogRef.current?.focus();
  }, [editingDomain]);

  useEffect(() => {
    if (!editingDomain) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelEdit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingDomain]);

  function startEdit(domain: AdminDomainRow) {
    setEditingDomain(domain);
    setForm(formFromDomain(domain));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingDomain(null);
    setForm(null);
  }

  async function saveEdit() {
    if (!editingDomain || !form || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await adminUpdateWebsiteDomainAction({
        domainId: editingDomain.id,
        domain: form.domain,
        domainType: form.domainType,
        verificationStatus: form.verificationStatus,
        sslStatus: form.sslStatus,
      });
      if (result.ok) {
        setMessage({ tone: "success", text: "Domain updated." });
        cancelEdit();
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Failed to update domain." });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteDomain(domain: AdminDomainRow) {
    if (deletingId) return;
    if (!window.confirm(`Delete ${domain.domain}? This cannot be undone.`)) return;
    setDeletingId(domain.id);
    setMessage(null);
    try {
      const result = await adminDeleteWebsiteDomainAction(domain.id);
      if (result.ok) {
        if (editingDomain?.id === domain.id) cancelEdit();
        setMessage({ tone: "success", text: "Domain deleted." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Failed to delete domain." });
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function verifyDomain(domain: AdminDomainRow) {
    if (verifyingId) return;
    setVerifyingId(domain.id);
    setMessage(null);
    try {
      const result = await adminVerifyWebsiteDomainAction(domain.id);
      if (result.ok) {
        setMessage({
          tone: "success",
          text: result.verified
            ? `${domain.domain} verified.`
            : `${domain.domain} is still pending — check DNS records.`,
        });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Verification failed." });
      }
    } finally {
      setVerifyingId(null);
    }
  }

  const rowBusy = Boolean(saving || deletingId || verifyingId);

  return (
    <AdminPageShell
      title="Domains"
      description="Domain verification and SSL across the platform"
      actions={
        <>
          <div className="relative w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domains..."
              className={`${riseInputClassName} w-full py-2 pl-9 pr-4`}
            />
          </div>
          <AdminActivityBellLink />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={riseStatCardClassName}>
            <div className="mb-2 flex items-center justify-between">
              <Globe2 className="h-4 w-4 text-[#5a8dee]" />
              <Sparkles className="h-3 w-3 text-slate-200" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium",
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className={cn(riseTableClassName, "overflow-x-auto")}>
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">No domains found</div>
        ) : (
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className={riseTableHeadRowClassName}>
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Verification
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  SSL
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Last checked
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((domain) => (
                <tr key={domain.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-3.5 text-xs font-semibold text-slate-900">{domain.domain}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`${ADMIN_BUSINESSES_PATH}/${domain.companyId}`}
                      className="text-xs text-[#5a8dee] hover:text-[#4a6fd8]"
                    >
                      {domain.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-xs capitalize text-slate-600">{domain.domainType}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold capitalize ${
                        domain.verificationStatus === "verified"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : domain.verificationStatus === "failed"
                            ? "border-red-100 bg-red-50 text-red-700"
                            : "border-amber-100 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {domain.verificationStatus === "verified" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {domain.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs capitalize text-slate-600">
                    {domain.sslStatus.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{domain.lastChecked ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rowBusy}
                        onClick={() => void verifyDomain(domain)}
                        aria-label={`Verify ${domain.domain}`}
                      >
                        {verifyingId === domain.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rowBusy}
                        onClick={() => startEdit(domain)}
                        aria-label={`Edit ${domain.domain}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rowBusy}
                        onClick={() => void deleteDomain(domain)}
                        aria-label={`Delete ${domain.domain}`}
                      >
                        {deletingId === domain.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingDomain && form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close edit domain dialog"
            onClick={cancelEdit}
          />
          <div
            ref={editDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-domain-title"
            tabIndex={-1}
            className={cn(riseStatCardClassName, "relative z-10 w-full max-w-lg space-y-4 shadow-xl")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-domain-title" className="text-sm font-bold text-slate-900">
                  Edit domain
                </h2>
                <p className="mt-1 text-xs text-slate-500">{editingDomain.businessName}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
                onClick={cancelEdit}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-600">
              Domain
              <input
                className={`${riseInputClassName} mt-1 w-full`}
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-semibold text-slate-600">
                Type
                <select
                  className={`${riseInputClassName} mt-1 w-full`}
                  value={form.domainType}
                  onChange={(e) =>
                    setForm({ ...form, domainType: e.target.value as DomainFormState["domainType"] })
                  }
                >
                  <option value="primary">Primary</option>
                  <option value="subdomain">Subdomain</option>
                  <option value="preview">Preview</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Verification
                <select
                  className={`${riseInputClassName} mt-1 w-full`}
                  value={form.verificationStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      verificationStatus: e.target.value as DomainFormState["verificationStatus"],
                    })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                SSL
                <select
                  className={`${riseInputClassName} mt-1 w-full`}
                  value={form.sslStatus}
                  onChange={(e) =>
                    setForm({ ...form, sslStatus: e.target.value as DomainFormState["sslStatus"] })
                  }
                >
                  <option value="not_started">Not started</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
