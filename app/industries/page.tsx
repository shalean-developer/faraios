import type { Metadata } from "next";

import { FaraiIndustriesPage } from "@/components/marketing/farai-industries-page";

export const metadata: Metadata = {
  title: "Industries — Shalean",
  description:
    "Shalean supports cleaning, beauty, tourism, technology, trades, and more — industry presets for local service businesses.",
};

export default function IndustriesPage() {
  return <FaraiIndustriesPage />;
}
