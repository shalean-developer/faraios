/** Curated spa stock images for luxury template fallbacks */
export const LUXURY_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540555700474-4be615f4946e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1596178065887-1191b8b93f48?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
] as const;

export const LUXURY_HERO_FALLBACK = LUXURY_FALLBACK_IMAGES[0];

export function luxuryFallbackImage(index = 0): string {
  return LUXURY_FALLBACK_IMAGES[index % LUXURY_FALLBACK_IMAGES.length];
}

export function resolveLuxuryImageUrl(src?: string | null, fallbackIndex = 0): string {
  const trimmed = src?.trim();
  if (!trimmed) return luxuryFallbackImage(fallbackIndex);
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return trimmed;
  } catch {
    /* invalid URL */
  }
  return luxuryFallbackImage(fallbackIndex);
}
