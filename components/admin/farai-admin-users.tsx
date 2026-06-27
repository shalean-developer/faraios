"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, Search, Shield, Sparkles, UserCheck, Users } from "lucide-react";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import {
  riseInputClassName,
  riseSelectClassName,
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminPlatformUserRow, AdminPlatformUserStats } from "@/types/admin";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FaraiAdminUsers({
  users,
  stats,
}: {
  users: AdminPlatformUserRow[];
  stats: AdminPlatformUserStats;
}) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "member">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((user) => {
      if (roleFilter === "owner" && user.role !== "owner") return false;
      if (roleFilter === "member" && user.role === "owner") return false;
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.businessName.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.total,
      icon: Users,
      bg: "bg-indigo-50",
      color: "text-indigo-600",
      bar: "from-indigo-500 to-violet-500",
    },
    {
      label: "Active Users",
      value: stats.active,
      icon: UserCheck,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      bar: "from-emerald-400 to-teal-400",
    },
    {
      label: "Business Owners",
      value: stats.owners,
      icon: Shield,
      bg: "bg-violet-50",
      color: "text-violet-600",
      bar: "from-violet-400 to-purple-400",
    },
    {
      label: "New This Month",
      value: stats.newThisMonth,
      icon: Sparkles,
      bg: "bg-sky-50",
      color: "text-sky-600",
      bar: "from-sky-400 to-blue-400",
    },
  ];

  return (
    <AdminPageShell
      title="Users"
      description="Platform users across all businesses"
      actions={
        <>
          <div className="relative w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className={`${riseInputClassName} w-full py-2 pl-9 pr-4`}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className={riseSelectClassName}
          >
            <option value="all">All roles</option>
            <option value="owner">Owners</option>
            <option value="member">Members</option>
          </select>
          <AdminActivityBellLink />
        </>
      }
    >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="space-y-5"
        >
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={riseStatCardClassName}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-200" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-500">{stat.label}</p>
                  <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${stat.bar} opacity-50`} />
                </div>
              );
            })}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className={riseTableClassName}
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">All users</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {filtered.length} user{filtered.length === 1 ? "" : "s"} found
              </p>
            </div>
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className={riseTableHeadRowClassName}>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500">
                              <span className="text-xs font-bold text-white">
                                {getInitials(user.name)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-gray-900">
                                {user.name}
                              </p>
                              <p className="truncate text-[10px] text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-700">{user.businessName}</td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-bold capitalize text-gray-600">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold ${
                              user.status === "Active"
                                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                : "border-gray-100 bg-gray-50 text-gray-500"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{user.joined}</td>
                        <td className="px-4 py-3.5 text-right">
                          {user.businessId ? (
                            <Link
                              href={`${ADMIN_BUSINESSES_PATH}/${user.businessId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              View business
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
    </AdminPageShell>
  );
}
