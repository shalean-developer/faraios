"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Users2,
  Zap,
  Search,
  Bell,
  CheckCircle2,
  ChevronRight,
  Calendar,
  BookOpen,
  Briefcase,
  Shield,
  BarChart3,
  Settings,
  Layers,
  Sparkles,
  Tag,
  Globe,
  Edit3,
  MessageSquare,
  Clock4,
  FileText,
  Send,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { adminUpdateCompanyStatus } from "@/app/actions/admin";
import type { AdminProjectDetails } from "@/types/admin";

type ActiveNav = "dashboard" | "pipeline" | "team" | "clients";

type NoteEntry = {
  id: string;
  author: string;
  role: string;
  time: string;
  text: string;
};

const statusConfig = {
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
} as const;

const NAV_ITEMS: {
  key: ActiveNav;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "pipeline", label: "Project Pipeline", href: "/admin", icon: GitBranch },
  { key: "team", label: "Team", href: "/admin/team", icon: Users },
  { key: "clients", label: "Clients", href: "/admin/clients", icon: Users2 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FaraiAdminProjectDetails({
  project,
  adminEmail,
  adminDisplayName,
}: {
  project: AdminProjectDetails;
  adminEmail: string | null;
  adminDisplayName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteInput, setNoteInput] = useState("");

  const handleMarkComplete = () => {
    startTransition(async () => {
      const res = await adminUpdateCompanyStatus(project.id, "completed");
      if (res.ok) {
        router.refresh();
      }
    });
  };

  const handlePostNote = () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      {
        id: `n-${Date.now()}`,
        author: adminDisplayName,
        role: "Admin",
        time: `${formatDate(new Date().toISOString())} · Just now`,
        text: trimmed,
      },
      ...prev,
    ]);
    setNoteInput("");
  };

  const progressWidth = `${Math.max(0, Math.min(100, project.projectProgress))}%`;
  const st = statusConfig[project.status];
  const timeline = useMemo(
    () =>
      project.activities.map((activity) => ({
        id: activity.id,
        date: formatDate(activity.createdAtIso),
        text: activity.title,
        dotColor:
          activity.stage === "completed"
            ? "bg-emerald-500"
            : activity.stage === "in_review"
              ? "bg-purple-500"
              : activity.stage === "in_progress"
                ? "bg-blue-500"
                : "bg-amber-400",
      })),
    [project.activities]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans" style={{ background: "#f8f7ff" }}>
      <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-slate-900">
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-bold leading-tight tracking-tight text-white">FaraiOS</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">Admin</span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "pipeline";
            return (
              <Link key={item.key} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-5">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">System</p>
            <Link href="/admin/analytics" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800 hover:text-white">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <span>Analytics</span>
            </Link>
            <Link href="/admin/settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800 hover:text-white">
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
              <p className="truncate text-xs font-semibold text-white">{adminDisplayName}</p>
              <p className="truncate text-[10px] text-slate-400">{adminEmail ?? "—"}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="min-w-0 flex-1">
            <nav className="mb-0.5 flex items-center gap-1.5 text-xs text-gray-400">
              <Link href="/admin" className="flex items-center gap-1 font-medium transition-colors hover:text-indigo-600">
                <ArrowLeft className="h-3 w-3" />
                <span>Project Pipeline</span>
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-semibold text-gray-600">{project.businessName}</span>
            </nav>
            <h1 className="text-base font-extrabold leading-tight tracking-tight text-gray-900">Project Details</h1>
          </div>
          <div className="w-64 flex-shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search projects or clients..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <Link href="/admin/activity" className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {isPending ? <p className="mb-2 text-xs font-medium text-indigo-600">Syncing…</p> : null}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-7xl space-y-5">
            <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold leading-tight text-white">{project.businessName}</h2>
                    <p className="mt-1 text-xs font-medium text-indigo-100">{project.user.name} · {project.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:bg-white/20 hover:text-white">
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Project</span>
                    </button>
                    {project.status !== "completed" ? (
                      <button type="button" onClick={handleMarkComplete} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Complete</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-5 gap-5">
              <div className="col-span-3 space-y-5">
                <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Project Info</h3>
                  </div>
                  <div className="divide-y divide-gray-50 px-6 py-2">
                    {[
                      { label: "Business Name", value: project.businessName, icon: <Briefcase className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Client", value: `${project.user.name} · ${project.user.email}`, icon: <Users className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Industry", value: project.industry, icon: <Globe className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Package", value: project.plan ?? "Not set", icon: <Sparkles className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Deadline", value: formatDate(project.deadline), icon: <Calendar className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Developer", value: project.assignedDeveloper ?? "Unassigned", icon: <Shield className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Design Style", value: project.designStyle ?? "Not provided", icon: <Tag className="h-3.5 w-3.5 text-gray-400" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {row.icon}
                          <span className="font-medium">{row.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Pages & Features</h3>
                  </div>
                  <div className="space-y-5 px-6 py-5">
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Pages</p>
                      <div className="flex flex-wrap gap-2">
                        {project.pages.length === 0 ? <span className="text-xs text-gray-400">No pages provided</span> : project.pages.map((page) => <span key={page} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700"><Layers className="h-3 w-3" />{page}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {project.features.length === 0 ? <span className="text-xs text-gray-400">No features provided</span> : project.features.map((feature) => <span key={feature} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700"><BookOpen className="h-3.5 w-3.5" />{feature}</span>)}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Notes & Comments</h3>
                    <span className="ml-auto rounded-lg border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-400">{notes.length}</span>
                  </div>
                  <div className="max-h-64 space-y-4 overflow-y-auto px-6 py-4">
                    {notes.length === 0 ? <p className="text-xs text-gray-400">No notes yet.</p> : notes.map((note) => (
                      <div key={note.id} className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500">
                          <span className="text-[9px] font-bold text-white">{note.author[0]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">{note.author}</span>
                            <span className="rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">{note.role}</span>
                            <span className="ml-auto text-[10px] text-gray-400">{note.time}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-600">{note.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                    <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a note or comment..." rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="mt-2.5 flex justify-end">
                      <button type="button" onClick={handlePostNote} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5">
                        <Send className="h-3.5 w-3.5" />
                        Post Note
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="col-span-2 space-y-5">
                <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                      <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Progress</h3>
                    <span className="ml-auto text-xs font-extrabold text-indigo-600">{project.projectProgress}%</span>
                  </div>
                  <div className="space-y-5 px-5 py-5">
                    <div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <motion.div initial={{ width: 0 }} animate={{ width: progressWidth }} transition={{ duration: 1, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                      <Clock4 className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Activity</h3>
                  </div>
                  <div className="px-5 py-4">
                    {timeline.length === 0 ? <p className="text-xs text-gray-400">No activity yet.</p> : <div className="space-y-0">{timeline.map((entry, idx) => <div key={entry.id} className="flex gap-3"><div className="flex flex-col items-center"><div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${entry.dotColor}`} />{idx < timeline.length - 1 ? <div className="my-1 w-px flex-1 bg-gray-100" style={{ minHeight: "28px" }} /> : null}</div><div className="min-w-0 flex-1 pb-4"><span className="mb-0.5 inline-block text-[10px] font-bold uppercase tracking-wide text-gray-400">{entry.date}</span><p className="text-xs leading-relaxed text-gray-600">{entry.text}</p></div></div>)}</div>}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-lg shadow-indigo-200">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-200" />
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">Quick Actions</p>
                  </div>
                  <p className="mb-4 text-sm font-semibold text-white">Generate client report or send update email.</p>
                  <div className="space-y-2">
                    <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/25">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Generate Report</span>
                    </button>
                    <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50">
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Update to Client</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
