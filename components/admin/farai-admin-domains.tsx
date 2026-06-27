"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, Pencil, Search, Shield, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  adminDeleteWebsiteDomainAction,
  adminUpdateWebsiteDomainAction,
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
import type { AdminDomainRow, AdminDomainsData } from "@/types/admin";

type DomainFormState = {
  domain: string;
  domainType: "primary" | "subdomain" | "preview";
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "not_started" | "pending" | "active" | "failed";
};

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
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<AdminDomainRow | null>(null);
  const [form, setForm] = useState<DomainFormState | null>(null);

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

  function startEdit(domain: AdminDomainRow) {
    setEditingDomain(domain);
    setForm(formFromDomain(domain));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingDomain(null);
    setForm(null);
  }

  function saveEdit() {
    if (!editingDomain || !form) return;
    startTransition(() => {
      void (async () => {
        const result = await adminUpdateWebsiteDomainAction({
          domainId: editingDomain.id,
          domain: form.domain,
          domainType: form.domainType,
          verificationStatus: form.verificationStatus,
          sslStatus: form.sslStatus,
        });
        if (result.ok) {
          setMessage("Domain updated.");
          cancelEdit();
          router.refresh();
        } else {
          setMessage(result.error ?? "Failed to update domain.");
        }
      })();
    });
  }

  function deleteDomain(domain: AdminDomainRow) {
    if (!window.confirm(`Delete ${domain.domain}? This cannot be undone.`)) return;
    startTransition(() => {
      void (async () => {
        const result = await adminDeleteWebsiteDomainAction(domain.id);
        if (result.ok) {
          if (editingDomain?.id === domain.id) cancelEdit();
          setMessage("Domain deleted.");
          router.refresh();
        } else {
          setMessage(result.error ?? "Failed to delete domain.");
        }
      })();
    });
  }

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

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {editingDomain && form ? (
        <section className={`${riseStatCardClassName} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Edit domain</h2>
            <p className="text-xs text-slate-500">{editingDomain.businessName}</p>
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
            <Button disabled={pending} onClick={saveEdit}>
              Save changes
            </Button>
            <Button variant="outline" disabled={pending} onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <div className={riseTableClassName}>
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">No domains found</div>
        ) : (
          <table className="w-full min-w-[860px]">
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
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => startEdit(domain)}
                        aria-label={`Edit ${domain.domain}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => deleteDomain(domain)}
                        aria-label={`Delete ${domain.domain}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
    </AdminPageShell>
  );
}
