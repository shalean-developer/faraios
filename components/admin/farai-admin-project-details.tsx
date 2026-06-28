"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  Users,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Calendar,
  BookOpen,
  Briefcase,
  Shield,
  Layers,
  Sparkles,
  Tag,
  Globe,
  MessageSquare,
  Clock4,
  FileText,
  Send,
  ArrowLeft,
  ExternalLink,
  X,
  Users2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  adminAddProjectNote,
  adminUpdateAssignedDeveloper,
  adminUpdateCompanyStatus,
  adminUpdateMarketplaceListing,
} from "@/app/actions/admin";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import { ADMIN_DEVELOPER_OPTIONS } from "@/lib/constants/admin-developers";
import {
  MARKETPLACE_LISTING_REQUIRES_PUBLISH,
  MARKETPLACE_LISTING_REQUIRES_WEBSITE,
} from "@/lib/marketplace/listing-eligibility";
import { agencyWorkspaceHref } from "@/lib/platform/agency-workspace";
import { companyWebsiteBuilderPath } from "@/lib/paths/company";
import type { AdminPipelineStatus, AdminProjectDetails } from "@/types/admin";

type NoteEntry = {
  id: string;
  author: string;
  role: string;
  time: string;
  text: string;
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

function noteFromServer(note: AdminProjectDetails["notes"][number]): NoteEntry {
  return {
    id: note.id,
    author: note.authorName,
    role: "Admin",
    time: formatDate(note.createdAtIso),
    text: note.body,
  };
}

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

const STATUS_OPTIONS: { value: AdminPipelineStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

function isValidClientEmail(email: string): boolean {
  return email.trim().length > 0 && email !== "—" && email.includes("@");
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function FaraiAdminProjectDetails({
  project,
  adminDisplayName,
  embedded = false,
}: {
  project: AdminProjectDetails;
  adminDisplayName: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<AdminPipelineStatus>(project.status);
  const [assignedDeveloper, setAssignedDeveloper] = useState<string | null>(
    project.assignedDeveloper
  );
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openDevDropdown, setOpenDevDropdown] = useState(false);
  const [notes, setNotes] = useState<NoteEntry[]>(() => project.notes.map(noteFromServer));
  const [noteInput, setNoteInput] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [listedInMarketplace, setListedInMarketplace] = useState(
    project.listedInMarketplace
  );
  const [marketplaceSummary, setMarketplaceSummary] = useState(
    project.marketplaceSummary ?? ""
  );
  const [marketplaceLocation, setMarketplaceLocation] = useState(
    project.marketplaceLocation ?? ""
  );
  const [marketplaceFeatured, setMarketplaceFeatured] = useState(
    project.marketplaceFeatured
  );
  const [marketplaceMessage, setMarketplaceMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setListedInMarketplace(project.listedInMarketplace);
      setMarketplaceSummary(project.marketplaceSummary ?? "");
      setMarketplaceLocation(project.marketplaceLocation ?? "");
      setMarketplaceFeatured(project.marketplaceFeatured);
      setStatus(project.status);
      setAssignedDeveloper(project.assignedDeveloper);
      setNotes(project.notes.map(noteFromServer));
    });
  }, [
    project.listedInMarketplace,
    project.marketplaceSummary,
    project.marketplaceLocation,
    project.marketplaceFeatured,
    project.status,
    project.assignedDeveloper,
    project.notes,
  ]);

  const clientHref = `/admin/clients?companyId=${project.id}`;
  const workspaceBuilderHref = agencyWorkspaceHref(
    project.slug,
    companyWebsiteBuilderPath(project.slug)
  );
  const websiteHref = workspaceBuilderHref;
  const websiteLabel = project.websiteId ? "Open Website Builder" : "Create in Workspace";
  const adminCreateWebsiteHref = `/admin/websites/create?companyId=${project.id}`;
  const adminPublishWebsiteHref = project.websiteId
    ? `/admin/websites/${project.websiteId}/edit`
    : null;
  const canListOnMarketplace = Boolean(project.websiteId && project.websitePublished);
  const marketplaceBlockReason = !project.websiteId
    ? MARKETPLACE_LISTING_REQUIRES_WEBSITE
    : !project.websitePublished
      ? MARKETPLACE_LISTING_REQUIRES_PUBLISH
      : null;
  const marketplaceHref = `/marketplace/${project.slug}`;
  const clientEmailValid = isValidClientEmail(project.user.email);

  const updateStatus = (nextStatus: AdminPipelineStatus) => {
    setMutationError(null);
    setOpenStatusDropdown(false);
    startTransition(async () => {
      const res = await adminUpdateCompanyStatus(project.id, nextStatus);
      if (!res.ok) {
        setMutationError(res.error ?? "Could not update project status.");
        return;
      }
      setStatus(nextStatus);
      router.refresh();
    });
  };

  const assignDeveloper = (developerName: string | null) => {
    setMutationError(null);
    setOpenDevDropdown(false);
    startTransition(async () => {
      const res = await adminUpdateAssignedDeveloper(project.id, developerName);
      if (!res.ok) {
        setMutationError(res.error ?? "Could not update assigned developer.");
        return;
      }
      setAssignedDeveloper(developerName);
      router.refresh();
    });
  };

  const saveMarketplaceListing = () => {
    setMarketplaceMessage(null);
    setMutationError(null);
    if (listedInMarketplace && marketplaceBlockReason) {
      setMutationError(marketplaceBlockReason);
      return;
    }
    startTransition(async () => {
      const res = await adminUpdateMarketplaceListing(project.id, {
        listed: listedInMarketplace,
        summary: marketplaceSummary,
        location: marketplaceLocation,
        featured: marketplaceFeatured,
      });
      if (!res.ok) {
        setMutationError(res.error ?? "Could not update marketplace listing.");
        return;
      }
      setMarketplaceMessage(
        listedInMarketplace
          ? "Business listed on the FaraiOS marketplace."
          : "Business removed from the marketplace."
      );
      router.refresh();
    });
  };

  const handleMarkComplete = () => {
    updateStatus("completed");
  };

  const handlePostNote = () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    setNoteError(null);
    startTransition(async () => {
      const res = await adminAddProjectNote(project.id, trimmed);
      if (!res.ok) {
        setNoteError(res.error ?? "Could not save note.");
        return;
      }
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
      router.refresh();
    });
  };

  const handleGenerateReport = () => {
    window.print();
  };

  const handleSendUpdate = () => {
    if (!clientEmailValid) {
      setMutationError("Add a valid client email before sending an update.");
      return;
    }
    const subject = encodeURIComponent(`Project update: ${project.businessName}`);
    const body = encodeURIComponent(
      `Hi ${project.user.name},\n\nHere is an update on your ${project.businessName} project.\n\nStatus: ${st.label}\nProgress: ${project.projectProgress}%\n\nBest,\n${adminDisplayName}`
    );
    window.location.href = `mailto:${project.user.email}?subject=${subject}&body=${body}`;
  };

  const progressWidth = `${Math.max(0, Math.min(100, project.projectProgress))}%`;
  const st = statusConfig[status];
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

  const pageBody = (
    <>
          {isPending ? <p className="mb-2 text-xs font-medium text-[#5a8dee]">Syncing…</p> : null}
          {mutationError ? (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {mutationError}
            </p>
          ) : null}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5">
            <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold leading-tight text-white">{project.businessName}</h2>
                    <p className="mt-1 text-xs font-medium text-indigo-100">{project.user.name} · {project.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setOpenStatusDropdown((open) => !open)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20 disabled:opacity-60`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                      <AnimatePresence>
                        {openStatusDropdown ? (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                          >
                            {STATUS_OPTIONS.map((opt) => {
                              const cfg = statusConfig[opt.value];
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateStatus(opt.value)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                    status === opt.value
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                    <Link
                      href={clientHref}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 hover:text-white"
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      <span>Manage Client</span>
                    </Link>
                    <Link
                      href={websiteHref}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 hover:text-white"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{websiteLabel}</span>
                    </Link>
                    {status !== "completed" ? (
                      <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50 disabled:opacity-60"
                      >
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
                      {
                        label: "Client",
                        value: clientEmailValid ? (
                          <a href={`mailto:${project.user.email}`} className="text-indigo-600 hover:text-indigo-800">
                            {project.user.name} · {project.user.email}
                          </a>
                        ) : (
                          `${project.user.name} · ${project.user.email}`
                        ),
                        icon: <Users className="h-3.5 w-3.5 text-gray-400" />,
                      },
                      { label: "Industry", value: project.industry, icon: <Globe className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Package", value: project.plan ?? "Not set", icon: <Sparkles className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Deadline", value: formatDate(project.deadline), icon: <Calendar className="h-3.5 w-3.5 text-gray-400" /> },
                      {
                        label: "Developer",
                        value: (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenDevDropdown((open) => !open)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
                            >
                              {assignedDeveloper ?? "Unassigned"}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>
                            <AnimatePresence>
                              {openDevDropdown ? (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                                >
                                  {ADMIN_DEVELOPER_OPTIONS.map((dev) => (
                                    <button
                                      key={dev.id}
                                      type="button"
                                      onClick={() => assignDeveloper(dev.name)}
                                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 ${
                                        assignedDeveloper === dev.name
                                          ? "bg-indigo-50 text-indigo-700"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {dev.name}
                                    </button>
                                  ))}
                                  {assignedDeveloper ? (
                                    <button
                                      type="button"
                                      onClick={() => assignDeveloper(null)}
                                      className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Unassign
                                    </button>
                                  ) : null}
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        ),
                        icon: <Shield className="h-3.5 w-3.5 text-gray-400" />,
                      },
                      { label: "Design Style", value: project.designStyle ?? "Not provided", icon: <Tag className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Phone", value: project.contactPhone ?? "Not provided", icon: <Users className="h-3.5 w-3.5 text-gray-400" /> },
                      { label: "Project Goal", value: project.projectGoal ?? "Not provided", icon: <BookOpen className="h-3.5 w-3.5 text-gray-400" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {row.icon}
                          <span className="font-medium">{row.label}</span>
                        </div>
                        <span className="text-right text-xs font-semibold text-gray-800">{row.value}</span>
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
                    {noteError ? <p className="mt-2 text-xs font-medium text-red-600">{noteError}</p> : null}
                    <div className="mt-2.5 flex justify-end">
                      <button type="button" onClick={handlePostNote} disabled={isPending || !noteInput.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60">
                        <Send className="h-3.5 w-3.5" />
                        {isPending ? "Saving…" : "Post Note"}
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

                <motion.div
                  id="marketplace"
                  variants={fadeUp}
                  className="scroll-mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">Marketplace</h3>
                    {listedInMarketplace && canListOnMarketplace ? (
                      <span className="ml-auto rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Listed
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    <p className="text-xs leading-relaxed text-gray-500">
                      List this business on the public FaraiOS marketplace so consumers can discover and book services.
                      {marketplaceBlockReason ? (
                        <span className="mt-1 block font-medium text-amber-600">
                          {marketplaceBlockReason}
                        </span>
                      ) : null}
                    </p>

                    {marketplaceBlockReason ? (
                      <div className="flex flex-wrap gap-2">
                        {!project.websiteId ? (
                          <Link
                            href={adminCreateWebsiteHref}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Create website
                          </Link>
                        ) : adminPublishWebsiteHref ? (
                          <Link
                            href={adminPublishWebsiteHref}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Publish website
                          </Link>
                        ) : null}
                        <Link
                          href={websiteHref}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {websiteLabel}
                        </Link>
                      </div>
                    ) : null}

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3">
                      <span className="text-xs font-semibold text-gray-700">List on marketplace</span>
                      <input
                        type="checkbox"
                        checked={listedInMarketplace}
                        onChange={(e) => setListedInMarketplace(e.target.checked)}
                        disabled={isPending || (!canListOnMarketplace && !listedInMarketplace)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>

                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Summary
                      </label>
                      <textarea
                        value={marketplaceSummary}
                        onChange={(e) => setMarketplaceSummary(e.target.value)}
                        rows={3}
                        placeholder="Short description for the marketplace card…"
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Location
                      </label>
                      <input
                        value={marketplaceLocation}
                        onChange={(e) => setMarketplaceLocation(e.target.value)}
                        placeholder="e.g. Cape Town, South Africa"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3">
                      <span className="text-xs font-semibold text-gray-700">Featured listing</span>
                      <input
                        type="checkbox"
                        checked={marketplaceFeatured}
                        onChange={(e) => setMarketplaceFeatured(e.target.checked)}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>

                    {marketplaceMessage ? (
                      <p className="text-xs font-medium text-emerald-600">{marketplaceMessage}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveMarketplaceListing}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {isPending ? "Saving…" : "Save listing"}
                      </button>
                      {listedInMarketplace && canListOnMarketplace ? (
                        <Link
                          href={marketplaceHref}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-indigo-200 hover:text-indigo-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View listing
                        </Link>
                      ) : null}
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
                  <p className="mb-4 text-sm font-semibold text-white">Manage this project, website, and client communication.</p>
                  <div className="space-y-2">
                    <Link
                      href={clientHref}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/25"
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      <span>Manage Client</span>
                    </Link>
                    <Link
                      href={websiteHref}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/25"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{websiteLabel}</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                    <button type="button" onClick={handleGenerateReport} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/25">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Generate Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendUpdate}
                      disabled={!clientEmailValid}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{clientEmailValid ? "Send Update to Client" : "Client email required"}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
    </>
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onClick={() => {
        setOpenStatusDropdown(false);
        setOpenDevDropdown(false);
      }}
    >
      {embedded ? (
        pageBody
      ) : (
        <AdminPageShell title="Project Details" actions={<AdminActivityBellLink />}>
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Link
              href={`${ADMIN_BUSINESSES_PATH}/${project.companyId}?tab=pipeline`}
              className="flex items-center gap-1 font-medium transition-colors hover:text-[#5a8dee]"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Business</span>
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-slate-600">{project.businessName}</span>
          </nav>
          {pageBody}
        </AdminPageShell>
      )}
    </div>
  );
}
