"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, EyeOff, GripVertical } from "lucide-react";

import { catalogEntry } from "@/lib/website-builder/section-catalog";
import type { WebsiteSection } from "@/types/website-builder-sections";
import { cn } from "@/lib/utils";

export type SectionsListLayout = "vertical" | "horizontal";

type Props = {
  sections: WebsiteSection[];
  selectedId: string | null;
  layout?: SectionsListLayout;
  onSelect: (id: string) => void;
  onReorder: (sections: WebsiteSection[]) => void;
  onDuplicate: (id: string) => void;
  onToggleVisible: (id: string) => void;
};

function SortableSectionRow({
  section,
  selected,
  layout,
  onSelect,
  onDuplicate,
  onToggleVisible,
}: {
  section: WebsiteSection;
  selected: boolean;
  layout: SectionsListLayout;
  onSelect: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = section.label ?? catalogEntry(section.type).label;

  if (layout === "horizontal") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={cn("shrink-0", isDragging && "z-10 opacity-90")}
      >
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-full border pr-1",
            selected ? "border-[#4a6fd8] bg-[#eef2ff]" : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <button
            type="button"
            className="cursor-grab rounded-l-full p-1.5 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "max-w-[140px] truncate px-2 py-1.5 text-xs font-medium",
              selected ? "text-[#4a6fd8]" : "text-slate-700"
            )}
          >
            {!section.visible ? <EyeOff className="mr-1 inline h-3 w-3 text-slate-400" /> : null}
            {label}
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onToggleVisible}
            aria-label={section.visible ? "Hide section" : "Show section"}
          >
            {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("mb-1 rounded-md", isDragging && "z-10 opacity-90 shadow-md")}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1",
          selected ? "bg-[#eef2ff]" : "hover:bg-slate-50"
        )}
      >
        <button
          type="button"
          className="cursor-grab p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left text-sm"
        >
          {!section.visible ? <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
          <span className={cn("truncate", selected ? "text-[#4a6fd8]" : "text-slate-700")}>{label}</span>
        </button>
        <button type="button" className="p-1 text-slate-400 hover:text-slate-600" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="p-1 text-slate-400 hover:text-slate-600" onClick={onToggleVisible}>
          {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  );
}

export function SortableSectionList({
  sections,
  selectedId,
  layout = "vertical",
  onSelect,
  onReorder,
  onDuplicate,
  onToggleVisible,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sections, oldIndex, newIndex));
  }

  const strategy = layout === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={strategy}>
        <ul
          className={cn(
            layout === "horizontal"
              ? "flex flex-nowrap items-center gap-2"
              : undefined
          )}
        >
          {sections.map((section) => (
            <SortableSectionRow
              key={section.id}
              section={section}
              layout={layout}
              selected={selectedId === section.id}
              onSelect={() => onSelect(section.id)}
              onDuplicate={() => onDuplicate(section.id)}
              onToggleVisible={() => onToggleVisible(section.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
