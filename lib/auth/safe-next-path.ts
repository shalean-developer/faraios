export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/app";
  }
  return next;
}

export function authCallbackUrl(next: string): string {
  const safe = safeNextPath(next);
  return `/auth/callback?next=${encodeURIComponent(safe)}`;
}

export function authHref(
  path: "/auth/sign-in" | "/auth/sign-up",
  next?: string | null
): string {
  const safe = safeNextPath(next ?? null);
  if (safe === "/app") return path;
  return `${path}?next=${encodeURIComponent(safe)}`;
}
