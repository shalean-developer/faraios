"use client";

import { useEffect, useRef, useState } from "react";

import {
  isPathInCollapsibleSection,
  type CollapsibleNavKey,
} from "@/lib/constants/company-nav";

export function useCollapsibleNavSections(
  slug: string,
  pathname: string,
  activeNav: CollapsibleNavKey | string
) {
  const [expanded, setExpanded] = useState<Record<CollapsibleNavKey, boolean>>({
    bookings: activeNav === "bookings",
    customers: activeNav === "customers",
    revenue: activeNav === "revenue",
    websites: activeNav === "websites",
    growth: activeNav === "growth",
    team: activeNav === "team",
    intelligence: activeNav === "intelligence",
  });
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
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
      const wasInSection = isPathInCollapsibleSection(
        slug,
        previousPathnameRef.current,
        section
      );
      const isInSection = isPathInCollapsibleSection(slug, pathname, section);

      if (isInSection && !wasInSection) {
        updates[section] = true;
      } else if (!isInSection) {
        updates[section] = false;
      }
    }

    if (Object.keys(updates).length > 0) {
      setExpanded((current) => ({ ...current, ...updates }));
    }

    previousPathnameRef.current = pathname;
  }, [pathname, slug]);

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
