import type { Metadata } from "next";

import { PLATFORM_NOINDEX_METADATA } from "@/lib/seo/platform-metadata";

export const metadata: Metadata = PLATFORM_NOINDEX_METADATA;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
