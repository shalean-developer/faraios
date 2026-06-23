import { formatAddonsForCsv, parseAddonsFromCsv } from "@/lib/company-services/addons";
import { formatPriceInput } from "@/lib/operations/metrics";
import type { ServiceAddon } from "@/types/booking-form";
import type { CompanyService } from "@/types/database";

export type ServiceCsvRow = {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: string;
  active: boolean;
  addons: ServiceAddon[];
};

const CSV_HEADERS = [
  "name",
  "category",
  "description",
  "price",
  "duration_minutes",
  "active",
  "addons",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseActive(value: string | undefined): boolean {
  const normalized = (value ?? "true").trim().toLowerCase();
  return !["false", "0", "no", "inactive"].includes(normalized);
}

export function servicesToCsv(services: CompanyService[]): string {
  const lines = [CSV_HEADERS.join(",")];

  for (const service of services) {
    const addons = (service.addons ?? []) as ServiceAddon[];
    lines.push(
      [
        escapeCsvField(service.name),
        escapeCsvField(service.category ?? ""),
        escapeCsvField(service.description ?? ""),
        escapeCsvField(formatPriceInput(service.base_price_cents)),
        escapeCsvField(String(service.duration_minutes ?? "")),
        escapeCsvField(service.active ? "true" : "false"),
        escapeCsvField(formatAddonsForCsv(addons)),
      ].join(",")
    );
  }

  return lines.join("\r\n");
}

export function parseServiceCsv(text: string): ServiceCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headerFields = parseCsvLine(lines[0]).map(normalizeHeader);
  const headerIndex = new Map(headerFields.map((field, index) => [field, index]));

  const nameIndex = headerIndex.get("name");
  if (nameIndex == null) {
    throw new Error('CSV must include a "name" column.');
  }

  const categoryIndex = headerIndex.get("category");
  const descriptionIndex = headerIndex.get("description");
  const priceIndex = headerIndex.get("price");
  const durationIndex = headerIndex.get("duration_minutes");
  const activeIndex = headerIndex.get("active");
  const addonsIndex = headerIndex.get("addons");

  const rows: ServiceCsvRow[] = [];

  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line);
    const name = (fields[nameIndex] ?? "").trim();
    if (!name) continue;

    rows.push({
      name,
      category: categoryIndex != null ? (fields[categoryIndex] ?? "").trim() : "",
      description:
        descriptionIndex != null ? (fields[descriptionIndex] ?? "").trim() : "",
      price: priceIndex != null ? (fields[priceIndex] ?? "0").trim() : "0",
      durationMinutes:
        durationIndex != null ? (fields[durationIndex] ?? "").trim() : "",
      active: parseActive(activeIndex != null ? fields[activeIndex] : "true"),
      addons: parseAddonsFromCsv(addonsIndex != null ? (fields[addonsIndex] ?? "") : ""),
    });
  }

  return rows;
}

export function downloadServicesCsv(services: CompanyService[], filename = "services.csv") {
  const blob = new Blob([servicesToCsv(services)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
