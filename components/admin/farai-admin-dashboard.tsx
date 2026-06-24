"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Search,
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
  Layers,
  ChevronRight,
  Sparkles,
  Users2,
} from "lucide-react";

import {
  adminUpdateAssignedDeveloper,
  adminUpdateCompanyStatus,
} from "@/app/actions/admin";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
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

export type FaraiAdminDashboardProps = {
  projects: AdminProject[];
  stats: AdminProjectStats;
  /** Full pipeline table on `/admin/pipeline`. */
  viewMode?: "pipeline";
};

export function FaraiAdminDashboard({
  projects,
  stats,
  viewMode = "pipeline",
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
  const [mutationError, setMutationError] = useState<string | null>(null);

  const isOverview = false;

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
    setMutationError(null);
    const res = await adminUpdateCompanyStatus(id, status);
    setOpenStatusDropdown(null);
    if (res.ok) {
      refresh();
      return;
    }
    setMutationError(res.error);
  };

  const assignDeveloper = async (id: string, dev: string | null) => {
    setMutationError(null);
    const res = await adminUpdateAssignedDeveloper(id, dev);
    setOpenDevDropdown(null);
    if (res.ok) {
      refresh();
      return;
    }
    setMutationError(res.error);
  };

  const totalCount = stats.total;
  const pendingCount = stats.pending;
  const inProgressCount = stats.inProgress;
  const inReviewCount = stats.inReview;
  const completedCount = stats.completed;

  const statCards = [
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
      label: "In Review",
      value: inReviewCount,
      icon: Eye,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      accent: "from-purple-400 to-violet-400",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      accent: "from-emerald-400 to-teal-400",
    },
  ];

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onClick={() => {
        setOpenStatusDropdown(null);
        setOpenDevDropdown(null);
      }}
    >
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">
              Build Pipeline
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              Manage all client website projects in one place
            </p>
          </div>

          <div className="flex w-40 shrink-0 items-center gap-2">
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

          <AdminActivityBellLink />
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {isPending && (
            <p className="mb-2 text-xs font-medium text-indigo-600">
              Syncing…
            </p>
          )}
          {mutationError ? (
            <p
              className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {mutationError}
            </p>
          ) : null}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-7xl space-y-5"
          >
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
            >
              {statCards.map((stat) => {
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
                              href={`${ADMIN_BUSINESSES_PATH}/${project.id}?tab=pipeline`}
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
  );
}
