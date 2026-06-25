import type { Metadata } from "next";

import { FaraiFeaturesPage } from "@/components/marketing/farai-features-page";

export const metadata: Metadata = {
  title: "Features — Shalean",
  description:
    "Explore Shalean platform features: bookings, CRM, payments, websites, SEO, marketing, team tools, and more in one workspace.",
};

export default function FeaturesPage() {
  return <FaraiFeaturesPage />;
}
