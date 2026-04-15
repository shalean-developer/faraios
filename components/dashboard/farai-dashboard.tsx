"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Globe,
  Server,
  Link2,
  Settings,
  Bell,
  Search,
  Zap,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Calendar,
  ExternalLink,
  Menu,
  X,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Clock4,
  Sparkles,
  User,
} from "lucide-react";

import type {
  CompanyBuildStatus,
  DashboardSnapshot,
} from "@/types/dashboard";

type ActiveNav =
  | "dashboard"
  | "projects"
  | "hosting"
  | "domains"
  | "settings";

const NAV_ITEMS: {
  key: ActiveNav;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "My Projects", icon: Briefcase },
  { key: "hosting", label: "Hosting", icon: Server },
  { key: "domains", label: "Domains", icon: Link2 },
  { key: "settings", label: "Settings", icon: Settings },
];

const statusConfig: Record<
  CompanyBuildStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <Clock4 className="h-3 w-3" />,
  },
  "in-progress": {
    label: "In Progress",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <CircleDot className="h-3 w-3" />,
  },
  review: {
    label: "In Review",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export type FaraiDashboardProps = {
  snapshot: DashboardSnapshot;
};

export function FaraiDashboard({ snapshot }: FaraiDashboardProps) {
  const [activeNav, setActiveNav] = useState<ActiveNav>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const projects = snapshot.authenticated ? snapshot.projects : [];

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.businessName.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.industry.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [projects, searchValue]
  );

  if (!snapshot.authenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sign in to FaraiOS</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your client dashboard shows workspaces you belong to. Sign in with
            your account, then open the dashboard again.
          </p>
          <Link
            href="/get-started"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            Get started
          </Link>
        </div>
      </div>
    );
  }

  const { user, subscription, metrics, future, launchHref } = snapshot;

  const planBadgeShort =
    subscription.planName === "Not assigned"
      ? "No plan yet"
      : `${subscription.planName} Plan`;

  const userProfile = {
    name: user.displayName,
    email: user.email ?? "",
    plan: planBadgeShort,
    initials: initialsFromName(user.displayName),
  };

  const kpiData = [
    {
      id: "total",
      label: "Total Projects",
      value: String(metrics.totalProjects),
      trend: metrics.totalProjects > 0 ? "Live data" : "—",
      trendUp: true,
      trendLabel: "from your workspaces",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      icon: Briefcase,
      accent: "from-violet-500 to-indigo-500",
    },
    {
      id: "active",
      label: "Active Sites",
      value: String(metrics.activeSites),
      trend: metrics.activeSites > 0 ? "Published" : "—",
      trendUp: metrics.activeSites > 0,
      trendLabel: "launched",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      icon: Globe,
      accent: "from-emerald-400 to-teal-500",
    },
    {
      id: "subscription",
      label: "Subscription",
      value:
        subscription.planName === "Not assigned"
          ? "—"
          : subscription.planName,
      trend:
        subscription.planName === "Not assigned"
          ? "—"
          : subscription.status === "active"
            ? "Active"
            : subscription.status,
      trendUp:
        subscription.planName !== "Not assigned" &&
        subscription.status === "active",
      trendLabel: subscription.renewsLabel ?? "Renewal date TBD",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      icon: Sparkles,
      accent: "from-amber-400 to-orange-400",
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-white shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            FaraiOS
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Main Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveNav(item.key);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-violet-600" : "text-gray-400"}`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-4">
          <div className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm">
              <span className="text-xs font-bold text-white">
                {userProfile.initials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {userProfile.name}
              </p>
              <p className="truncate text-xs text-gray-400">{userProfile.plan}</p>
            </div>
            <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white/90 px-4 shadow-sm backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 transition-colors hover:text-gray-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="max-w-sm flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search projects..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 transition-all placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-violet-500" />
            </button>

            <Link
              href={launchHref ?? "/get-started"}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {launchHref ? "Open site" : "Start a project"}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-6xl space-y-8"
          >
            <motion.div
              variants={fadeUp}
              className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
            >
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  {getGreeting()},{" "}
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    {user.displayName.trim().split(/\s+/)[0] ?? "there"}
                  </span>{" "}
                  👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">{formatToday()}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-violet-500" />
                <span className="text-xs font-semibold text-violet-700">
                  {subscription.planName === "Not assigned"
                    ? "No plan — create a workspace"
                    : `${subscription.planName} plan active`}
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {kpiData.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.iconBg}`}
                      >
                        <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold ${
                          kpi.trendUp ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {kpi.trendUp ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        <span>{kpi.trend}</span>
                      </div>
                    </div>
                    <p className="mb-1 text-3xl font-extrabold text-gray-900">
                      {kpi.value}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {kpi.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {kpi.trendLabel}
                    </p>
                    <div
                      className={`mt-4 h-1 rounded-full bg-gradient-to-r ${kpi.accent} opacity-60`}
                    />
                  </div>
                );
              })}
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Recent Projects
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Workspaces linked to your account via memberships
                  </p>
                </div>
                <Link
                  href="/dashboard/projects"
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-600 transition-all hover:bg-violet-100 hover:text-violet-800"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  View All
                </Link>
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/60">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Industry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProjects.map((project) => {
                      const st = statusConfig[project.status];
                      return (
                        <tr
                          key={project.id}
                          className="group transition-colors hover:bg-gray-50/70"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                                <Briefcase className="h-4 w-4 text-violet-600" />
                              </div>
                              <span className="text-sm font-semibold text-gray-900">
                                {project.businessName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-500">
                              {project.industry}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.color}`}
                            >
                              {st.icon}
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {project.createdDate}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/${encodeURIComponent(project.slug)}/dashboard`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            >
                              View
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredProjects.length === 0 && (
                  <div className="py-12 text-center">
                    <Globe className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      {projects.length === 0
                        ? "No projects yet — create a company from Get Started."
                        : "No projects match your search"}
                    </p>
                  </div>
                )}
              </div>

              <div className="divide-y divide-gray-50 sm:hidden">
                {filteredProjects.map((project) => {
                  const st = statusConfig[project.status];
                  return (
                    <div
                      key={project.id}
                      className="px-5 py-4 transition-colors hover:bg-gray-50/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
                            <Briefcase className="h-4 w-4 text-violet-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {project.businessName}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {project.industry}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.color}`}
                        >
                          {st.icon}
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.createdDate}
                        </div>
                        <Link
                          href={`/${encodeURIComponent(project.slug)}/dashboard`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition-colors hover:text-violet-800"
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">
                      {projects.length === 0
                        ? "No projects yet."
                        : "No projects match your search"}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "New Project",
                    icon: Briefcase,
                    color: "text-violet-600",
                    bg: "border-violet-100 bg-violet-50 hover:bg-violet-100",
                    href: "/get-started",
                  },
                  {
                    label: "Manage Hosting",
                    icon: Server,
                    color: "text-blue-600",
                    bg: "border-blue-100 bg-blue-50 hover:bg-blue-100",
                    href: "/dashboard/projects",
                  },
                  {
                    label: "Domains",
                    icon: Link2,
                    color: "text-emerald-600",
                    bg: "border-emerald-100 bg-emerald-50 hover:bg-emerald-100",
                    href: "/dashboard/projects",
                  },
                  {
                    label: "Settings",
                    icon: Settings,
                    color: "text-gray-600",
                    bg: "border-gray-200 bg-gray-50 hover:bg-gray-100",
                    href: "/dashboard/projects",
                  },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${action.bg}`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Icon className={`h-4 w-4 ${action.color}`} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {action.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 shadow-xl shadow-violet-200 sm:p-8"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="text-white">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-4 w-4 opacity-80" />
                    <span className="text-sm font-semibold opacity-80">
                      Account
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold">{userProfile.name}</h3>
                  <p className="mt-0.5 text-sm text-violet-200">
                    {userProfile.email}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                      {userProfile.plan}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-violet-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      {subscription.status === "active" ? "Active" : subscription.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-violet-200/90">
                    Bookings across your workspaces:{" "}
                    <span className="font-semibold text-white">
                      {future.bookings.totalCount}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-2xl font-extrabold text-white">
                        {metrics.totalProjects}
                      </p>
                      <p className="text-xs text-violet-200">Projects</p>
                    </div>
                    <div className="h-10 w-px bg-white/20" />
                    <div>
                      <p className="text-2xl font-extrabold text-white">
                        {metrics.activeSites}
                      </p>
                      <p className="text-xs text-violet-200">Live Sites</p>
                    </div>
                    <div className="h-10 w-px bg-white/20" />
                    <div>
                      <p className="text-2xl font-extrabold text-white">
                        {metrics.bandwidthLabel}
                      </p>
                      <p className="text-xs text-violet-200">Bandwidth</p>
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-violet-700 shadow-md transition-colors hover:bg-violet-50"
                  >
                    Manage Plan
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
