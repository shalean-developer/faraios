"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Monitor,
  PanelTop,
  Redo2,
  Rows3,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  X,
} from "lucide-react";

import { updatePageSectionsAction, saveWebsiteComponentAction } from "@/app/actions/website-builder";
import { buildPlaceholderMap } from "@/lib/website-builder/dynamic-placeholders";
import { getPageSections } from "@/lib/website-builder/page-sections";
import { catalogEntry } from "@/lib/website-builder/section-catalog";
import { isSavableSectionType, propsFromSection } from "@/lib/website-builder/saved-components";
import type { WebsiteComponentRecord } from "@/types/website-builder-components";
import { builderAutosaveDelayMs, getBuilderSettings } from "@/lib/website-builder/settings";
import { useBuilderHistory } from "@/lib/website-builder/use-builder-history";
import { useIsBelowLg } from "@/lib/hooks/use-media-query";
import type { CompanyWithIndustry } from "@/types/database";
import type { BuilderWebsite, LandingPageContent, WebsiteServicePageRecord } from "@/types/website-builder";
import type { BuilderViewport, WebsiteSection } from "@/types/website-builder-sections";
import { cn } from "@/lib/utils";

import { WebsiteSectionRenderer } from "../sections/website-section-renderer";
import { SectionPropsEditor } from "./section-props-editor";
import { SectionsDock } from "./sections-dock";
import { DynamicPlaceholdersPopover } from "./dynamic-placeholders-popover";
import type { SectionsListLayout } from "./sortable-section-list";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";

type Props = {
  slug: string;
  companyId: string;
  company: CompanyWithIndustry;
  website: BuilderWebsite;
  landingContent: LandingPageContent;
  servicePages: WebsiteServicePageRecord[];
  savedComponents?: WebsiteComponentRecord[];
};

export function PageBuilderEditor({
  slug,
  companyId,
  company,
  website,
  landingContent,
  servicePages,
  savedComponents = [],
}: Props) {
  const router = useRouter();
  const autosaveDelayMs = builderAutosaveDelayMs(website);
  const defaultViewport = getBuilderSettings({
    website,
    bookingEnabled: website.booking_enabled,
  }).preferences.defaultPreviewViewport;
  const initialSections = useMemo(() => getPageSections(landingContent), [landingContent]);
  const {
    state: sections,
    setState: setSections,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBuilderHistory(initialSections);

  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);
  const [sectionsLayout, setSectionsLayout] = useState<SectionsListLayout>("vertical");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewport, setViewport] = useState<BuilderViewport>(defaultViewport);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const isBelowLg = useIsBelowLg();
  const dirtyRef = useRef(false);
  const skipAutosaveRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landingRef = useRef(landingContent);

  useEffect(() => {
    if (isBelowLg) {
      setSectionsLayout("horizontal");
    }
  }, [isBelowLg]);

  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const placeholderCtx = useMemo(
    () => ({
      company,
      companyId,
      primaryServiceName: servicePages[0]?.title ?? null,
    }),
    [company, companyId, servicePages]
  );

  const placeholders = buildPlaceholderMap(placeholderCtx);

  const persist = useCallback(
    (nextSections: WebsiteSection[], manual = false) => {
      setSaveStatus("saving");
      if (manual) setSaveMessage(null);
      startTransition(async () => {
        const result = await updatePageSectionsAction({
          companyId,
          companySlug: slug,
          sections: nextSections,
          landing: landingRef.current,
        });
        if (result.ok) {
          dirtyRef.current = false;
          setIsDirty(false);
          setSaveStatus("saved");
          if (manual) setSaveMessage("Page saved.");
          router.refresh();
        } else {
          setSaveStatus("error");
          setSaveMessage(result.error);
        }
      });
    },
    [companyId, slug, router]
  );

  useEffect(() => {
    landingRef.current = landingContent;
  }, [landingContent]);

  useEffect(() => {
    if (autosaveDelayMs <= 0) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    queueMicrotask(() => {
      setIsDirty(true);
      setSaveStatus("idle");
    });
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current) persist(sections);
    }, autosaveDelayMs);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [sections, persist, autosaveDelayMs]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (e.key === "s") {
        e.preventDefault();
        persist(sections, true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, persist, sections]);

  function updateSection(id: string, patch: Partial<WebsiteSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function duplicateSection(id: string) {
    const source = sections.find((s) => s.id === id);
    if (!source) return;
    const dup: WebsiteSection = {
      ...structuredClone(source),
      id: `sec_${Math.random().toString(36).slice(2, 11)}`,
      label: `${source.label ?? source.type} (copy)`,
    };
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const copy = [...prev];
      copy.splice(index + 1, 0, dup);
      return copy;
    });
    setSelectedId(dup.id);
  }

  function onManualSave() {
    persist(sections, true);
  }

  function handleAddSection(section: WebsiteSection) {
    setSections((prev) => [...prev, section]);
    setSelectedId(section.id);
  }

  function saveSelectedAsComponent() {
    if (!selected || !isSavableSectionType(selected.type)) return;
    const props = propsFromSection(selected);
    if (!props) return;
    const name = `${selected.label ?? catalogEntry(selected.type).label} (saved)`;
    setSaveMessage(null);
    startTransition(async () => {
      const result = await saveWebsiteComponentAction({
        companyId,
        companySlug: slug,
        name,
        componentType: selected.type,
        props,
      });
      if (result.ok) {
        setSaveMessage("Saved as reusable component.");
        router.refresh();
      } else {
        setSaveMessage(result.error);
        setSaveStatus("error");
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
        {selected ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-slate-800">
                {selected.label ?? catalogEntry(selected.type).label}
              </h3>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selected.mobileVisible}
                    onChange={(e) => updateSection(selected.id, { mobileVisible: e.target.checked })}
                  />
                  Mobile
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selected.desktopVisible}
                    onChange={(e) => updateSection(selected.id, { desktopVisible: e.target.checked })}
                  />
                  Desktop
                </label>
              </div>
            </div>
            <DynamicPlaceholdersPopover placeholders={placeholders} />
            {isSavableSectionType(selected.type) ? (
              <button
                type="button"
                disabled={pending}
                onClick={saveSelectedAsComponent}
                className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Save as component
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Select a section to edit.</p>
        )}
      </div>
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto p-4">
        {selected ? (
          <SectionPropsEditor
            section={selected}
            websiteId={website.id}
            companyId={companyId}
            onChange={(props) => updateSection(selected.id, { props })}
          />
        ) : null}
      </div>
    </div>
  );

  const previewPanel = previewOpen ? (
    <div className={cn(riseCardClassName, "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Page preview</p>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5">
            {(
              [
                { id: "desktop" as const, icon: Monitor },
                { id: "tablet" as const, icon: Tablet },
                { id: "mobile" as const, icon: Smartphone },
              ] as const
            ).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded text-slate-500",
                  viewport === id && "bg-[#eef2ff] text-[#4a6fd8]"
                )}
                aria-label={id}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
        <WebsiteSectionRenderer
          sections={sections}
          website={website}
          companySlug={slug}
          companyId={companyId}
          companyName={company.name}
          servicePages={servicePages}
          placeholderCtx={placeholderCtx}
          viewport={viewport}
          preview
        />
      </div>
    </div>
  ) : null;

  const builderWorkspace = !previewOpen ? (
    sectionsLayout === "horizontal" ? (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <SectionsDock
          sections={sections}
          selectedId={selectedId}
          layout="horizontal"
          onSelect={setSelectedId}
          onReorder={setSections}
          onDuplicate={duplicateSection}
          onToggleVisible={(id) => {
            const section = sections.find((s) => s.id === id);
            if (section) updateSection(id, { visible: !section.visible });
          }}
          onAddSection={handleAddSection}
          savedComponents={savedComponents}
        />
        {editorPanel}
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        <SectionsDock
          sections={sections}
          selectedId={selectedId}
          layout="vertical"
          onSelect={setSelectedId}
          onReorder={setSections}
          onDuplicate={duplicateSection}
          onToggleVisible={(id) => {
            const section = sections.find((s) => s.id === id);
            if (section) updateSection(id, { visible: !section.visible });
          }}
          onAddSection={handleAddSection}
          savedComponents={savedComponents}
        />
        {editorPanel}
      </div>
    )
  ) : null;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {!previewOpen ? (
            <>
              <div className="hidden items-center gap-1 rounded-lg border border-slate-200 p-0.5 lg:flex">
                <button
                  type="button"
                  onClick={() => setSectionsLayout("vertical")}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium",
                    sectionsLayout === "vertical" ? "bg-[#eef2ff] text-[#4a6fd8]" : "text-slate-500"
                  )}
                  title="Sections sidebar"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                  Side
                </button>
                <button
                  type="button"
                  onClick={() => setSectionsLayout("horizontal")}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium",
                    sectionsLayout === "horizontal" ? "bg-[#eef2ff] text-[#4a6fd8]" : "text-slate-500"
                  )}
                  title="Sections strip"
                >
                  <PanelTop className="h-3.5 w-3.5" />
                  Top
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={undo}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={redo}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
          <span className="text-xs text-slate-400">
            {saveStatus === "idle" && isDirty ? "Unsaved changes" : null}
            {saveStatus === "saved" ? "Autosaved" : null}
          </span>
        </div>
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
            {previewOpen ? "Back to editor" : "Page view"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onManualSave}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-4 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {previewOpen ? previewPanel : builderWorkspace}
      </div>

      {saveMessage ? (
        <p className={cn("shrink-0 text-sm", saveStatus === "error" ? "text-red-600" : "text-slate-600")}>
          {saveMessage}
        </p>
      ) : null}
    </div>
  );
}
