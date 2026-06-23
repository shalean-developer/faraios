import type { PaymentWithRelations } from "@/types/financial";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadPaymentsCsv(payments: PaymentWithRelations[], filename: string) {
  const headers = [
    "Date",
    "Customer",
    "Invoice",
    "Amount",
    "Provider",
    "Type",
    "Status",
    "Reference",
  ];

  const rows = payments.map((payment) => [
    payment.paid_at ?? payment.created_at,
    payment.customers?.name ?? "",
    payment.invoices?.invoice_number ?? "",
    (payment.amount_cents / 100).toFixed(2),
    payment.provider,
    payment.payment_type,
    payment.status,
    payment.provider_reference ?? "",
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
