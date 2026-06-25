import type { Metadata } from "next";

import { FaraiContactPage } from "@/components/marketing/farai-contact-page";

export const metadata: Metadata = {
  title: "Contact — FaraiOS",
  description:
    "Contact the FaraiOS team for onboarding help, pricing questions, and workspace support.",
};

export default function PlatformContactPage() {
  return <FaraiContactPage />;
}
