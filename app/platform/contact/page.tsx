import type { Metadata } from "next";

import { FaraiContactPage } from "@/components/marketing/farai-contact-page";

export const metadata: Metadata = {
  title: "Contact — Shalean",
  description:
    "Contact the Shalean team for onboarding help, pricing questions, and workspace support.",
};

export default function PlatformContactPage() {
  return <FaraiContactPage />;
}
