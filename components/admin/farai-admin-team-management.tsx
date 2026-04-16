"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Users2,
  Zap,
  Search,
  Bell,
  ChevronDown,
  X,
  Shield,
  BarChart3,
  Settings,
  Sparkles,
  UserCheck,
  UserPlus,
  Mail,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock4,
  Layers,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { adminAssignProjectsToMember } from "@/app/actions/admin";
import type { AdminAssignableProject, AdminTeamMember } from "@/types/admin";

type ActiveNav = "dashboard" | "pipeline" | "team" | "clients";

const NAV_ITEMS: {
  key: ActiveNav;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { key: "pipeline", label: "Project Pipeline", icon: GitBranch, href: "/admin" },
  { key: "team", label: "Team", icon: Users, href: "/admin/team" },
  { key: "clients", label: "Clients", icon: Users2, href: "/admin/clients" },
];

const rolePalette = [
  {
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  {
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  {
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
];

const projectStatusConfig = {
  pending: {
    dot: "bg-amber-400",
    label: "Pending",
  },
  in_progress: {
    dot: "bg-blue-500",
    label: "In Progress",
  },
  in_review: {
    dot: "bg-purple-500",
    label: "In Review",
  },
  completed: {
    dot: "bg-emerald-500",
    label: "Completed",
  },
} as const;

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 10,
    transition: {
      duration: 0.18,
    },
  },
};

type FaraiAdminTeamManagementProps = {
  members: AdminTeamMember[];
  assignableProjects: AdminAssignableProject[];
  adminEmail: string | null;
  adminDisplayName: string;
};

export function FaraiAdminTeamManagement({
  members,
  assignableProjects,
  adminEmail,
  adminDisplayName,
}: FaraiAdminTeamManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeNav] = useState<ActiveNav>("team");
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Offline">(
    "All"
  );
  const [openRoleDropdown, setOpenRoleDropdown] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminTeamMember | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const roleOptions = useMemo(
    () => ["All", ...Array.from(new Set(members.map((m) => m.role))).sort()],
    [members]
  );

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const q = searchValue.toLowerCase();
        const matchSearch =
          m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
        const matchRole = roleFilter === "All" || m.role === roleFilter;
        const matchStatus = statusFilter === "All" || m.status === statusFilter;
        return matchSearch && matchRole && matchStatus;
      }),
    [members, roleFilter, searchValue, statusFilter]
  );

  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status === "Active").length;
  const availableCount = members.filter((m) => m.availability === "Available").length;
  const busyCount = members.filter((m) => m.availability === "Busy").length;

  const roleBadgeClass = (role: string) => {
    let hash = 0;
    for (let i = 0; i < role.length; i += 1) {
      hash = (hash << 5) - hash + role.charCodeAt(i);
      hash |= 0;
    }
    return rolePalette[Math.abs(hash) % rolePalette.length]!;
  };

  const handleAssignOpen = (member: AdminTeamMember) => {
    setAssignTarget(member);
    setSelectedProjects([]);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleConfirmAssignment = () => {
    if (!assignTarget || selectedProjects.length === 0) return;
    startTransition(async () => {
      await adminAssignProjectsToMember(assignTarget.name, selectedProjects);
      setAssignTarget(null);
      setSelectedProjects([]);
      router.refresh();
    });
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden font-sans"
      style={{ background: "#f8f7ff" }}
      onClick={() => {
        setOpenRoleDropdown(false);
        setOpenStatusDropdown(false);
      }}
    >
      <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-slate-900">
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-bold leading-tight tracking-tight text-white">
              FaraiOS
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-200" />
                )}
              </Link>
            );
          })}

          <div className="pt-5">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              System
            </p>
            <Link
              href="/admin/analytics"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800 hover:text-white"
            >
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800 hover:text-white"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {adminDisplayName}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {adminEmail ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">
              Team Management
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              Manage your team members, roles, and project assignments
            </p>
          </div>

          <div className="w-64 flex-shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-xs text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <Link
            href="/admin/activity"
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {isPending && (
            <p className="mb-2 text-xs font-medium text-indigo-600">Syncing…</p>
          )}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-7xl space-y-5"
          >
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "Total Team",
                  value: totalCount,
                  icon: Users,
                  iconBg: "bg-indigo-50",
                  iconColor: "text-indigo-600",
                  accent: "from-indigo-500 to-violet-500",
                },
                {
                  label: "Active",
                  value: activeCount,
                  icon: CheckCircle2,
                  iconBg: "bg-emerald-50",
                  iconColor: "text-emerald-600",
                  accent: "from-emerald-400 to-teal-400",
                },
                {
                  label: "Available",
                  value: availableCount,
                  icon: UserCheck,
                  iconBg: "bg-teal-50",
                  iconColor: "text-teal-600",
                  accent: "from-teal-400 to-cyan-400",
                },
                {
                  label: "Workload",
                  value: busyCount,
                  icon: Clock4,
                  iconBg: "bg-violet-50",
                  iconColor: "text-violet-600",
                  accent: "from-violet-400 to-purple-400",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}
                      >
                        <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                      </div>
                      <Sparkles className="h-3.5 w-3.5 text-gray-200" />
                    </div>
                    <p className="mb-0.5 text-2xl font-extrabold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-gray-500">
                      {stat.label}
                    </p>
                    <div
                      className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${stat.accent} opacity-50`}
                    />
                  </div>
                );
              })}
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Team Members</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {filtered.length} of {totalCount} members
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenRoleDropdown((p) => !p);
                        setOpenStatusDropdown(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100"
                    >
                      <Filter className="h-3.5 w-3.5 text-gray-400" />
                      <span>{roleFilter === "All" ? "All Roles" : roleFilter}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                    <AnimatePresence>
                      {openRoleDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                        >
                          {roleOptions.map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setRoleFilter(role);
                                setOpenRoleDropdown(false);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                roleFilter === role
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-gray-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${role === "All" ? "bg-gray-400" : "bg-indigo-500"}`}
                              />
                              {role}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenStatusDropdown((p) => !p);
                        setOpenRoleDropdown(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100"
                    >
                      <Circle className="h-3.5 w-3.5 text-gray-400" />
                      <span>{statusFilter === "All" ? "All Status" : statusFilter}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                    <AnimatePresence>
                      {openStatusDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full z-30 mt-1.5 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                        >
                          {(["All", "Active", "Offline"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setStatusFilter(s);
                                setOpenStatusDropdown(false);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                statusFilter === s
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-gray-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  s === "Active"
                                    ? "bg-emerald-500"
                                    : s === "Offline"
                                      ? "bg-gray-400"
                                      : "bg-indigo-400"
                                }`}
                              />
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-300"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Member
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Member
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Projects
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Availability
                      </th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((member) => {
                      const roleClass = roleBadgeClass(member.role);
                      return (
                        <tr
                          key={member.id}
                          className="group transition-colors hover:bg-indigo-50/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${member.avatarGradient} shadow-sm`}
                              >
                                <span className="text-xs font-bold text-white">
                                  {member.avatarInitials}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {member.name}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0 text-gray-300" />
                                  <p className="truncate text-xs text-gray-400">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${roleClass.bg} ${roleClass.color} ${roleClass.border}`}
                            >
                              {member.role}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 flex-shrink-0 rounded-full ${member.status === "Active" ? "bg-emerald-500" : "bg-gray-300"}`}
                              />
                              <span
                                className={`text-xs font-semibold ${member.status === "Active" ? "text-emerald-700" : "text-gray-400"}`}
                              >
                                {member.status}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-gray-300" />
                              <span className="text-xs font-semibold text-gray-700">
                                {member.projectCount}
                              </span>
                              <span className="text-xs text-gray-400">active</span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                member.availability === "Available"
                                  ? "border-teal-200 bg-teal-50 text-teal-700"
                                  : "border-orange-200 bg-orange-50 text-orange-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                  member.availability === "Available"
                                    ? "bg-teal-400"
                                    : "bg-orange-400"
                                }`}
                              />
                              {member.availability}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleAssignOpen(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800"
                            >
                              <Layers className="h-3.5 w-3.5" />
                              Assign Project
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div className="py-14 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      No team members match your filters
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {assignTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setAssignTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />

            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-200" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                        Assign Project
                      </span>
                    </div>
                    <h2 className="text-lg font-extrabold leading-tight text-white">
                      {assignTarget.name}
                    </h2>
                    <p className="mt-1 text-xs text-indigo-200">
                      {assignTarget.role} · {assignTarget.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignTarget(null)}
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Select Projects to Assign
                </p>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {assignableProjects.map((project) => {
                    const isSelected = selectedProjects.includes(project.id);
                    const pStatus = projectStatusConfig[project.status];
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => toggleProjectSelection(project.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                          isSelected
                            ? "border-indigo-200 bg-indigo-50 shadow-sm"
                            : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${isSelected ? "text-indigo-700" : "text-gray-800"}`}
                          >
                            {project.name}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {project.client}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${pStatus.dot}`} />
                          <span className="text-[10px] font-semibold text-gray-500">
                            {pStatus.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedProjects.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {selectedProjects.length} project
                      {selectedProjects.length > 1 ? "s" : ""} selected
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={selectedProjects.length === 0 || isPending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
