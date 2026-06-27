import type { Metadata } from "next";

import { FaraiFeaturesPage } from "@/components/marketing/farai-features-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata: Metadata = platformPageMetadata({
  title: "Features — FaraiOS",
  description:
    "Explore FaraiOS platform features: bookings, CRM, payments, websites, SEO, marketing, team tools, and more in one workspace.",
  path: "/features",
});

export default function FeaturesPage() {
  return <FaraiFeaturesPage />;
}
