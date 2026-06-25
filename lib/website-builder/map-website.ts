import type { BuilderWebsite } from "@/types/website-builder";

export function mapWebsite(row: Record<string, unknown>): BuilderWebsite {
  const theme = row.theme_settings;
  const bookingLabel =
    theme && typeof theme === "object" && "bookingButtonLabel" in theme
      ? String((theme as Record<string, unknown>).bookingButtonLabel)
      : "Book Now";

  return {
    id: row.id as string,
    company_id: row.client_id as string,
    slug: (row.slug as string) ?? "",
    title: (row.title as string) ?? (row.name as string) ?? "",
    description: (row.description as string) ?? null,
    status: (row.status as BuilderWebsite["status"]) ?? "draft",
    builder_mode: Boolean(row.builder_mode),
    theme_settings: (theme as Record<string, unknown>) ?? {},
    seo_title: (row.seo_title as string) ?? null,
    seo_description: (row.seo_description as string) ?? null,
    seo_keywords: (row.seo_keywords as string) ?? null,
    og_title: (row.og_title as string) ?? null,
    og_description: (row.og_description as string) ?? null,
    og_image_url: (row.og_image_url as string) ?? (row.og_image as string) ?? null,
    booking_button_label: bookingLabel || "Book Now",
    published_at: (row.published_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? (row.created_at as string),
  };
}
