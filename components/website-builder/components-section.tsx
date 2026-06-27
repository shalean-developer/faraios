"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteWebsiteComponentAction,
  saveWebsiteComponentAction,
  updateWebsiteComponentAction,
} from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import { SectionPropsEditor } from "@/components/website-builder/page-builder/section-props-editor";
import { canAccessWebsiteBuilderFeature } from "@/lib/website-builder/access";
import { getPageSections } from "@/lib/website-builder/page-sections";
import {
  defaultNameForComponentType,
  defaultPropsForComponentType,
  isSavableSectionType,
  propsFromSection,
  SAVED_COMPONENT_LABELS,
} from "@/lib/website-builder/saved-components";
import { cn } from "@/lib/utils";
import {
  SAVED_COMPONENT_TYPES,
  type SavedComponentType,
  type WebsiteComponentRecord,
} from "@/types/website-builder-components";
import type { WebsiteSection } from "@/types/website-builder-sections";
import type { BuilderWebsite, LandingPageContent } from "@/types/website-builder";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields;
  website: BuilderWebsite | null;
  landingContent: LandingPageContent | null;
  savedComponents?: WebsiteComponentRecord[];
};

type FilterType = "all" | SavedComponentType;

function componentToSection(component: WebsiteComponentRecord): WebsiteSection {
  return {
    id: component.id,
    type: component.component_type,
    label: component.name,
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: component.props,
  };
}

export function ComponentsSection({
  slug,
  companyId,
  company,
  website,
  landingContent,
  savedComponents = [],
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterType>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const components = savedComponents ?? [];

  const pageSections = useMemo(
    () => (landingContent ? getPageSections(landingContent) : []),
    [landingContent]
  );

  const savablePageSections = useMemo(
    () =>
      pageSections.filter((section): section is WebsiteSection & { type: SavedComponentType } =>
        isSavableSectionType(section.type)
      ),
    [pageSections]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return components;
    return components.filter((component) => component.component_type === filter);
  }, [filter, components]);

  const editing = components.find((component) => component.id === editingId) ?? null;
  const editingSection = editing ? componentToSection(editing) : null;
  const [editName, setEditName] = useState("");
  const [editProps, setEditProps] = useState<WebsiteSection["props"]>({});

  function openEditor(component: WebsiteComponentRecord) {
    setEditingId(component.id);
    setEditName(component.name);
    setEditProps(component.props);
    setMessage(null);
  }

  function closeEditor() {
    setEditingId(null);
    setMessage(null);
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.error ?? "Something went wrong.");
        return;
      }
      setMessage(successMessage);
      closeEditor();
      router.refresh();
    });
  }

  function onCreate(type: SavedComponentType) {
    const name = defaultNameForComponentType(type);
    runAction(
      () =>
        saveWebsiteComponentAction({
          companyId,
          companySlug: slug,
          name,
          componentType: type,
          props: defaultPropsForComponentType(type),
        }),
      "Component created."
    );
  }

  function onSaveFromSection(section: WebsiteSection) {
    if (!isSavableSectionType(section.type)) return;
    const props = propsFromSection(section);
    if (!props) return;
    const name = `${section.label ?? SAVED_COMPONENT_LABELS[section.type]} (saved)`;
    runAction(
      () =>
        saveWebsiteComponentAction({
          companyId,
          companySlug: slug,
          name,
          componentType: section.type,
          props,
        }),
      "Section saved as component."
    );
  }

  function onSaveEdit() {
    if (!editing) return;
    runAction(
      () =>
        updateWebsiteComponentAction({
          companyId,
          companySlug: slug,
          componentId: editing.id,
          name: editName,
          props: editProps as Record<string, unknown>,
        }),
      "Component updated."
    );
  }

  function onDelete(componentId: string) {
    if (!window.confirm("Delete this saved component?")) return;
    runAction(
      () =>
        deleteWebsiteComponentAction({
          companyId,
          companySlug: slug,
          componentId,
        }),
      "Component deleted."
    );
  }

  if (!canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilderPreview" />;
  }

  if (!website) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-600">Create your website first, then save reusable blocks here.</p>
      </section>
    );
  }

  if (!canAccessWebsiteBuilderFeature(company, "websiteBuilder")) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilder" />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Saved components</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reuse hero, footer, FAQ, and CTA blocks across pages from the Page Builder.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAVED_COMPONENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                disabled={pending}
                onClick={() => onCreate(type)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                {SAVED_COMPONENT_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {(["all", ...SAVED_COMPONENT_TYPES] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                filter === type
                  ? "bg-violet-100 text-violet-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {type === "all" ? "All" : SAVED_COMPONENT_LABELS[type]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Layers className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">No saved components yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create one from defaults or save a section from your home page below.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((component) => (
              <li
                key={component.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{component.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {SAVED_COMPONENT_LABELS[component.component_type]} · Updated{" "}
                    {new Date(component.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openEditor(component)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(component.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {savablePageSections.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Save from home page</h2>
            <p className="mt-1 text-sm text-slate-500">
              Turn a section on your landing page into a reusable component.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {savablePageSections.map((section) => (
              <li
                key={section.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {section.label ?? SAVED_COMPONENT_LABELS[section.type]}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{SAVED_COMPONENT_LABELS[section.type]}</p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onSaveFromSection(section)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  )}
                  Save as component
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {message ? (
        <p className={cn("text-sm", message.includes("wrong") || message.includes("required") ? "text-red-600" : "text-slate-600")}>
          {message}
        </p>
      ) : null}

      {editing && editingSection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Edit component</h3>
                <p className="text-xs text-slate-500">{SAVED_COMPONENT_LABELS[editing.component_type]}</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <label className="block text-sm">
                <span className="font-medium text-slate-900">Name</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <SectionPropsEditor
                section={{ ...editingSection, props: editProps }}
                websiteId={website.id}
                onChange={setEditProps}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onSaveEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
