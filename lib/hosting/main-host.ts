/** Edge-safe host helpers for middleware and tenant routing. */

export function getMainAppDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return "";
  try {
    return new URL(appUrl).host.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isMainHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  const appHost = getMainAppDomain();
  return (
    !normalized ||
    normalized.startsWith("localhost") ||
    normalized.startsWith("127.0.0.1") ||
    normalized.endsWith(".vercel.app") ||
    Boolean(appHost && normalized === appHost.split(":")[0])
  );
}

export function isDocumentNavigationRequest(request: {
  method: string;
  headers: { get(name: string): string | null };
}): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.get("RSC") === "1") return false;
  if (request.headers.get("Next-Router-Prefetch")) return false;
  if (request.headers.get("Next-Action")) return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}
