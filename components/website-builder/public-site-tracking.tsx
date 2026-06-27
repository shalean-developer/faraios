"use client";

import { useEffect } from "react";

import { buildClickMetadata, findClickableElement } from "@/lib/website-builder/click-tracking";

type Props = {
  companyId: string;
  websiteId: string;
  preview?: boolean;
};

function sendTrackingEvent(payload: {
  businessId: string;
  websiteId: string;
  eventType: string;
  sourceUrl: string;
  referrer: string | null;
  metadata?: Record<string, unknown>;
}) {
  const body = JSON.stringify({
    businessId: payload.businessId,
    websiteId: payload.websiteId,
    eventType: payload.eventType,
    sourceUrl: payload.sourceUrl,
    referrer: payload.referrer,
    metadata: payload.metadata ?? {},
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/public/tracking", blob);
      return;
    }
  } catch {
    // fall through to fetch
  }

  fetch("/api/public/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function observeWebVitals(
  companyId: string,
  websiteId: string,
  sourceUrl: string
) {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  const report = (name: string, value: number) => {
    if (!Number.isFinite(value)) return;
    sendTrackingEvent({
      businessId: companyId,
      websiteId,
      eventType: "web_vital",
      sourceUrl,
      referrer: document.referrer || null,
      metadata: { name, value, path: window.location.pathname },
    });
  };

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
      if (last?.startTime != null) report("LCP", last.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // unsupported
  }

  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value?: number;
        hadRecentInput?: boolean;
      })[]) {
        if (!entry.hadRecentInput && typeof entry.value === "number") {
          clsValue += entry.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    window.addEventListener(
      "pagehide",
      () => {
        report("CLS", clsValue);
      },
      { once: true }
    );
  } catch {
    // unsupported
  }

  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries().find((item) => item.name === "first-contentful-paint");
      if (entry) report("FCP", entry.startTime);
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {
    // unsupported
  }

  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      report("TTFB", nav.responseStart);
    }
  } catch {
    // unsupported
  }

  try {
    let maxInteraction = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { duration?: number })[]) {
        if (typeof entry.duration === "number") {
          maxInteraction = Math.max(maxInteraction, entry.duration);
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true } as PerformanceObserverInit);
    window.addEventListener(
      "pagehide",
      () => {
        if (maxInteraction > 0) report("INP", maxInteraction);
      },
      { once: true }
    );
  } catch {
    // unsupported
  }
}

function observeClicks(companyId: string, websiteId: string) {
  const onClick = (event: MouseEvent) => {
    const element = findClickableElement(event.target);
    if (!element) return;

    const metadata = buildClickMetadata(element, window.location.pathname);
    sendTrackingEvent({
      businessId: companyId,
      websiteId,
      eventType: "click",
      sourceUrl: window.location.href,
      referrer: document.referrer || null,
      metadata,
    });
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}

export function PublicSiteTracking({ companyId, websiteId, preview = false }: Props) {
  useEffect(() => {
    if (preview) return;

    const sourceUrl = window.location.href;
    sendTrackingEvent({
      businessId: companyId,
      websiteId,
      eventType: "page_visit",
      sourceUrl,
      referrer: document.referrer || null,
    });

    observeWebVitals(companyId, websiteId, sourceUrl);
    return observeClicks(companyId, websiteId);
  }, [companyId, websiteId, preview]);

  return null;
}

export function trackPublicSiteConversion(input: {
  companyId: string;
  websiteId: string;
  eventType: "contact_submission" | "booking_submission" | "quote_request";
  metadata?: Record<string, unknown>;
}) {
  sendTrackingEvent({
    businessId: input.companyId,
    websiteId: input.websiteId,
    eventType: input.eventType,
    sourceUrl: window.location.href,
    referrer: document.referrer || null,
    metadata: input.metadata,
  });
}
