"use client";

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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LayoutGrid, RotateCcw, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, useTransition } from "react";

import {
  resetPlatformOverviewDashboardLayoutAction,
  savePlatformOverviewDashboardLayoutAction,
} from "@/app/actions/platform-dashboard-layout";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { renderOverviewWidgetSection } from "@/components/admin/dashboard/overview-widget-sections";
import { SortableDashboardSection } from "@/components/admin/dashboard/sortable-dashboard-section";
import { ADMIN_SYSTEM_NAV } from "@/lib/constants/admin-nav";
import {
  getOverviewWidgetDefinition,
  resolveOverviewWidgetRenderOrder,
} from "@/lib/platform/overview-widget-registry";
import type { AdminPlatformOverviewMetrics } from "@/types/admin";
import {
  DEFAULT_PLATFORM_OVERVIEW_LAYOUT,
  type PlatformDashboardLayout,
  type PlatformOverviewWidgetId,
} from "@/types/platform-dashboard";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export function PlatformOverviewDashboard({
  metrics,
  initialLayout,
}: {
  metrics: AdminPlatformOverviewMetrics;
  initialLayout: PlatformDashboardLayout;
}) {
  const settingsHref =
    ADMIN_SYSTEM_NAV.find((item) => item.key === "settings")?.href ?? "/admin/settings";

  const [savedLayout, setSavedLayout] = useState(initialLayout);
  const [draftLayout, setDraftLayout] = useState(initialLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeLayout = isEditing ? draftLayout : savedLayout;

  const renderOrder = useMemo(() => {
    if (isEditing) {
      return activeLayout.order;
    }
    return resolveOverviewWidgetRenderOrder(activeLayout);
  }, [activeLayout, isEditing]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraftLayout((current) => {
      const order = [...current.order];
      const oldIndex = order.indexOf(active.id as PlatformOverviewWidgetId);
      const newIndex = order.indexOf(over.id as PlatformOverviewWidgetId);
      if (oldIndex === -1 || newIndex === -1) return current;
      return { ...current, order: arrayMove(order, oldIndex, newIndex) };
    });
  }

  function togglePin(widgetId: PlatformOverviewWidgetId) {
    setDraftLayout((current) => {
      const pinned = current.pinned.includes(widgetId)
        ? current.pinned.filter((id) => id !== widgetId)
        : [...current.pinned, widgetId];
      return { ...current, pinned };
    });
  }

  function toggleHidden(widgetId: PlatformOverviewWidgetId) {
    setDraftLayout((current) => {
      const hidden = current.hidden.includes(widgetId)
        ? current.hidden.filter((id) => id !== widgetId)
        : [...current.hidden, widgetId];
      return { ...current, hidden };
    });
  }

  function startEditing() {
    setDraftLayout(savedLayout);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftLayout(savedLayout);
    setError(null);
    setIsEditing(false);
  }

  function saveLayout() {
    startTransition(async () => {
      setError(null);
      const result = await savePlatformOverviewDashboardLayoutAction(draftLayout);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedLayout(draftLayout);
      setIsEditing(false);
    });
  }

  function resetLayout() {
    startTransition(async () => {
      setError(null);
      const result = await resetPlatformOverviewDashboardLayoutAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedLayout({ ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT });
      setDraftLayout({ ...DEFAULT_PLATFORM_OVERVIEW_LAYOUT });
      setIsEditing(false);
    });
  }

  return (
    <AdminPageShell
      title="Platform Overview"
      description="Platform growth, infrastructure health, revenue, and operations"
      actions={
        <>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={resetLayout}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={saveLayout}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Save layout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Customize
            </button>
          )}
          <AdminActivityBellLink />
        </>
      }
    >
      {isEditing ? (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Drag sections to reorder. Pin important widgets to keep them at the top. Hidden widgets
          stay off the dashboard until you show them again.
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={renderOrder} strategy={verticalListSortingStrategy}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-5"
          >
            {renderOrder.map((widgetId) => {
              const definition = getOverviewWidgetDefinition(widgetId);
              const pinned = activeLayout.pinned.includes(widgetId);
              const hidden = activeLayout.hidden.includes(widgetId);

              return (
                <motion.div key={widgetId} variants={fadeUp}>
                  <SortableDashboardSection
                    id={widgetId}
                    title={definition.title}
                    description={definition.description}
                    pinned={pinned}
                    hidden={hidden}
                    isEditing={isEditing}
                    onTogglePin={togglePin}
                    onToggleHidden={toggleHidden}
                  >
                    {renderOverviewWidgetSection(widgetId, metrics, settingsHref)}
                  </SortableDashboardSection>
                </motion.div>
              );
            })}
          </motion.div>
        </SortableContext>
      </DndContext>
    </AdminPageShell>
  );
}
