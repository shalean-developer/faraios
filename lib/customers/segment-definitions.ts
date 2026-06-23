import type { CustomerSegment } from "@/types/v6-engine";

export type SegmentDefinition = {
  segmentType: CustomerSegment["segmentType"];
  name: string;
  description: string;
  criteria: Record<string, unknown>;
};

export const DEFAULT_CUSTOMER_SEGMENTS: SegmentDefinition[] = [
  {
    segmentType: "high_value",
    name: "High value customers",
    description: "Customers who have paid R5,000 or more in total.",
    criteria: { thresholdCents: 500_000 },
  },
  {
    segmentType: "repeat",
    name: "Repeat customers",
    description: "Customers with two or more bookings.",
    criteria: {},
  },
  {
    segmentType: "inactive",
    name: "Inactive customers",
    description: "Previously booked but no booking in the last 90 days.",
    criteria: { inactiveDays: 90 },
  },
  {
    segmentType: "new",
    name: "New customers",
    description: "Customer records created in the last 30 days.",
    criteria: { newDays: 30 },
  },
];
