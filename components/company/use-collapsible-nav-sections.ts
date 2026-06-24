"use client";

import { useState } from "react";

import {
  isPathInCollapsibleSection,
  type CollapsibleNavKey,
} from "@/lib/constants/company-nav";

function initialExpanded(activeNav: CollapsibleNavKey | string): Record<CollapsibleNavKey, boolean> {
  return {
    bookings: activeNav === "bookings",
    customers: activeNav === "customers",
    revenue: activeNav === "revenue",
    websites: activeNav === "websites",
    growth: activeNav === "growth",
    team: activeNav === "team",
    intelligence: activeNav === "intelligence",
  };
}

function sectionUpdatesForPathChange(
  slug: string,
  previousPathname: string,
  pathname: string
): Partial<Record<CollapsibleNavKey, boolean>> | null {
  const sections: CollapsibleNavKey[] = [
    "bookings",
    "customers",
    "revenue",
    "websites",
    "growth",
    "team",
    "intelligence",
  ];
  const updates: Partial<Record<CollapsibleNavKey, boolean>> = {};

  for (const section of sections) {
    const wasInSection = isPathInCollapsibleSection(slug, previousPathname, section);
    const isInSection = isPathInCollapsibleSection(slug, pathname, section);

    if (isInSection && !wasInSection) {
      updates[section] = true;
    } else if (!isInSection) {
      updates[section] = false;
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

export function useCollapsibleNavSections(
  slug: string,
  pathname: string,
  activeNav: CollapsibleNavKey | string
) {
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [expanded, setExpanded] = useState<Record<CollapsibleNavKey, boolean>>(() =>
    initialExpanded(activeNav)
  );

  if (pathname !== prevPathname) {
    const updates = sectionUpdatesForPathChange(slug, prevPathname, pathname);
    setPrevPathname(pathname);
    if (updates) {
      setExpanded((current) => ({ ...current, ...updates }));
    }
  }

  const toggleSection = (section: CollapsibleNavKey) => {
    setExpanded((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const openSection = (section: CollapsibleNavKey) => {
    setExpanded((current) => ({
      ...current,
      [section]: true,
    }));
  };

  return { expanded, toggleSection, openSection };
}
