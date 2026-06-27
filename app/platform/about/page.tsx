import type { Metadata } from "next";

import { FaraiAboutPage } from "@/components/marketing/farai-about-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata: Metadata = platformPageMetadata({
  title: "About — FaraiOS",
  description:
    "FaraiOS is the business operating system for local service teams — bookings, customers, revenue, and growth in one workspace.",
  path: "/platform/about",
});

export default function PlatformAboutPage() {
  return <FaraiAboutPage />;
}
