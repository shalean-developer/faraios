import type { Metadata } from "next";

import { FaraiAboutPage } from "@/components/marketing/farai-about-page";

export const metadata: Metadata = {
  title: "About — Shalean",
  description:
    "Shalean is the business operating system for local service teams — bookings, customers, revenue, and growth in one workspace.",
};

export default function PlatformAboutPage() {
  return <FaraiAboutPage />;
}
