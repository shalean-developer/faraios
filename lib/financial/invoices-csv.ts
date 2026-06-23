import type { InvoiceWithCustomer } from "@/types/financial";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadInvoicesCsv(invoices: InvoiceWithCustomer[], filename: string) {
  const headers = [
    "Invoice",
    "Customer",
    "Email",
    "Status",
    "Total",
    "Paid",
    "Balance",
    "Due date",
    "Issued",
    "Created",
  ];

  const rows = invoices.map((invoice) => [
    invoice.invoice_number,
    invoice.customers?.name ?? "",
    invoice.customers?.email ?? "",
    invoice.status,
    (invoice.total_cents / 100).toFixed(2),
    (invoice.amount_paid_cents / 100).toFixed(2),
    (invoice.balance_due_cents / 100).toFixed(2),
    invoice.due_date ?? "",
    invoice.issued_at ? invoice.issued_at.slice(0, 10) : "",
    invoice.created_at.slice(0, 10),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
