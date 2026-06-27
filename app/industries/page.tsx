import type { Metadata } from "next";

import { FaraiIndustriesPage } from "@/components/marketing/farai-industries-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata: Metadata = platformPageMetadata({
  title: "Industries — FaraiOS",
  description:
    "FaraiOS supports cleaning, beauty, tourism, technology, trades, and more — industry presets for local service businesses.",
  path: "/industries",
});

export default function IndustriesPage() {
  return <FaraiIndustriesPage />;
}
