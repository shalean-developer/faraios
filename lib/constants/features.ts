import type { Feature } from "@/types/database";

/** App feature toggles (no `features` table in DB — labels for onboarding UI). */
export const APP_FEATURES: Feature[] = [
  { id: "booking", name: "Booking", slug: "booking", sort_order: 1 },
  { id: "payments", name: "Payments", slug: "payments", sort_order: 2 },
  { id: "blog", name: "Blog", slug: "blog", sort_order: 3 },
];
