export function faraiosAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
}

export function bookingWidgetSnippet(origin: string, businessId: string): string {
  return `<script src="${origin}/embed/booking.js" data-business-id="${businessId}"></script>`;
}

export function trackingWidgetSnippet(origin: string, businessId: string): string {
  return `<script src="${origin}/tracking.js" data-business-id="${businessId}"></script>`;
}

export function hostedBookingPageUrl(
  origin: string,
  businessId: string,
  options?: { embed?: boolean }
): string {
  const url = `${origin}/book/${businessId}`;
  if (options?.embed) return `${url}?embed=1`;
  return url;
}

export function bookingIframeSnippet(origin: string, businessId: string): string {
  const src = hostedBookingPageUrl(origin, businessId, { embed: true });
  return `<iframe src="${src}" title="Book an appointment" style="width:100%;min-height:720px;border:0;border-radius:12px;" loading="lazy"></iframe>`;
}
