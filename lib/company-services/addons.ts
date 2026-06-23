import { parsePriceToCents } from "@/lib/operations/metrics";
import type { ServiceAddon } from "@/types/booking-form";

export type AddonFormRow = {
  id: string;
  name: string;
  price: string;
};

export function addonsFromService(addons: unknown[] | null | undefined): AddonFormRow[] {
  if (!Array.isArray(addons)) return [];

  return addons
    .map((item) => {
      const row = item as Partial<ServiceAddon>;
      if (!row.name?.trim()) return null;
      return {
        id: row.id || crypto.randomUUID(),
        name: row.name.trim(),
        price: row.price_cents != null ? (row.price_cents / 100).toFixed(2) : "0",
      };
    })
    .filter((row): row is AddonFormRow => row != null);
}

export function parseAddonsForSave(rows: AddonFormRow[]): ServiceAddon[] {
  const addons: ServiceAddon[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;

    const priceCents = parsePriceToCents(row.price);
    if (priceCents == null) continue;

    addons.push({
      id: row.id || crypto.randomUUID(),
      name,
      price_cents: priceCents,
    });
  }

  return addons;
}

export function formatAddonsForCsv(addons: ServiceAddon[]): string {
  if (addons.length === 0) return "";
  return addons.map((addon) => `${addon.name}|${(addon.price_cents / 100).toFixed(2)}`).join(";");
}

export function parseAddonsFromCsv(value: string): ServiceAddon[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  return trimmed.split(";").flatMap((part) => {
    const [name, price] = part.split("|");
    const cleanName = name?.trim();
    if (!cleanName) return [];

    const priceCents = parsePriceToCents(price?.trim() ?? "0");
    if (priceCents == null) return [];

    return [
      {
        id: crypto.randomUUID(),
        name: cleanName,
        price_cents: priceCents,
      },
    ];
  });
}
