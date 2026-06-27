import type { Metadata } from "next";

import { FaraiContactPage } from "@/components/marketing/farai-contact-page";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata: Metadata = platformPageMetadata({
  title: "Contact — FaraiOS",
  description:
    "Contact the FaraiOS team for onboarding help, pricing questions, and workspace support.",
  path: "/platform/contact",
});

export default function PlatformContactPage() {
  return <FaraiContactPage />;
}
