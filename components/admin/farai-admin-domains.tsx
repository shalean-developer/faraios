"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Globe2, Search, Shield, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
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
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Domains</h1>
          <p className="mt-0.5 text-xs text-gray-400">Domain verification and SSL across the platform</p>
        </div>
        <div className="relative w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domains..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-xs outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <Globe2 className="h-4 w-4 text-indigo-500" />
                  <Sparkles className="h-3 w-3 text-gray-200" />
                </div>
                <p className="text-xl font-extrabold text-gray-900">{stat.value}</p>
                <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">No domains found</div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Domain</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Verification</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">SSL</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Last checked</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((domain) => (
                    <tr key={domain.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-6 py-3.5 text-xs font-semibold text-gray-900">{domain.domain}</td>
                      <td className="px-4 py-3.5">
                        <Link href={`${ADMIN_BUSINESSES_PATH}/${domain.companyId}`} className="text-xs text-indigo-600 hover:text-indigo-800">
                          {domain.businessName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs capitalize text-gray-600">{domain.domainType}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold capitalize ${
                          domain.verificationStatus === "verified"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : domain.verificationStatus === "failed"
                              ? "border-red-100 bg-red-50 text-red-700"
                              : "border-amber-100 bg-amber-50 text-amber-700"
                        }`}>
                          {domain.verificationStatus === "verified" ? <Shield className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                          {domain.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs capitalize text-gray-600">{domain.sslStatus.replace("_", " ")}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{domain.lastChecked ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
