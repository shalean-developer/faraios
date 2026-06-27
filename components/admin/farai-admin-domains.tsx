"use client";

import Link from "next/link";
import { Globe2, Search, Shield, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import {
  riseInputClassName,
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminDomainsData } from "@/types/admin";

export function FaraiAdminDomains({ data }: { data: AdminDomainsData }) {
  const [search, setSearch] = useState("");

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

      <div className={riseTableClassName}>
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">No domains found</div>
        ) : (
          <table className="w-full min-w-[760px]">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageShell>
  );
}
