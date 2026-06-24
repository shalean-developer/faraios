"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import {
  Users2,
  Plus,
  Search,
  X,
  Phone,
  MapPin,
  Calendar,
  Hash,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
} from "lucide-react";

import type { AdminClient, AdminClientStats, AdminPlatformStatus } from "@/types/admin";
import { clientProjectStatusStyles } from "@/lib/constants/admin-status";
import {
  adminActivateBusiness,
  adminCreateClientCompany,
  adminSaveClientNote,
  adminSuspendBusiness,
  adminUpdateClientCompany,
} from "@/app/actions/admin";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";

type ModalTab = "contact" | "projects" | "notes";
type ClientFormState = {
  businessName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  location: string;
};

const emptyForm: ClientFormState = {
  businessName: "",
  contactName: "",
  contactEmail: "",
  phone: "",
  location: "",
};

function clientToForm(client: AdminClient): ClientFormState {
  return {
    businessName: client.business,
    contactName: client.name,
    contactEmail: client.email,
    phone: client.phone ?? "",
    location: client.location ?? "",
  };
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PLATFORM_STATUS_STYLES: Record<AdminPlatformStatus, string> = {
  Active: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Trial: "border-sky-100 bg-sky-50 text-sky-700",
  Suspended: "border-red-100 bg-red-50 text-red-700",
  Inactive: "border-gray-100 bg-gray-50 text-gray-500",
};

export function FaraiClientManagement({
  clients,
  stats,
}: {
  clients: AdminClient[];
  stats: AdminClientStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const companyIdFromUrl = searchParams.get("companyId");
  const [manualSelectedClient, setManualSelectedClient] = useState<AdminClient | null>(null);
  const selectedClient =
    manualSelectedClient ??
    (companyIdFromUrl
      ? clients.find((entry) => entry.id === companyIdFromUrl) ?? null
      : null);
  const [activeTab, setActiveTab] = useState<ModalTab>("contact");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClient, setEditClient] = useState<AdminClient | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [noteInput, setNoteInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [platformActionError, setPlatformActionError] = useState<string | null>(null);

  const filteredClients = useMemo(
    () =>
      clients.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.business.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      }),
    [clients, searchQuery]
  );

  const statsCards = [
    {
      label: "Total Businesses",
      value: String(stats.total),
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      iconColor: "text-indigo-500",
      bar: "from-indigo-500 to-violet-500",
    },
    {
      label: "Active",
      value: String(stats.active),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      bar: "from-emerald-400 to-teal-400",
    },
    {
      label: "Inactive",
      value: String(stats.inactive),
      color: "text-gray-500",
      bg: "bg-gray-50",
      iconColor: "text-gray-400",
      bar: "from-gray-300 to-gray-400",
    },
    {
      label: "New This Month",
      value: String(stats.newThisMonth),
      color: "text-blue-600",
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
      bar: "from-blue-400 to-indigo-400",
    },
  ];

  const openAddModal = () => {
    setForm(emptyForm);
    setFormError(null);
    setFormSuccess(null);
    setShowAddModal(true);
  };

  const openEditModal = (client: AdminClient) => {
    setEditClient(client);
    setForm(clientToForm(client));
    setFormError(null);
    setFormSuccess(null);
  };

  const closeFormModal = () => {
    setShowAddModal(false);
    setEditClient(null);
    setForm(emptyForm);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSaveClient = () => {
    setFormError(null);
    setFormSuccess(null);
    startTransition(async () => {
      const payload = {
        businessName: form.businessName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
      };

      const res = editClient
        ? await adminUpdateClientCompany(editClient.id, payload)
        : await adminCreateClientCompany(payload);

      if (!res.ok) {
        setFormError(res.error ?? "Could not save client.");
        return;
      }

      setFormSuccess(editClient ? "Client updated." : "Client created.");
      router.refresh();
      if (!editClient) {
        setTimeout(() => closeFormModal(), 800);
      } else {
        setEditClient(null);
        setManualSelectedClient(null);
      }
    });
  };

  const handleSaveNote = () => {
    if (!selectedClient) return;
    const trimmed = noteInput.trim();
    if (!trimmed) {
      setNoteError("Note cannot be empty.");
      return;
    }
    setNoteError(null);
    setNoteSuccess(null);
    startTransition(async () => {
      const res = await adminSaveClientNote(selectedClient.id, trimmed);
      if (!res.ok) {
        setNoteError(res.error ?? "Could not save note.");
        return;
      }
      setNoteInput("");
      setNoteSuccess("Note saved.");
      router.refresh();
    });
  };

  const handlePlatformAction = (client: AdminClient, action: "suspend" | "activate") => {
    setPlatformActionError(null);
    startTransition(async () => {
      const result =
        action === "suspend"
          ? await adminSuspendBusiness(client.id)
          : await adminActivateBusiness(client.id);
      if (!result.ok) {
        setPlatformActionError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const inputClass =
    "w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-700 placeholder:text-gray-300 outline-none transition-all focus:border-indigo-300 focus:bg-white";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">
            Businesses
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">Manage all platform businesses</p>
        </div>

        <div className="relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:border-indigo-300 focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={openAddModal}
          disabled={isPending}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Business</span>
        </button>

        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
          {isPending ? (
            <p className="mb-2 text-xs font-medium text-indigo-600">Syncing…</p>
          ) : null}
          {platformActionError ? (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {platformActionError}
            </p>
          ) : null}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-7xl space-y-5">
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
              {statsCards.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Users2 className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-200" />
                  </div>
                  <p className={`mb-0.5 text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                  <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${stat.bar} opacity-50`} />
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">All Businesses</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {filteredClients.length} business
                    {filteredClients.length !== 1 ? "es" : ""} found
                  </p>
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Users2 className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-semibold text-gray-700">
                    {clients.length === 0 ? "No clients yet" : "No clients found"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {clients.length === 0
                      ? "Add a client manually or wait for onboarding submissions."
                      : "Try a different search term."}
                  </p>
                  {clients.length === 0 ? (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add first client
                    </button>
                  ) : null}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Industry</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Plan</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Joined</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 transition-colors duration-100 hover:bg-gray-50">
                      <td className="px-6 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-gray-900">{client.business}</p>
                          <p className="truncate text-[10px] text-gray-400">{client.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-700">{client.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-600">{client.industry}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-700">{client.plan}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold ${PLATFORM_STATUS_STYLES[client.platformStatus]}`}>
                          {client.platformStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-500">{client.joined}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`${ADMIN_BUSINESSES_PATH}/${client.id}`} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </Link>
                          <span className="text-gray-200">|</span>
                          <button type="button" onClick={() => openEditModal(client)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-700">
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          {client.platformStatus === "Suspended" ? (
                            <>
                              <span className="text-gray-200">|</span>
                              <button type="button" disabled={isPending} onClick={() => handlePlatformAction(client, "activate")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-60">
                                Activate
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-200">|</span>
                              <button type="button" disabled={isPending} onClick={() => handlePlatformAction(client, "suspend")} className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60">
                                Suspend
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </motion.div>
        </main>

      <AnimatePresence>
        {selectedClient ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="backdrop" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setManualSelectedClient(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div key="modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pb-5 pt-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-lg backdrop-blur-sm">
                      <span className="text-lg font-extrabold text-white">{getInitials(selectedClient.name)}</span>
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold leading-tight text-white">{selectedClient.name}</h2>
                      <p className="mt-0.5 text-xs text-indigo-200">{selectedClient.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setManualSelectedClient(null)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-1 rounded-xl bg-white/10 p-1">
                  {(["contact", "projects", "notes"] as ModalTab[]).map((tab) => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all duration-150 ${activeTab === tab ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white"}`}>
                      {tab === "contact" ? "Contact Info" : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto px-6 py-5">
                {activeTab === "contact" ? (
                  <div className="space-y-3">
                    {[
                      { label: "Phone", value: selectedClient.phone ?? "Not provided", icon: <Phone className="h-3.5 w-3.5 text-indigo-500" />, bg: "bg-indigo-50" },
                      { label: "Location", value: selectedClient.location ?? "Not provided", icon: <MapPin className="h-3.5 w-3.5 text-violet-500" />, bg: "bg-violet-50" },
                      { label: "Joined Date", value: selectedClient.joined, icon: <Calendar className="h-3.5 w-3.5 text-blue-500" />, bg: "bg-blue-50" },
                      { label: "Client ID", value: selectedClient.id.toUpperCase(), icon: <Hash className="h-3.5 w-3.5 text-amber-500" />, bg: "bg-amber-50" },
                      { label: "Business", value: selectedClient.business, icon: <Users2 className="h-3.5 w-3.5 text-emerald-500" />, bg: "bg-emerald-50" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${row.bg}`}>{row.icon}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{row.label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-gray-800">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeTab === "projects" ? (
                  <div className="space-y-3">
                    {selectedClient.projects.map((proj) => {
                      const style = clientProjectStatusStyles[proj.status];
                      return (
                        <Link
                          key={proj.id}
                          href={`${ADMIN_BUSINESSES_PATH}/${selectedClient.id}?tab=pipeline`}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800">{proj.name}</p>
                            <p className="mt-0.5 text-[10px] font-medium text-indigo-600">View in pipeline</p>
                          </div>
                          <span className={`ml-3 inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${style.bg} ${style.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span>{proj.status}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}

                {activeTab === "notes" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="mb-2 flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        <p className="text-xs font-medium leading-relaxed text-amber-800">{selectedClient.note ?? "No client notes yet."}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-500">{selectedClient.noteTime ?? "—"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Add a note</label>
                      <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write something about this client..." rows={3} className="w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-700 placeholder:text-gray-300 outline-none transition-all focus:border-indigo-300 focus:bg-white" />
                      {noteError ? <p className="mt-2 text-xs font-medium text-red-600">{noteError}</p> : null}
                      {noteSuccess ? <p className="mt-2 text-xs font-medium text-emerald-600">{noteSuccess}</p> : null}
                      <button type="button" onClick={handleSaveNote} disabled={isPending} className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isPending ? "Saving…" : "Save Note"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/50 px-6 py-4">
                <button type="button" onClick={() => setManualSelectedClient(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">Close</button>
                <button type="button" onClick={() => { if (selectedClient) openEditModal(selectedClient); }} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
                  <Pencil className="h-3 w-3" />
                  <span>Edit Client</span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal || editClient ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="form-backdrop" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closeFormModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div key="form-modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20">
              <div className="border-b border-gray-50 px-6 py-5">
                <h2 className="text-base font-extrabold text-gray-900">{editClient ? "Edit Client" : "Add Client"}</h2>
                <p className="mt-0.5 text-xs text-gray-400">{editClient ? "Update client contact details." : "Create a new client company record."}</p>
              </div>
              <div className="space-y-3 px-6 py-5">
                {[
                  { key: "businessName" as const, label: "Business Name" },
                  { key: "contactName" as const, label: "Contact Name" },
                  { key: "contactEmail" as const, label: "Contact Email", type: "email" },
                  { key: "phone" as const, label: "Phone" },
                  { key: "location" as const, label: "Location" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">{field.label}</label>
                    <input
                      type={field.type ?? "text"}
                      value={form[field.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                ))}
                {formError ? <p className="text-xs font-medium text-red-600">{formError}</p> : null}
                {formSuccess ? <p className="text-xs font-medium text-emerald-600">{formSuccess}</p> : null}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-50 bg-gray-50/50 px-6 py-4">
                <button type="button" onClick={closeFormModal} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">Cancel</button>
                <button type="button" onClick={handleSaveClient} disabled={isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60">
                  {isPending ? "Saving…" : editClient ? "Save Changes" : "Create Client"}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
