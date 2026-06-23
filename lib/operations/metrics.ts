export type OperationsMetrics = {
  totalBookings: number;
  pendingBookings: number;
  customers: number;
  revenueCents: number;
};

export type RecentActivityItem = {
  id: string;
  type: "booking";
  title: string;
  subtitle: string;
  status: string | null;
  createdAt: string;
};

export function formatRevenue(cents: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return 0;
  const num = Number.parseFloat(trimmed);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}
