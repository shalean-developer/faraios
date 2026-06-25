import type { Metadata } from "next";

import { FaraiFeaturesPage } from "@/components/marketing/farai-features-page";

export const metadata: Metadata = {
  title: "Features — FaraiOS",
  description:
    "Explore FaraiOS platform features: bookings, CRM, payments, websites, SEO, marketing, team tools, and more in one workspace.",
};

export default function FeaturesPage() {
  return <FaraiFeaturesPage />;
}
