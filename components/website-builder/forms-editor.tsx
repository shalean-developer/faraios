"use client";

import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, GripVertical, Inbox, MessageSquare, Save, Settings2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateWebsiteContactFormAction } from "@/app/actions/website-builder";
import { PublicContactForm } from "@/components/website-builder/public-contact-form";
import { getContactFormSettings } from "@/lib/website-builder/forms";
import { companyWebsiteBuilderSectionPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BuilderWebsite, LandingPageContent, WebsiteServicePageRecord } from "@/types/website-builder";
import type { WebsiteContactFormSettings, WebsiteFormField } from "@/types/website-builder-forms";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

type Props = {
  slug: string;
  companyId: string;
  website: BuilderWebsite;
  landingContent: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
};

type EditorTab = "fields" | "content" | "inbox";

const FORM_AREAS: { key: EditorTab; label: string; icon: typeof Settings2 }[] = [
  { key: "fields", label: "Fields", icon: Settings2 },
  { key: "content", label: "Content", icon: MessageSquare },
  { key: "inbox", label: "Inbox", icon: Inbox },
];

function SortableFieldRow({
  field,
  onChange,
}: {
  field: WebsiteFormField;
  onChange: (field: WebsiteFormField) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("rounded-lg border border-slate-200 bg-white p-3", isDragging && "opacity-80")}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="font-medium text-slate-700">Label</span>
            <input
              className={inputClass}
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
            />
          </label>
          <label className="text-xs">
            <span className="font-medium text-slate-700">Placeholder</span>
            <input
              className={inputClass}
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={field.visible}
                onChange={(e) => onChange({ ...field, visible: e.target.checked })}
              />
              Visible
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
              />
              Required
            </label>
          </div>
        </div>
      </div>
    </li>
  );
}

function FieldsEditor({
  fields,
  onChange,
}: {
  fields: WebsiteFormField[];
  onChange: (fields: WebsiteFormField[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(fields, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              onChange={(next) => {
                const copy = [...fields];
                copy[index] = next;
                onChange(copy);
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function FormsEditor({
  slug,
  companyId,
  website,
  landingContent,
  servicePages,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tab, setTab] = useState<EditorTab>("fields");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [formSettings, setFormSettings] = useState<WebsiteContactFormSettings>(() =>
    getContactFormSettings({ website, landing: landingContent })
  );

  const activeArea = FORM_AREAS.find((area) => area.key === tab) ?? FORM_AREAS[0];
  const serviceNames = useMemo(
    () => servicePages.filter((p) => p.status === "published").map((p) => p.title),
    [servicePages]
  );
  const theme = website.theme_settings ?? {};
  const primary = typeof theme.primaryColor === "string" ? theme.primaryColor : "#5a8dee";

  function onSave() {
    setMessage(null);
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateWebsiteContactFormAction({
        companyId,
        companySlug: slug,
        formSettings,
      });
      if (result.ok) {
        setSaveStatus("saved");
        setMessage("Form settings saved.");
        router.refresh();
      } else {
        setSaveStatus("error");
        setMessage(result.error);
      }
    });
  }

  const saveLabel =
    saveStatus === "saving" || pending
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Save";

  const editorPanel = (
    <div className={cn(riseCardClassName, "relative flex min-h-0 min-w-0 flex-1 flex-col")}>
      <div className="relative z-20 shrink-0 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-800">{activeArea.label}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {tab === "fields"
            ? "Choose which fields appear, their labels, and whether they are required."
            : tab === "content"
              ? "Section heading, button label, and success message."
              : "Submissions are saved to your website enquiries inbox."}
        </p>
      </div>
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "fields" ? (
          <FieldsEditor
            fields={formSettings.fields}
            onChange={(fields) => setFormSettings((current) => ({ ...current, fields }))}
          />
        ) : null}

        {tab === "content" ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Section heading</span>
              <input
                className={inputClass}
                value={formSettings.sectionHeading}
                onChange={(e) =>
                  setFormSettings((current) => ({ ...current, sectionHeading: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Section description</span>
              <textarea
                rows={2}
                className={inputClass}
                value={formSettings.sectionDescription ?? ""}
                onChange={(e) =>
                  setFormSettings((current) => ({
                    ...current,
                    sectionDescription: e.target.value || null,
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Submit button label</span>
              <input
                className={inputClass}
                value={formSettings.submitLabel}
                onChange={(e) =>
                  setFormSettings((current) => ({ ...current, submitLabel: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Success heading</span>
              <input
                className={inputClass}
                value={formSettings.successHeading}
                onChange={(e) =>
                  setFormSettings((current) => ({ ...current, successHeading: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Success message</span>
              <textarea
                rows={2}
                className={inputClass}
                value={formSettings.successMessage}
                onChange={(e) =>
                  setFormSettings((current) => ({ ...current, successMessage: e.target.value }))
                }
              />
            </label>
          </div>
        ) : null}

        {tab === "inbox" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              When visitors submit the contact form on your public site, their message is saved as a
              website enquiry. You can review and mark messages read from your dashboard.
            </p>
            <ul className="list-inside list-disc text-sm text-slate-600">
              <li>Enquiries include name, contact details, service interest, and message.</li>
              <li>Notifications can be enabled on Pro plans.</li>
              <li>The form posts to your existing public enquiries API — no extra setup.</li>
            </ul>
            <Link
              href={companyWebsiteBuilderSectionPath(slug, "enquiries")}
              className="inline-flex rounded-md bg-[#5a8dee] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7de0]"
            >
              Open enquiries inbox
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );

  const previewPanel = (
    <div className={cn(riseCardClassName, "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Form preview</p>
        <button
          type="button"
          onClick={() => setPreviewOpen(false)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-6">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{formSettings.sectionHeading}</h2>
          {formSettings.sectionDescription ? (
            <p className="mt-2 text-sm text-slate-600">{formSettings.sectionDescription}</p>
          ) : null}
          <div className="mt-6">
            <PublicContactForm
              companySlug={slug}
              services={serviceNames}
              primaryColor={primary}
              formSettings={formSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const areasDock = (
    <aside className={cn(riseCardClassName, "flex w-[200px] shrink-0 flex-col overflow-hidden")}>
      <div className="border-b border-slate-100 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Forms</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Form settings">
        <ul className="space-y-1">
          {FORM_AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <li key={area.key}>
                <button
                  type="button"
                  onClick={() => setTab(area.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                    tab === area.key
                      ? "bg-[#eef2ff] font-medium text-[#4a6fd8]"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {area.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-xs text-slate-400">
          {previewOpen ? "Previewing contact form" : `Editing ${activeArea.label.toLowerCase()}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium",
              previewOpen
                ? "border-[#4a6fd8] bg-[#eef2ff] text-[#4a6fd8]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Eye className="h-4 w-4" />
            {previewOpen ? "Back to editor" : "Form preview"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-4 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {previewOpen ? (
          previewPanel
        ) : (
          <div className="flex min-h-0 flex-1 gap-2">
            {areasDock}
            {editorPanel}
          </div>
        )}
      </div>

      {message ? (
        <p className={cn("shrink-0 text-sm", saveStatus === "error" ? "text-red-600" : "text-slate-600")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
