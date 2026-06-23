import type { Customer } from "@/types/database";

export type CustomerCsvRow = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const CSV_HEADERS = ["name", "email", "phone", "notes"] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function customersToCsv(customers: Customer[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const customer of customers) {
    lines.push(
      [
        escapeCsvField(customer.name),
        escapeCsvField(customer.email ?? ""),
        escapeCsvField(customer.phone ?? ""),
        escapeCsvField(customer.notes ?? ""),
      ].join(",")
    );
  }
  return lines.join("\r\n");
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

export function parseCustomerCsv(text: string): CustomerCsvRow[] {
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

  const emailIndex = headerIndex.get("email");
  const phoneIndex = headerIndex.get("phone");
  const notesIndex = headerIndex.get("notes");

  const rows: CustomerCsvRow[] = [];

  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line);
    const name = (fields[nameIndex] ?? "").trim();
    if (!name) continue;

    rows.push({
      name,
      email: emailIndex != null ? (fields[emailIndex] ?? "").trim() : "",
      phone: phoneIndex != null ? (fields[phoneIndex] ?? "").trim() : "",
      notes: notesIndex != null ? (fields[notesIndex] ?? "").trim() : "",
    });
  }

  return rows;
}

export function downloadCustomersCsv(customers: Customer[], filename = "customers.csv") {
  const blob = new Blob([customersToCsv(customers)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
