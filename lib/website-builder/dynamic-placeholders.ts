import type { CompanyWithIndustry } from "@/types/database";

export const DYNAMIC_PLACEHOLDERS = [
  "business_name",
  "phone",
  "email",
  "website",
  "address",
  "city",
  "province",
  "country",
  "opening_hours",
  "primary_service",
  "booking_url",
] as const;

export type DynamicPlaceholderKey = (typeof DYNAMIC_PLACEHOLDERS)[number];

export type PlaceholderContext = {
  company: CompanyWithIndustry;
  companyId: string;
  primaryServiceName?: string | null;
};

function formatHours(hours: Record<string, unknown> | null | undefined): string {
  if (!hours) return "";
  try {
    return JSON.stringify(hours);
  } catch {
    return "";
  }
}

export function buildPlaceholderMap(ctx: PlaceholderContext): Record<DynamicPlaceholderKey, string> {
  const { company } = ctx;
  const location = company.contact_location ?? "";
  return {
    business_name: company.name ?? "",
    phone: company.contact_phone ?? "",
    email: company.primary_contact_email ?? "",
    website: company.production_url ?? "",
    address: location,
    city: location,
    province: "",
    country: "",
    opening_hours: formatHours(company.booking_hours),
    primary_service: ctx.primaryServiceName ?? "",
    booking_url: `/book/${ctx.companyId}`,
  };
}

/** Replace `{{key}}` tokens in text from business profile. */
export function resolveDynamicPlaceholders(text: string, ctx: PlaceholderContext): string {
  const map = buildPlaceholderMap(ctx);
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const normalized = key.toLowerCase() as DynamicPlaceholderKey;
    return map[normalized] ?? `{{${key}}}`;
  });
}

export function resolvePlaceholdersInObject<T extends Record<string, unknown>>(
  value: T,
  ctx: PlaceholderContext
): T {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      out[key] = resolveDynamicPlaceholders(entry, ctx);
    } else if (Array.isArray(entry)) {
      out[key] = entry.map((item) =>
        typeof item === "string"
          ? resolveDynamicPlaceholders(item, ctx)
          : item && typeof item === "object"
            ? resolvePlaceholdersInObject(item as Record<string, unknown>, ctx)
            : item
      );
    } else if (entry && typeof entry === "object") {
      out[key] = resolvePlaceholdersInObject(entry as Record<string, unknown>, ctx);
    } else {
      out[key] = entry;
    }
  }
  return out as T;
}
