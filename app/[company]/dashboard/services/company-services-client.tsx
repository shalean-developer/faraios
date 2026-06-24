"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import {
  createServicesFromTemplates,
  deleteCompanyService,
  duplicateCompanyService,
  importIndustryServiceTemplatesAction,
  importServices,
  moveCompanyService,
} from "@/app/actions/company-services";
import { ServiceFormPopover } from "@/components/company/service-form-popover";
import { Button } from "@/components/ui/button";
import type { ServiceTemplate } from "@/lib/company-services/constants";
import { downloadServicesCsv } from "@/lib/company-services/csv";
import { formatDuration } from "@/lib/calendar/schedule";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  getModuleForCompany,
  getServiceTemplates,
} from "@/lib/industry-modules/loader";
import {
  companyServicePath,
  publicBookPath,
} from "@/lib/paths/company";
import type { CompanyServiceStats } from "@/lib/services/company-services";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";

type StatusFilter = "all" | "active" | "inactive";

export function CompanyServicesClient({
  slug,
  company,
  services: initialServices,
  stats,
  canReorder,
}: {
  slug: string;
  company: CompanyWithIndustry;
  services: CompanyService[];
  stats: Record<string, CompanyServiceStats>;
  canReorder: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialServices);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<CompanyService | null>(null);
  const [template, setTemplate] = useState<ServiceTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [templatePending, setTemplatePending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const industryModule = useMemo(() => getModuleForCompany(company), [company]);
  const serviceTemplates = useMemo(
    () => getServiceTemplates(company.industries?.slug ?? null),
    [company.industries?.slug]
  );
  const quickStart = industryModule.dashboardExtensions?.servicesQuickStart;

  useEffect(() => {
    setRows(initialServices);
  }, [initialServices]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      if (row.category?.trim()) values.add(row.category.trim());
    }
    return Array.from(values).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter === "active" && !row.active) return false;
      if (statusFilter === "inactive" && row.active) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (!query) return true;

      return (
        row.name.toLowerCase().includes(query) ||
        (row.category ?? "").toLowerCase().includes(query) ||
        (row.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, categoryFilter, statusFilter]);

  const openCreateForm = () => {
    setEditingService(null);
    setTemplate(null);
    setShowServiceForm(true);
  };

  const openEditForm = (service: CompanyService) => {
    setEditingService(service);
    setTemplate(null);
    setShowServiceForm(true);
  };

  const openTemplateForm = (item: ServiceTemplate) => {
    setEditingService(null);
    setTemplate(item);
    setShowServiceForm(true);
  };

  const closeServiceForm = () => {
    setShowServiceForm(false);
    setEditingService(null);
    setTemplate(null);
  };

  const onDelete = async (service: CompanyService) => {
    const linked = stats[service.id]?.bookingCount ?? 0;
    const message =
      linked > 0
        ? `This service has ${linked} linked booking${linked === 1 ? "" : "s"} and cannot be deleted. Deactivate it instead?`
        : "Delete this service?";

    if (!confirm(message)) return;

    if (linked > 0) {
      setError(
        `Deactivate "${service.name}" from the edit form instead of deleting.`
      );
      return;
    }

    const result = await deleteCompanyService(service.id, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== service.id));
  };

  const onDuplicate = async (serviceId: string) => {
    const result = await duplicateCompanyService(serviceId, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const onMove = async (serviceId: string, direction: "up" | "down") => {
    const result = await moveCompanyService(serviceId, company.id, slug, direction);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const onExport = () => {
    downloadServicesCsv(rows, `${slug}-services.csv`);
  };

  const onImportClick = () => {
    setImportMessage(null);
    setError(null);
    fileInputRef.current?.click();
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportPending(true);
    setImportMessage(null);
    setError(null);

    try {
      const csvText = await file.text();
      const result = await importServices(company.id, slug, csvText);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const parts = [`Imported ${result.imported} service${result.imported === 1 ? "" : "s"}.`];
      if (result.skipped > 0) {
        parts.push(`Skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.`);
      }
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} failed.`);
        setError(result.errors.slice(0, 3).join(" "));
      }
      setImportMessage(parts.join(" "));

      router.refresh();
    } finally {
      setImportPending(false);
    }
  };

  const addAllTemplates = async () => {
    setTemplatePending(true);
    setError(null);

    try {
      const result = await importIndustryServiceTemplatesAction(
        company.id,
        slug,
        company.industries?.slug ?? null
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setImportMessage(
        `Added ${result.created} starter service${result.created === 1 ? "" : "s"}` +
          (result.skipped > 0
            ? ` (${result.skipped} skipped — already in catalog).`
            : ".")
      );
      router.refresh();
    } finally {
      setTemplatePending(false);
    }
  };

  const addTemplateFromPreset = async (item: ServiceTemplate) => {
    setTemplatePending(true);
    setError(null);

    try {
      const result = await createServicesFromTemplates(company.id, slug, [
        {
          companyId: company.id,
          companySlug: slug,
          name: item.name,
          category: item.category,
          description: item.description,
          price: item.price,
          durationMinutes: item.durationMinutes,
          active: true,
          addons: item.addons.map((addon) => ({
            id: crypto.randomUUID(),
            name: addon.name,
            price: addon.price,
          })),
        },
      ]);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.created === 0) {
        setImportMessage(`"${item.name}" is already in your catalog.`);
      } else {
        setImportMessage(`Added "${item.name}".`);
      }
      router.refresh();
    } finally {
      setTemplatePending(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Services</h1>
          <p className="mt-2 text-sm text-slate-500">
            Define your catalog, pricing, duration, and add-ons for bookings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onExport}
            disabled={rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onImportClick}
            disabled={importPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {importPending ? "Importing..." : "Import CSV"}
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-xl"
            variant={showServiceForm && !editingService ? "outline" : "default"}
            aria-expanded={showServiceForm && !editingService}
            aria-haspopup="dialog"
            onClick={() =>
              showServiceForm && !editingService
                ? closeServiceForm()
                : openCreateForm()
            }
          >
            Add service
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
            placeholder="Search services..."
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
        <a
          href={publicBookPath(company.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          Preview booking page
          <ExternalLink className="ml-1.5 h-4 w-4" />
        </a>
      </div>

      <ServiceFormPopover
        open={showServiceForm}
        onClose={closeServiceForm}
        slug={slug}
        companyId={company.id}
        service={editingService}
        template={template}
      />

      {importMessage ? (
        <p className="mb-3 text-sm font-medium text-emerald-700">{importMessage}</p>
      ) : null}

      {error ? (
        <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Service</th>
              <th className="hidden px-4 py-3 md:table-cell">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="hidden px-4 py-3 lg:table-cell">Duration</th>
              <th className="hidden px-4 py-3 xl:table-cell">Bookings</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10">
                  <div className="mx-auto max-w-lg text-center">
                    <p className="text-slate-500">
                      {rows.length === 0
                        ? "No services yet."
                        : "No services match your filters."}
                    </p>
                    {rows.length === 0 ? (
                      <div className="mt-6 space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                          {quickStart?.title ?? "Quick start with industry templates"}
                        </p>
                        {quickStart?.description ? (
                          <p className="text-xs text-slate-500">{quickStart.description}</p>
                        ) : null}
                        <div className="flex flex-wrap justify-center gap-2">
                          {serviceTemplates.map((item) => (
                            <Button
                              key={item.name}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={templatePending}
                              onClick={() => addTemplateFromPreset(item)}
                            >
                              {item.name}
                            </Button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          className="rounded-xl"
                          disabled={templatePending || serviceTemplates.length === 0}
                          onClick={addAllTemplates}
                        >
                          {templatePending ? "Importing..." : "Import all industry templates"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const fullIndex = rows.findIndex((item) => item.id === row.id);
                const rowStats = stats[row.id];
                const addonCount = Array.isArray(row.addons) ? row.addons.length : 0;

                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={companyServicePath(slug, row.id)}
                        className="font-medium text-violet-700 hover:text-violet-900"
                      >
                        {row.name}
                      </Link>
                      {row.description ? (
                        <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
                      ) : null}
                      {addonCount > 0 ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {addonCount} add-on{addonCount === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {row.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatRevenue(row.base_price_cents)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                      {formatDuration(row.duration_minutes) ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 xl:table-cell">
                      <div>{rowStats?.bookingCount ?? 0} bookings</div>
                      {(rowStats?.revenueCents ?? 0) > 0 ? (
                        <div className="text-xs text-slate-400">
                          {formatRevenue(rowStats?.revenueCents ?? 0)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          row.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canReorder ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onMove(row.id, "up")}
                              disabled={fullIndex <= 0}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMove(row.id, "down")}
                              disabled={fullIndex < 0 || fullIndex >= rows.length - 1}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onDuplicate(row.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                          aria-label="Duplicate service"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                          aria-label="Edit service"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
