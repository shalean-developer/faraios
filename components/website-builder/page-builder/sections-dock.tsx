"use client";

import { Plus } from "lucide-react";

import { WEBSITE_SECTION_CATALOG } from "@/lib/website-builder/section-catalog";
import { createSection } from "@/lib/website-builder/page-sections";
import { sectionFromSavedComponent } from "@/lib/website-builder/saved-components";
import type { WebsiteComponentRecord } from "@/types/website-builder-components";
import type { WebsiteSection } from "@/types/website-builder-sections";
import { cn } from "@/lib/utils";

import { SortableSectionList, type SectionsListLayout } from "./sortable-section-list";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";

type Props = {
  sections: WebsiteSection[];
  selectedId: string | null;
  layout: SectionsListLayout;
  onSelect: (id: string) => void;
  onReorder: (sections: WebsiteSection[]) => void;
  onDuplicate: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onAddSection: (section: WebsiteSection) => void;
  savedComponents?: WebsiteComponentRecord[];
};

function AddSectionMenu({
  onAdd,
  savedComponents = [],
}: {
  onAdd: (section: WebsiteSection) => void;
  savedComponents?: WebsiteComponentRecord[];
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-[#4a6fd8] hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <Plus className="h-4 w-4" />
        <span className="text-xs">Add</span>
      </summary>
      <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        {savedComponents.length > 0 ? (
          <>
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Saved
            </li>
            {savedComponents.map((component) => (
              <li key={component.id}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => onAdd(sectionFromSavedComponent(component))}
                >
                  {component.name}
                </button>
              </li>
            ))}
            <li className="my-1 border-t border-slate-100" />
          </>
        ) : null}
        <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          New section
        </li>
        {WEBSITE_SECTION_CATALOG.map((entry) => (
          <li key={entry.type}>
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => onAdd(createSection(entry.type))}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function SectionsDock({
  sections,
  selectedId,
  layout,
  onSelect,
  onReorder,
  onDuplicate,
  onToggleVisible,
  onAddSection,
  savedComponents = [],
}: Props) {
  if (layout === "horizontal") {
    return (
      <div className={cn(riseCardClassName, "shrink-0 px-3 py-2")}>
        <div className="flex items-center gap-3">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Sections
          </p>
          <div className="min-w-0 flex-1 overflow-x-auto pb-0.5">
            <SortableSectionList
              sections={sections}
              selectedId={selectedId}
              layout="horizontal"
              onSelect={onSelect}
              onReorder={onReorder}
              onDuplicate={onDuplicate}
              onToggleVisible={onToggleVisible}
            />
          </div>
          <div className="shrink-0">
            <AddSectionMenu onAdd={onAddSection} savedComponents={savedComponents} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className={cn(riseCardClassName, "flex w-[200px] shrink-0 flex-col overflow-hidden")}>
      <div className="border-b border-slate-100 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sections</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <SortableSectionList
          sections={sections}
          selectedId={selectedId}
          layout="vertical"
          onSelect={onSelect}
          onReorder={onReorder}
          onDuplicate={onDuplicate}
          onToggleVisible={onToggleVisible}
        />
      </div>
      <div className="border-t border-slate-100 p-2">
        <AddSectionMenu onAdd={onAddSection} savedComponents={savedComponents} />
      </div>
    </aside>
  );
}
