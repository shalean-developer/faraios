"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Zap,
  Search,
  Bell,
  ChevronDown,
  X,
  Calendar,
  Globe,
  Briefcase,
  CheckCircle2,
  CircleDot,
  Clock4,
  Eye,
  UserCheck,
  UserPlus,
  Shield,
  Layers,
  CreditCard,
  BookOpen,
  BarChart3,
  Settings,
  ChevronRight,
  Tag,
  Sparkles,
  Users2,
} from "lucide-react";

import {
  adminUpdateAssignedDeveloper,
  adminUpdateCompanyStatus,
} from "@/app/actions/admin";
import { ADMIN_DEVELOPER_OPTIONS } from "@/lib/constants/admin-developers";
import type { AdminPipelineStatus, AdminProject, AdminProjectStats } from "@/types/admin";

const PAGE_SIZE = 10;

const statusConfig: Record<
  AdminPipelineStatus,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
  }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  in_review: {
    label: "In Review",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    dot: "bg-purple-500",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const STATUS_OPTIONS: { value: AdminPipelineStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

const NAV_ITEMS: {
  key: "dashboard" | "pipeline" | "team" | "clients";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { key: "pipeline", label: "Project Pipeline", icon: GitBranch, href: "/admin" },
  { key: "team", label: "Team", icon: Users, href: "/admin/team" },
  { key: "clients", label: "Clients", icon: Users2, href: "/admin/clients" },
];

const featureIconMap: Record<string, React.ReactNode> = {
  Booking: <Calendar className="h-3.5 w-3.5" />,
  Payments: <CreditCard className="h-3.5 w-3.5" />,
  Blog: <BookOpen className="h-3.5 w-3.5" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const slideOver = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.28 },
  },
};

export type FaraiAdminDashboardProps = {
  projects: AdminProject[];
  stats: AdminProjectStats;
  adminEmail: string | null;
  adminDisplayName: string;
  activeNav?: "dashboard" | "pipeline" | "team" | "clients";
};

export function FaraiAdminDashboard({
  projects,
  stats,
  adminEmail,
  adminDisplayName,
  activeNav = "pipeline",
}: FaraiAdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | AdminPipelineStatus
  >("all");
  const [page, setPage] = useState(1);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(
    null
  );
  const [openDevDropdown, setOpenDevDropdown] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () =>
      selectedId
        ? projects.find((p) => p.id === selectedId) ?? null
        : null,
    [projects, selectedId]
  );

  const filteredProjects = useMemo(() => {
    const q = searchValue.toLowerCase().trim();
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ? true : p.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        p.businessName.toLowerCase().includes(q) ||
        p.user.name.toLowerCase().includes(q) ||
        p.user.email.toLowerCase().includes(q)
      );
    });
  }, [projects, searchValue, statusFilter]);

  const totalFiltered = filteredProjects.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedProjects = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, safePage]);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const updateStatus = async (id: string, status: AdminPipelineStatus) => {
    const res = await adminUpdateCompanyStatus(id, status);
    setOpenStatusDropdown(null);
    if (res.ok) refresh();
  };

  const assignDeveloper = async (id: string, dev: string | null) => {
    const res = await adminUpdateAssignedDeveloper(id, dev);
    setOpenDevDropdown(null);
    if (res.ok) refresh();
  };

  const totalCount = stats.total;
  const pendingCount = stats.pending;
  const inProgressCount = stats.inProgress;
  const completedCount = stats.completed;

  return (
    <div
      className="flex h-screen w-full overflow-hidden font-sans"
      style={{ background: "#f8f7ff" }}
      onClick={() => {
        setOpenStatusDropdown(null);
        setOpenDevDropdown(null);
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
              Project Pipeline
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              Manage all client website projects in one place
            </p>
          </div>

          <div className="flex w-40 flex-shrink-0 items-center gap-2">
            <label htmlFor="admin-status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="admin-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-2 pr-2 text-xs text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-56 flex-shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search projects or clients..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <Link
            href="/admin/websites"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white transition-all hover:bg-indigo-700"
          >
            + Create Website
          </Link>

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
            <p className="mb-2 text-xs font-medium text-indigo-600">
              Syncing…
            </p>
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
                  label: "Total Projects",
                  value: totalCount,
                  icon: Layers,
                  iconBg: "bg-indigo-50",
                  iconColor: "text-indigo-600",
                  accent: "from-indigo-500 to-violet-500",
                },
                {
                  label: "Pending",
                  value: pendingCount,
                  icon: Clock4,
                  iconBg: "bg-amber-50",
                  iconColor: "text-amber-600",
                  accent: "from-amber-400 to-orange-400",
                },
                {
                  label: "In Progress",
                  value: inProgressCount,
                  icon: CircleDot,
                  iconBg: "bg-blue-50",
                  iconColor: "text-blue-600",
                  accent: "from-blue-400 to-indigo-400",
                },
                {
                  label: "Completed",
                  value: completedCount,
                  icon: CheckCircle2,
                  iconBg: "bg-emerald-50",
                  iconColor: "text-emerald-600",
                  accent: "from-emerald-400 to-teal-400",
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
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    All Projects
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {totalFiltered} of {totalCount} projects
                    {statusFilter !== "all" && ` · filtered`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Live Pipeline</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Business & Client
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Assigned Developer
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedProjects.map((project) => {
                      const st = statusConfig[project.status];
                      return (
                        <tr
                          key={project.id}
                          className="group transition-colors hover:bg-indigo-50/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                                <Briefcase className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {project.businessName}
                                </p>
                                <p className="truncate text-xs text-gray-400">
                                  {project.user.name} · {project.user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className="relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenStatusDropdown(
                                    openStatusDropdown === project.id
                                      ? null
                                      : project.id
                                  )
                                }
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-90 ${st.bg} ${st.color}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${st.dot}`}
                                />
                                {st.label}
                                <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />
                              </button>
                              <AnimatePresence>
                                {openStatusDropdown === project.id && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      y: -4,
                                      scale: 0.97,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      y: -4,
                                      scale: 0.97,
                                    }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                                  >
                                    {STATUS_OPTIONS.map((opt) => {
                                      const cfg = statusConfig[opt.value];
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() =>
                                            void updateStatus(
                                              project.id,
                                              opt.value
                                            )
                                          }
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                            project.status === opt.value
                                              ? "bg-indigo-50 text-indigo-700"
                                              : "text-gray-700"
                                          }`}
                                        >
                                          <span
                                            className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                                          />
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className="relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {project.assignedDeveloper ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDevDropdown(
                                      openDevDropdown === project.id
                                        ? null
                                        : project.id
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  {project.assignedDeveloper}
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDevDropdown(
                                      openDevDropdown === project.id
                                        ? null
                                        : project.id
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-100 hover:text-indigo-800"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Assign
                                </button>
                              )}
                              <AnimatePresence>
                                {openDevDropdown === project.id && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      y: -4,
                                      scale: 0.97,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      y: -4,
                                      scale: 0.97,
                                    }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                                  >
                                    {ADMIN_DEVELOPER_OPTIONS.map((dev) => (
                                      <button
                                        key={dev.id}
                                        type="button"
                                        onClick={() =>
                                          void assignDeveloper(
                                            project.id,
                                            dev.name
                                          )
                                        }
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                          project.assignedDeveloper === dev.name
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500">
                                          <span className="text-[8px] font-bold text-white">
                                            {dev.name[0]}
                                          </span>
                                        </div>
                                        {dev.name}
                                      </button>
                                    ))}
                                    {project.assignedDeveloper ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void assignDeveloper(
                                            project.id,
                                            null
                                          )
                                        }
                                        className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        Unassign
                                      </button>
                                    ) : null}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {project.createdDate}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/admin/pipeline/${project.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {paginatedProjects.length === 0 && (
                  <div className="py-14 text-center">
                    <Globe className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      No projects match your filters
                    </p>
                  </div>
                )}
              </div>

              {totalFiltered > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-gray-50 px-6 py-3 text-xs text-gray-500">
                  <span>
                    Page {safePage} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-200 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= pageCount}
                      onClick={() =>
                        setPage((p) => Math.min(pageCount, p + 1))
                      }
                      className="rounded-lg border border-gray-200 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {selectedProject && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="presentation"
            onClick={() => setSelectedId(null)}
          >
            <div className="flex-1 bg-black/20 backdrop-blur-sm" />
            <motion.aside
              variants={slideOver}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl"
            >
              <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-100 bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-indigo-200" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                      Project Details
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold leading-tight text-white">
                    {selectedProject.businessName}
                  </h2>
                  <p className="mt-1 text-xs text-indigo-200">
                    {selectedProject.user.name} · {selectedProject.user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusConfig[selectedProject.status].bg} ${statusConfig[selectedProject.status].color}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusConfig[selectedProject.status].dot}`}
                      />
                      {statusConfig[selectedProject.status].label}
                    </span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Developer
                    </p>
                    {selectedProject.assignedDeveloper ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500">
                          <span className="text-[8px] font-bold text-white">
                            {selectedProject.assignedDeveloper[0]}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {selectedProject.assignedDeveloper}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-gray-400">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 py-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">Industry</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">
                      {selectedProject.industry}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 py-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">Design Style</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">
                      {selectedProject.designStyle ?? "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 py-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">Created</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">
                      {selectedProject.createdDate}
                    </span>
                  </div>
                  <div className="border-b border-gray-100 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                      <Search className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">Competitor Analysis</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-gray-700">
                      {selectedProject.competitors ?? "Not provided"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Pages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.pages.length === 0 ? (
                      <span className="text-xs text-gray-400">
                        No pages on file yet
                      </span>
                    ) : (
                      selectedProject.pages.map((pageName) => (
                        <span
                          key={pageName}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                        >
                          <Layers className="h-3 w-3" />
                          {pageName}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.features.length === 0 ? (
                      <span className="text-xs text-gray-400">
                        No features on file yet
                      </span>
                    ) : (
                      selectedProject.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700"
                        >
                          {featureIconMap[feature] ?? (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {feature}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                <Link
                  href={`/${encodeURIComponent(selectedProject.slug)}/dashboard`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300"
                >
                  <Eye className="h-4 w-4" />
                  Open Full Project
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
