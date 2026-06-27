export type ClickElementType = "link" | "button";

export function findClickableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const clickable = target.closest(
    "a[href], button, [role='button'], input[type='submit'], input[type='button']"
  );
  if (!(clickable instanceof HTMLElement)) return null;

  if (clickable.closest("[data-no-track]")) return null;

  const tag = clickable.tagName.toLowerCase();
  if (tag === "input") {
    const type = (clickable as HTMLInputElement).type;
    if (type !== "submit" && type !== "button") return null;
  }

  return clickable;
}

export function buildClickMetadata(element: HTMLElement, path: string): {
  label: string;
  href: string | null;
  element: ClickElementType;
  path: string;
} {
  const tag = element.tagName.toLowerCase();
  const href = tag === "a" ? element.getAttribute("href") : null;
  const label =
    element.getAttribute("data-track-label")?.trim() ||
    element.getAttribute("aria-label")?.trim() ||
    element.textContent?.trim().replace(/\s+/g, " ") ||
    (tag === "input" ? (element as HTMLInputElement).value : "") ||
    tag;

  return {
    label: label.slice(0, 80) || "Click",
    href: href?.slice(0, 500) ?? null,
    element: tag === "a" ? "link" : "button",
    path,
  };
}

export function clickAnalyticsKey(metadata: {
  label: string;
  href: string | null;
  element: ClickElementType;
}): string {
  return `${metadata.element}:${metadata.label}:${metadata.href ?? ""}`;
}
