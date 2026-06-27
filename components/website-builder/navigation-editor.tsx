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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import { updateWebsiteNavigationAction } from "@/app/actions/website-builder";
import {
  PublicSite,
} from "@/components/website-builder/public-site";
import { createNavItem, getNavigationSettings } from "@/lib/website-builder/navigation";
import { cn } from "@/lib/utils";
import type { BuilderViewport } from "@/types/website-builder-sections";
import type {
  BuilderWebsite,
  LandingPageContent,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type {
  WebsiteNavItem,
  WebsiteNavLinkType,
  WebsiteNavigationSettings,
} from "@/types/website-builder-navigation";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

const LINK_TYPES: { value: WebsiteNavLinkType; label: string }[] = [
  { value: "home", label: "Home page" },
  { value: "anchor", label: "Page section" },
  { value: "page", label: "Service page" },
  { value: "contact", label: "Contact section" },
  { value: "booking", label: "Booking flow" },
  { value: "url", label: "Custom URL" },
];

const ANCHOR_OPTIONS = [
  { value: "top", label: "Top / Hero" },
  { value: "about", label: "About" },
  { value: "services", label: "Services" },
  { value: "contact", label: "Contact" },
  { value: "pricing", label: "Pricing" },
  { value: "faq", label: "FAQ" },
];

type Props = {
  slug: string;
  companyId: string;
  website: BuilderWebsite;
  companyName: string;
  landingContent: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
};

type EditorTab = "header" | "footer" | "mobile" | "topbar";

const NAV_AREAS: { key: EditorTab; label: string }[] = [
  { key: "header", label: "Header" },
  { key: "mobile", label: "Mobile menu" },
  { key: "footer", label: "Footer" },
  { key: "topbar", label: "Top bar" },
];

function SortableNavRow({
  item,
  depth,
  servicePages,
  onChange,
  onRemove,
  onAddChild,
}: {
  item: WebsiteNavItem;
  depth: number;
  servicePages: WebsiteServicePageRecord[];
  onChange: (item: WebsiteNavItem) => void;
  onRemove: () => void;
  onAddChild?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const sortable = useSortable({ id: item.id, disabled: depth > 0 });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = depth === 0 ? { transform: CSS.Transform.toString(transform), transition } : undefined;
  const hasChildren = depth === 0;

  return (
    <li ref={depth === 0 ? setNodeRef : undefined} style={style} className={cn(isDragging && "opacity-80")}>
      <div
        className={cn(
          "rounded-lg border border-slate-200 bg-white p-3",
          depth > 0 && "ml-6 border-l-2 border-l-violet-100"
        )}
      >
        <div className="flex items-start gap-2">
          {depth === 0 ? (
            <button
              type="button"
              className="mt-2 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : (
            <span className="mt-2 w-4" aria-hidden />
          )}
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="text-xs">
              <span className="font-medium text-slate-700">Label</span>
              <input
                className={inputClass}
                value={item.label}
                onChange={(e) => onChange({ ...item, label: e.target.value })}
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-slate-700">Link type</span>
              <select
                className={inputClass}
                value={item.linkType}
                onChange={(e) =>
                  onChange({
                    ...item,
                    linkType: e.target.value as WebsiteNavLinkType,
                  })
                }
              >
                {LINK_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {item.linkType === "anchor" ? (
              <label className="text-xs sm:col-span-2">
                <span className="font-medium text-slate-700">Section</span>
                <select
                  className={inputClass}
                  value={item.href ?? "top"}
                  onChange={(e) => onChange({ ...item, href: e.target.value })}
                >
                  {ANCHOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {item.linkType === "page" ? (
              <label className="text-xs sm:col-span-2">
                <span className="font-medium text-slate-700">Service page</span>
                <select
                  className={inputClass}
                  value={item.pageSlug ?? ""}
                  onChange={(e) => onChange({ ...item, pageSlug: e.target.value })}
                >
                  <option value="">Select page</option>
                  {servicePages.map((page) => (
                    <option key={page.id} value={page.slug}>
                      {page.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {item.linkType === "url" ? (
              <label className="text-xs sm:col-span-2">
                <span className="font-medium text-slate-700">URL</span>
                <input
                  className={inputClass}
                  value={item.href ?? ""}
                  onChange={(e) => onChange({ ...item, href: e.target.value })}
                  placeholder="https://"
                />
              </label>
            ) : null}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(e) => onChange({ ...item, visible: e.target.checked })}
                />
                Visible
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={item.desktopVisible}
                  onChange={(e) => onChange({ ...item, desktopVisible: e.target.checked })}
                />
                Desktop
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={item.mobileVisible}
                  onChange={(e) => onChange({ ...item, mobileVisible: e.target.checked })}
                />
                Mobile
              </label>
              {item.linkType === "url" ? (
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.openInNewTab ?? false}
                    onChange={(e) => onChange({ ...item, openInNewTab: e.target.checked })}
                  />
                  New tab
                </label>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {hasChildren && onAddChild ? (
              <button
                type="button"
                onClick={onAddChild}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Add dropdown item"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : null}
            {hasChildren && (item.children?.length ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Toggle dropdown items"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {hasChildren && expanded && item.children && item.children.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {item.children.map((child, childIndex) => (
              <SortableNavRow
                key={child.id}
                item={child}
                depth={depth + 1}
                servicePages={servicePages}
                onChange={(next) => {
                  const children = [...(item.children ?? [])];
                  children[childIndex] = next;
                  onChange({ ...item, children });
                }}
                onRemove={() => {
                  onChange({
                    ...item,
                    children: (item.children ?? []).filter((c) => c.id !== child.id),
                  });
                }}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function NavItemsEditor({
  items,
  servicePages,
  onChange,
}: {
  items: WebsiteNavItem[];
  servicePages: WebsiteServicePageRecord[];
  onChange: (items: WebsiteNavItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <SortableNavRow
                key={item.id}
                item={item}
                depth={0}
                servicePages={servicePages}
                onChange={(next) => {
                  const copy = [...items];
                  copy[index] = next;
                  onChange(copy);
                }}
                onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
                onAddChild={() => {
                  const copy = [...items];
                  const children = [...(copy[index].children ?? [])];
                  children.push(
                    createNavItem({ label: "Dropdown item", linkType: "anchor", href: "services" })
                  );
                  copy[index] = { ...copy[index], children };
                  onChange(copy);
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            createNavItem({ label: "New link", linkType: "anchor", href: "about" }),
          ])
        }
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        <Plus className="h-4 w-4" />
        Add menu item
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-100 px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
    </label>
  );
}

export function NavigationEditor({
  slug,
  companyId,
  website,
  companyName,
  landingContent,
  servicePages,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tab, setTab] = useState<EditorTab>("header");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewport, setViewport] = useState<BuilderViewport>("desktop");

  const [navigation, setNavigation] = useState<WebsiteNavigationSettings>(() =>
    getNavigationSettings({
      website,
      landing: landingContent,
      servicePages,
      companySlug: slug,
      companyName,
    })
  );

  const previewLanding = useMemo(() => landingContent, [landingContent]);
  const activeArea = NAV_AREAS.find((area) => area.key === tab) ?? NAV_AREAS[0];

  function onSave() {
    setMessage(null);
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateWebsiteNavigationAction({
        companyId,
        companySlug: slug,
        navigation,
      });
      if (result.ok) {
        setSaveStatus("saved");
        setMessage("Navigation saved.");
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

  const previewWebsite = useMemo(
    () => ({
      ...website,
      theme_settings: {
        ...website.theme_settings,
        navigationSettings: navigation,
      },
    }),
    [website, navigation]
  );

  const chromeViewport: "desktop" | "mobile" =
    viewport === "mobile" ? "mobile" : "desktop";

  const editorPanel = (
    <div className={cn(riseCardClassName, "relative flex min-h-0 min-w-0 flex-1 flex-col")}>
      <div className="relative z-20 shrink-0 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-800">{activeArea.label}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {tab === "header"
            ? "Logo, menu links, CTAs, and dropdowns."
            : tab === "mobile"
              ? "Mobile menu layout and visibility."
              : tab === "footer"
                ? "Footer content, links, and social profiles."
                : "Contact strip above the header."}
        </p>
      </div>
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto p-4">
        {renderTabContent({
          tab,
          navigation,
          setNavigation,
          companyName,
          servicePages,
        })}
      </div>
    </div>
  );

  const previewPanel = (
    <div className={cn(riseCardClassName, "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Navigation preview</p>
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
        {previewLanding ? (
          <PublicSite
            companySlug={slug}
            companyId={companyId}
            companyName={companyName}
            website={previewWebsite}
            landing={previewLanding}
            servicePages={servicePages.filter((p) => p.status === "published")}
            preview
            chromeViewport={chromeViewport}
            previewViewport={viewport}
          />
        ) : (
          <p className="p-6 text-sm text-slate-500">Create your website to preview navigation.</p>
        )}
      </div>
    </div>
  );

  const areasDock = (
    <aside className={cn(riseCardClassName, "flex w-[200px] shrink-0 flex-col overflow-hidden")}>
      <div className="border-b border-slate-100 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Navigation</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Navigation areas">
        <ul className="space-y-1">
          {NAV_AREAS.map((area) => (
            <li key={area.key}>
              <button
                type="button"
                onClick={() => setTab(area.key)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm",
                  tab === area.key
                    ? "bg-[#eef2ff] font-medium text-[#4a6fd8]"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {area.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-xs text-slate-400">
          {previewOpen ? "Previewing site navigation" : `Editing ${activeArea.label.toLowerCase()}`}
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
            {previewOpen ? "Back to editor" : "Page view"}
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

function renderTabContent({
  tab,
  navigation,
  setNavigation,
  companyName,
  servicePages,
}: {
  tab: EditorTab;
  navigation: WebsiteNavigationSettings;
  setNavigation: Dispatch<SetStateAction<WebsiteNavigationSettings>>;
  companyName: string;
  servicePages: WebsiteServicePageRecord[];
}) {
  if (tab === "header") {
    return (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="Show header"
            checked={navigation.header.enabled}
            onChange={(enabled) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, enabled } }))
            }
          />
          <ToggleRow
            label="Sticky header"
            checked={navigation.header.sticky}
            onChange={(sticky) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, sticky } }))
            }
          />
          <ToggleRow
            label="Show logo"
            checked={navigation.header.showLogo}
            onChange={(showLogo) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, showLogo } }))
            }
          />
          <ToggleRow
            label="Show business name"
            checked={navigation.header.showBusinessName}
            onChange={(showBusinessName) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, showBusinessName } }))
            }
          />
          <ToggleRow
            label="Show tagline"
            checked={navigation.header.showTagline}
            onChange={(showTagline) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, showTagline } }))
            }
          />
          <ToggleRow
            label="Show booking button"
            checked={navigation.header.showBookingButton}
            onChange={(showBookingButton) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, showBookingButton } }))
            }
          />
          <ToggleRow
            label="Secondary CTA"
            description="Outline button beside booking"
            checked={navigation.header.showSecondaryCta}
            onChange={(showSecondaryCta) =>
              setNavigation((n) => ({ ...n, header: { ...n.header, showSecondaryCta } }))
            }
          />
        </div>
        {navigation.header.showTagline ? (
          <label className="mt-4 block text-sm">
            <span className="font-medium text-slate-700">Header tagline</span>
            <input
              className={inputClass}
              value={navigation.header.tagline ?? ""}
              onChange={(e) =>
                setNavigation((n) => ({
                  ...n,
                  header: { ...n.header, tagline: e.target.value || null },
                }))
              }
            />
          </label>
        ) : null}
        {navigation.header.showSecondaryCta ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-slate-700">Secondary button label</span>
              <input
                className={inputClass}
                value={navigation.header.secondaryCta?.label ?? "Get a quote"}
                onChange={(e) =>
                  setNavigation((n) => ({
                    ...n,
                    header: {
                      ...n.header,
                      secondaryCta: {
                        label: e.target.value,
                        href: n.header.secondaryCta?.href ?? "#contact",
                        style: "outline",
                      },
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-slate-700">Secondary button URL</span>
              <input
                className={inputClass}
                value={navigation.header.secondaryCta?.href ?? "#contact"}
                onChange={(e) =>
                  setNavigation((n) => ({
                    ...n,
                    header: {
                      ...n.header,
                      secondaryCta: {
                        label: n.header.secondaryCta?.label ?? "Get a quote",
                        href: e.target.value,
                        style: "outline",
                      },
                    },
                  }))
                }
              />
            </label>
          </div>
        ) : null}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-800">Menu items</h3>
          <p className="mt-1 text-xs text-slate-500">
            Drag to reorder. Use + on a top-level item to add dropdown links.
          </p>
          <div className="mt-3">
            <NavItemsEditor
              items={navigation.header.items}
              servicePages={servicePages}
              onChange={(items) =>
                setNavigation((n) => ({ ...n, header: { ...n.header, items } }))
              }
            />
          </div>
        </div>
      </>
    );
  }

  if (tab === "mobile") {
    return (
      <>
        <ToggleRow
          label="Use same items as header"
          description="When off, configure a separate mobile menu below"
          checked={navigation.mobile.inheritHeaderItems}
          onChange={(inheritHeaderItems) =>
            setNavigation((n) => ({ ...n, mobile: { ...n.mobile, inheritHeaderItems } }))
          }
        />
        <ToggleRow
          label="Show booking button in mobile menu"
          checked={navigation.mobile.showBookingButton}
          onChange={(showBookingButton) =>
            setNavigation((n) => ({ ...n, mobile: { ...n.mobile, showBookingButton } }))
          }
        />
        <ToggleRow
          label="Show secondary CTA in mobile menu"
          checked={navigation.mobile.showSecondaryCta}
          onChange={(showSecondaryCta) =>
            setNavigation((n) => ({ ...n, mobile: { ...n.mobile, showSecondaryCta } }))
          }
        />
        {!navigation.mobile.inheritHeaderItems ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-800">Mobile-only menu items</h3>
            <div className="mt-3">
              <NavItemsEditor
                items={navigation.mobile.items}
                servicePages={servicePages}
                onChange={(items) =>
                  setNavigation((n) => ({ ...n, mobile: { ...n.mobile, items } }))
                }
              />
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (tab === "footer") {
    return (
      <>
        <ToggleRow
          label="Show footer"
          checked={navigation.footer.enabled}
          onChange={(enabled) =>
            setNavigation((n) => ({ ...n, footer: { ...n.footer, enabled } }))
          }
        />
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Layout</span>
          <select
            className={inputClass}
            value={navigation.footer.layout}
            onChange={(e) =>
              setNavigation((n) => ({
                ...n,
                footer: {
                  ...n.footer,
                  layout: e.target.value as "simple" | "columns",
                },
              }))
            }
          >
            <option value="simple">Simple (centered)</option>
            <option value="columns">Columns with links</option>
          </select>
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Business name</span>
          <input
            className={inputClass}
            value={navigation.footer.businessName ?? companyName}
            onChange={(e) =>
              setNavigation((n) => ({
                ...n,
                footer: { ...n.footer, businessName: e.target.value },
              }))
            }
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Tagline</span>
          <input
            className={inputClass}
            value={navigation.footer.tagline ?? ""}
            onChange={(e) =>
              setNavigation((n) => ({
                ...n,
                footer: { ...n.footer, tagline: e.target.value || null },
              }))
            }
          />
        </label>
        <ToggleRow
          label="Show Powered by FaraiOS"
          checked={navigation.footer.showPoweredBy}
          onChange={(showPoweredBy) =>
            setNavigation((n) => ({ ...n, footer: { ...n.footer, showPoweredBy } }))
          }
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["facebook", "instagram", "whatsapp"] as const).map((key) => (
            <label key={key} className="text-sm capitalize">
              <span className="font-medium text-slate-700">{key}</span>
              <input
                className={inputClass}
                value={navigation.footer.socialLinks?.[key] ?? ""}
                onChange={(e) =>
                  setNavigation((n) => ({
                    ...n,
                    footer: {
                      ...n.footer,
                      socialLinks: {
                        ...n.footer.socialLinks,
                        [key]: e.target.value || undefined,
                      },
                    },
                  }))
                }
                placeholder={key === "whatsapp" ? "27821234567" : "https://"}
              />
            </label>
          ))}
        </div>
        {navigation.footer.layout === "columns" ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-800">Footer link column</h3>
            <label className="mt-2 block text-sm">
              <span className="font-medium text-slate-700">Column title</span>
              <input
                className={inputClass}
                value={navigation.footer.columns[0]?.title ?? "Quick links"}
                onChange={(e) => {
                  const columns = [...navigation.footer.columns];
                  const first = columns[0] ?? {
                    id: crypto.randomUUID(),
                    title: "Quick links",
                    items: navigation.header.items,
                  };
                  columns[0] = { ...first, title: e.target.value };
                  setNavigation((n) => ({ ...n, footer: { ...n.footer, columns } }));
                }}
              />
            </label>
            <div className="mt-3">
              <NavItemsEditor
                items={navigation.footer.columns[0]?.items ?? navigation.header.items}
                servicePages={servicePages}
                onChange={(items) => {
                  const columns = [...navigation.footer.columns];
                  const first = columns[0] ?? {
                    id: crypto.randomUUID(),
                    title: "Quick links",
                    items,
                  };
                  columns[0] = { ...first, items };
                  setNavigation((n) => ({ ...n, footer: { ...n.footer, columns } }));
                }}
              />
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <ToggleRow
        label="Show top bar"
        description="Contact strip above the header"
        checked={navigation.topbar.enabled}
        onChange={(enabled) =>
          setNavigation((n) => ({ ...n, topbar: { ...n.topbar, enabled } }))
        }
      />
      {(
        [
          ["phone", "Phone"],
          ["email", "Email"],
          ["hours", "Hours"],
          ["location", "Service area"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <input
            className={inputClass}
            value={navigation.topbar[key] ?? ""}
            onChange={(e) =>
              setNavigation((n) => ({
                ...n,
                topbar: { ...n.topbar, [key]: e.target.value || null },
              }))
            }
          />
        </label>
      ))}
    </>
  );
}
