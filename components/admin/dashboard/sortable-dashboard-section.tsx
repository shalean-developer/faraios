"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Pin, PinOff } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { PlatformOverviewWidgetId } from "@/types/platform-dashboard";

export function SortableDashboardSection({
  id,
  title,
  description,
  pinned,
  hidden,
  isEditing,
  onTogglePin,
  onToggleHidden,
  children,
}: {
  id: PlatformOverviewWidgetId;
  title: string;
  description: string;
  pinned: boolean;
  hidden: boolean;
  isEditing: boolean;
  onTogglePin: (id: PlatformOverviewWidgetId) => void;
  onToggleHidden: (id: PlatformOverviewWidgetId) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditing,
  });

  if (hidden && !isEditing) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-2xl",
        isEditing && "border border-dashed border-indigo-200 bg-indigo-50/30 p-3",
        isDragging && "z-20 opacity-90 shadow-lg"
      )}
    >
      {isEditing ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2">
          <button
            type="button"
            className="cursor-grab rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 active:cursor-grabbing"
            aria-label={`Drag ${title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
          {pinned ? (
            <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Pinned
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onTogglePin(id)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            onClick={() => onToggleHidden(id)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {hidden ? "Show" : "Hide"}
          </button>
        </div>
      ) : null}
      <div className={cn(hidden && isEditing && "pointer-events-none opacity-40")}>{children}</div>
    </div>
  );
}
