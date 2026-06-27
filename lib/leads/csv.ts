import type { Lead } from "@/types/growth-engine";

const CSV_HEADERS = [
  "name",
  "email",
  "phone",
  "status",
  "source",
  "lead_type",
  "message",
  "created_at",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function leadsToCsv(leads: Lead[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const lead of leads) {
    lines.push(
      [
        escapeCsvField(lead.name ?? ""),
        escapeCsvField(lead.email ?? ""),
        escapeCsvField(lead.phone ?? ""),
        escapeCsvField(lead.status),
        escapeCsvField(lead.source ?? ""),
        escapeCsvField(lead.lead_type),
        escapeCsvField(lead.message ?? ""),
        escapeCsvField(lead.created_at),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function downloadLeadsCsv(leads: Lead[], filename: string): void {
  const csv = leadsToCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
